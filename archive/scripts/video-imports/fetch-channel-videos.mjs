/**
 * fetch-channel-videos.mjs
 *
 * Fetches all videos from the DeltaBolic and SHG Gym YouTube channels,
 * auto-maps exercises by title keyword scoring, and optionally writes
 * the results to workouts.json and Firestore.
 *
 * Usage:
 *   node scripts/fetch-channel-videos.mjs             # dry run, use cached JSON
 *   node scripts/fetch-channel-videos.mjs --fetch      # re-fetch from YouTube API
 *   node scripts/fetch-channel-videos.mjs --write      # write to workouts.json + Firestore
 *   node scripts/fetch-channel-videos.mjs --fetch --write
 *   node scripts/fetch-channel-videos.mjs --gym=acme   # target a different gym (default: shg)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const writeMode = process.argv.includes("--write");
const fetchMode = process.argv.includes("--fetch");
const gymId = process.argv.find((a) => a.startsWith("--gym="))?.split("=")[1] ?? "shg";

// ─── env ─────────────────────────────────────────────────────────────────────
try {
  const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k && !(k in process.env)) process.env[k] = v;
  }
} catch { /* optional */ }

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ─── channel config ───────────────────────────────────────────────────────────
const CHANNELS = {
  deltabolic: {
    name: "DeltaBolic",
    channelId: "UCerweoBkwQOb_zwx3NfUD1g",
    uploadsPlaylist: "UUerweoBkwQOb_zwx3NfUD1g",
    field: "video_url",
    firestoreField: "videoUrl",
    firestoreSourceField: "videoSource",
    cacheFile: resolve(__dirname, "channel-videos-deltabolic.json"),
  },
  tylerpath: {
    name: "TylerPath",
    channelId: "UCKNGg6mwG-m62N9A-5ee1mA",
    uploadsPlaylist: "UUKNGg6mwG-m62N9A-5ee1mA",
    // TylerPath fills video_url (tutorial) — same field as DeltaBolic, used as fallback
    field: "video_url",
    firestoreField: "videoUrl",
    firestoreSourceField: "videoSource",
    cacheFile: resolve(__dirname, "channel-videos-tylerpath.json"),
  },
  shg: {
    name: "SHG Gym",
    channelId: "UCtpxVpL7Yx9ElgNrx29HN_g",
    uploadsPlaylist: "UUtpxVpL7Yx9ElgNrx29HN_g",
    field: "gym_video_url",
    firestoreField: "gymVideoUrl",
    firestoreSourceField: "gymVideoSource",
    cacheFile: resolve(__dirname, "channel-videos-shg.json"),
  },
};

// ─── YouTube fetch ────────────────────────────────────────────────────────────
async function fetchAllPlaylistVideos(playlistId, label) {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY not set");
  const videos = [];
  let pageToken = "";
  let page = 0;

  console.log(`  Fetching ${label} playlist...`);
  do {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems` +
      `?part=snippet&maxResults=50&playlistId=${playlistId}` +
      (pageToken ? `&pageToken=${pageToken}` : "") +
      `&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    for (const item of data.items ?? []) {
      const id = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title;
      if (id && title && title !== "Private video" && title !== "Deleted video") {
        videos.push({ id, title });
      }
    }
    pageToken = data.nextPageToken ?? "";
    page++;
    console.log(`    page ${page}: ${videos.length} videos so far`);
  } while (pageToken);

  return videos;
}

// ─── load videos ─────────────────────────────────────────────────────────────
async function loadVideos(channel) {
  if (fetchMode) {
    console.log(`Fetching ${channel.name} channel videos from YouTube API...`);
    const videos = await fetchAllPlaylistVideos(channel.uploadsPlaylist, channel.name);
    writeFileSync(channel.cacheFile, JSON.stringify(videos, null, 2));
    console.log(`  Saved ${videos.length} videos to ${channel.cacheFile}`);
    return videos;
  }
  try {
    const videos = JSON.parse(readFileSync(channel.cacheFile, "utf-8"));
    console.log(`Using cached ${channel.name} videos: ${videos.length} entries`);
    return videos;
  } catch {
    throw new Error(
      `No cached videos for ${channel.name}. Run with --fetch to download them.`
    );
  }
}

// ─── keyword scoring ──────────────────────────────────────────────────────────
function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    // basic plural / verb normalisation: strip trailing 's' on words > 3 chars
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for",
  "with", "by", "is", "are", "do", "does", "try", "these", "you", "your",
  "this", "that", "it", "its", "my", "we", "our", "i", "fix", "need",
  "mistakes", "variations", "exercise", "exercises", "workout", "training",
  "how", "tutorial", "form", "tips", "guide", "right", "wrong", "correct",
  "vs", "best", "gym", "like", "shg"
]);

function keywords(str) {
  return tokenize(str).filter((t) => !STOP_WORDS.has(t) && t.length > 1);
}

function scoreMatch(exerciseName, videoTitle) {
  const exKw = keywords(exerciseName);
  const vidKw = keywords(videoTitle);
  const vidKwSet = new Set(vidKw);
  const vidTitle = videoTitle.toLowerCase();

  let score = 0;

  // Exact phrase match (highest weight)
  if (vidTitle.includes(exerciseName.toLowerCase())) score += 50;

  // Individual keyword matches
  let exactHits = 0;
  for (const kw of exKw) {
    if (vidKwSet.has(kw)) { score += 10; exactHits++; }
    // Partial match
    else if (vidKw.some((v) => v.includes(kw) || kw.includes(v))) score += 4;
  }

  // Bonus when video covers ≥ 2/3 of the exercise's keywords exactly
  if (exKw.length >= 2 && exactHits >= 2) score += 5;

  // Penalize if video has too many unrelated keywords
  const exKwSet = new Set(exKw);
  const unrelated = vidKw.filter((v) => !exKwSet.has(v)).length;
  score -= Math.max(0, unrelated - 3) * 1;

  return score;
}

function bestMatch(exerciseName, videos, minScore = 8) {
  let best = null;
  let bestScore = minScore - 1;
  for (const v of videos) {
    const s = scoreMatch(exerciseName, v.title);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best ? { ...best, score: bestScore } : null;
}

// ─── Firebase init ────────────────────────────────────────────────────────────
function initFirebase() {
  if (!writeMode) return null;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "fitsplit-29215";
  let credential;
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credsPath) {
    const sa = JSON.parse(readFileSync(credsPath, "utf-8"));
    credential = cert({
      projectId: sa.project_id ?? projectId,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    });
  } else {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!clientEmail || !privateKey) {
      console.error("Missing Firebase credentials — cannot write.");
      process.exit(1);
    }
    credential = cert({ projectId, clientEmail, privateKey });
  }
  if (!getApps().length) initializeApp({ credential });
  return getFirestore();
}

// ─── main ─────────────────────────────────────────────────────────────────────
console.log(`Mode: ${fetchMode ? "fetch+map" : "map from cache"} | write: ${writeMode} | gym: ${gymId}`);

// Load workouts.json
const workoutsPath = resolve(__dirname, "../lib/workouts.json");
const workoutsData = JSON.parse(readFileSync(workoutsPath, "utf-8"));

// Flatten exercises
const allExercises = [];
for (const [group, list] of Object.entries(workoutsData.exercise_catalog)) {
  for (const ex of list) allExercises.push({ ex, group });
}

console.log(`Loaded ${allExercises.length} exercises from workouts.json`);

// Load videos for all channels
const deltabolicVideos = await loadVideos(CHANNELS.deltabolic);
const tylerpathVideos = await loadVideos(CHANNELS.tylerpath);
const shgVideos = await loadVideos(CHANNELS.shg);

// Threshold: only auto-assign when score is confident enough
const DB_MIN_SCORE = 30;  // higher bar — DeltaBolic titles are noisy
const TP_MIN_SCORE = 20;
const SHG_MIN_SCORE = 14;

// Manual overrides for exercises where auto-scoring picks the wrong video.
// Keyed by exercise name, value = { channel, videoId, title } where channel
// must match a key in CHANNELS.
const MANUAL_OVERRIDES = {
  // "Reverse Barbell Curl" auto-matcher picks generic barbell curl videos;
  // force the correct reverse-curl tutorial.
  "Reverse Barbell Curl": {
    channel: "tylerpath",
    videoId: "GrRJsPsUswM",
    title: "Best Way to do Reverse Curls for Forearms Growth",
  },
  // TylerPath has no true "high cable bicep curl" short; use the closest
  // available faceaway cable curl video.
  "High Cable Curls": {
    channel: "tylerpath",
    videoId: "BW03-MxiNPg",
    title: "The Upgraded Way to do Faceaway Cable Curls",
  },
};

// ─── build mappings ───────────────────────────────────────────────────────────
// Rule: only fill BLANK fields. Never overwrite existing curated URLs.
// Tutorial priority: DeltaBolic → TylerPath (fallback for exercises DB doesn't cover)
console.log("\n── DeltaBolic mapping (only filling blanks) ─────────────────────");
const deltabolicMapping = new Map(); // exerciseName → videoId
for (const { ex } of allExercises) {
  if (ex.video_url) {
    console.log(`  · ${ex.name.padEnd(36)} already set (${ex.video_url.split("/").pop()})`);
    continue;
  }
  const match = bestMatch(ex.name, deltabolicVideos, DB_MIN_SCORE);
  if (match) {
    deltabolicMapping.set(ex.name, match.id);
    console.log(`  → ${ex.name.padEnd(36)} ${match.id}  (score ${match.score}) "${match.title}"`);
  } else {
    console.log(`  ✗ ${ex.name.padEnd(36)} not on DeltaBolic — will try TylerPath`);
  }
}

console.log("\n── TylerPath mapping (fallback for DeltaBolic misses) ───────────");
const tylerpathMapping = new Map(); // exerciseName → videoId (only exercises still blank after DB)
for (const { ex } of allExercises) {
  // Skip if already set or DeltaBolic found a match
  if (ex.video_url || deltabolicMapping.has(ex.name)) {
    if (!ex.video_url && deltabolicMapping.has(ex.name)) {
      console.log(`  · ${ex.name.padEnd(36)} covered by DeltaBolic`);
    }
    continue;
  }
  // Check manual overrides first
  const override = MANUAL_OVERRIDES[ex.name];
  if (override?.channel === "tylerpath") {
    tylerpathMapping.set(ex.name, override.videoId);
    console.log(`  ✎ ${ex.name.padEnd(36)} ${override.videoId}  (manual override) "${override.title}"`);
    continue;
  }
  const match = bestMatch(ex.name, tylerpathVideos, TP_MIN_SCORE);
  if (match) {
    tylerpathMapping.set(ex.name, match.id);
    console.log(`  → ${ex.name.padEnd(36)} ${match.id}  (score ${match.score}) "${match.title}"`);
  } else {
    console.log(`  ✗ ${ex.name.padEnd(36)} not found on TylerPath either`);
  }
}

console.log("\n── SHG Gym mapping (only filling blanks) ────────────────────────");
const shgMapping = new Map(); // exerciseName → videoId (only blank exercises)
for (const { ex } of allExercises) {
  if (ex.gym_video_url) {
    console.log(`  · ${ex.name.padEnd(36)} already set (${ex.gym_video_url.split("/").pop()})`);
    continue;
  }
  const match = bestMatch(ex.name, shgVideos, SHG_MIN_SCORE);
  if (match) {
    shgMapping.set(ex.name, match.id);
    console.log(
      `  → ${ex.name.padEnd(36)} ${match.id}  (score ${match.score}) "${match.title}"`
    );
  } else {
    console.log(`  ✗ ${ex.name.padEnd(36)} no confident match`);
  }
}

// ─── apply to workouts.json ───────────────────────────────────────────────────
if (writeMode) {
  let changed = 0;
  for (const { ex } of allExercises) {
    // DeltaBolic — only fill blank video_url
    if (!ex.video_url && deltabolicMapping.has(ex.name)) {
      const id = deltabolicMapping.get(ex.name);
      if (id) { ex.video_url = `https://www.youtube.com/shorts/${id}`; changed++; }
    }
    // TylerPath — fallback for video_url when DeltaBolic had no match
    if (!ex.video_url && tylerpathMapping.has(ex.name)) {
      const id = tylerpathMapping.get(ex.name);
      if (id) { ex.video_url = `https://www.youtube.com/shorts/${id}`; changed++; }
    }
    // SHG — only fill blank gym_video_url
    if (!ex.gym_video_url && shgMapping.has(ex.name)) {
      const id = shgMapping.get(ex.name);
      if (id) { ex.gym_video_url = `https://www.youtube.com/shorts/${id}`; changed++; }
    }
  }
  writeFileSync(workoutsPath, JSON.stringify(workoutsData, null, 2));
  console.log(`\nworkouts.json: ${changed} field(s) updated`);
}

// ─── apply to Firestore ───────────────────────────────────────────────────────
const db = initFirebase();
if (db) {
  const now = new Date().toISOString();

  // Helper to patch a snapshot
  async function patchCollection(collPath, channel, mapping) {
    const snap = await db.collection(collPath).get();
    const changes = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      if (!mapping.has(data.name)) continue;
      const id = mapping.get(data.name);
      const newUrl = id ? `https://www.youtube.com/shorts/${id}` : "";
      const cur = data[channel.firestoreField] ?? "";
      // Only fill blank fields — never overwrite curated values
      const shouldUpdate = newUrl && !cur;
      if (!shouldUpdate) continue;
      changes.push({
        ref: doc.ref,
        name: data.name,
        patch: {
          [channel.firestoreField]: newUrl,
          [channel.firestoreSourceField]: newUrl ? "youtube" : "none",
          updatedAt: now,
        },
      });
    }

    for (let i = 0; i < changes.length; i += 450) {
      const batch = db.batch();
      changes.slice(i, i + 450).forEach((c) =>
        batch.set(c.ref, c.patch, { merge: true })
      );
      await batch.commit();
    }

    changes.forEach((c) => console.log(`  [updated] ${collPath}: ${c.name}`));
    return changes.length;
  }

  console.log("\nWriting to Firestore...");

  // Root catalog
  const rootDb = await patchCollection("exerciseCatalog", CHANNELS.deltabolic, deltabolicMapping);
  const rootTp = await patchCollection("exerciseCatalog", CHANNELS.tylerpath, tylerpathMapping);
  const rootShg = await patchCollection("exerciseCatalog", CHANNELS.shg, shgMapping);

  // Gym-scoped catalog
  const gymDb = await patchCollection(`gyms/${gymId}/exerciseCatalog`, CHANNELS.deltabolic, deltabolicMapping);
  const gymTp = await patchCollection(`gyms/${gymId}/exerciseCatalog`, CHANNELS.tylerpath, tylerpathMapping);
  const gymShg = await patchCollection(`gyms/${gymId}/exerciseCatalog`, CHANNELS.shg, shgMapping);

  console.log(
    `\nFirestore done: root DeltaBolic=${rootDb}, root TylerPath=${rootTp}, root SHG=${rootShg}, gym DeltaBolic=${gymDb}, gym TylerPath=${gymTp}, gym SHG=${gymShg}`
  );
}

if (!writeMode) {
  console.log(
    "\nDry run complete. Re-run with --write to apply changes to workouts.json and Firestore."
  );
  if (!fetchMode) {
    console.log("Add --fetch to re-download all channel videos from YouTube API.");
  }
}
