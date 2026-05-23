/**
 * fix-gym-scoped-video-urls.mjs
 *
 * Finds gym-scoped exercises where videoUrl === gymVideoUrl (the legacy bug where
 * both fields were set to the same SHG short link), then:
 *   1. Keeps gymVideoUrl as-is (it's the SHG demo video — correct)
 *   2. Tries to auto-map videoUrl to the matching DeltaBolic or TylerPath tutorial
 *   3. If no confident match, clears videoUrl so no broken button appears
 *
 * Usage:
 *   node scripts/fix-gym-scoped-video-urls.mjs             # dry run
 *   node scripts/fix-gym-scoped-video-urls.mjs --write      # apply to Firestore
 *   node scripts/fix-gym-scoped-video-urls.mjs --gym=acme   # different gym
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const writeMode = process.argv.includes("--write");
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

// ─── Firebase ────────────────────────────────────────────────────────────────
const projectId = process.env.FIREBASE_PROJECT_ID ?? "fitsplit-29215";
let credential;
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credsPath) {
  const sa = JSON.parse(readFileSync(credsPath, "utf-8"));
  credential = cert({ projectId: sa.project_id ?? projectId, clientEmail: sa.client_email, privateKey: sa.private_key });
} else {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) { console.error("Missing Firebase credentials."); process.exit(1); }
  credential = cert({ projectId, clientEmail, privateKey });
}
if (!getApps().length) initializeApp({ credential });
const db = getFirestore();

// ─── load channel caches ─────────────────────────────────────────────────────
const deltabolicVideos = JSON.parse(readFileSync(resolve(__dirname, "channel-videos-deltabolic.json"), "utf-8"));
const tylerpathVideos = JSON.parse(readFileSync(resolve(__dirname, "channel-videos-tylerpath.json"), "utf-8"));

console.log(`Loaded ${deltabolicVideos.length} DeltaBolic + ${tylerpathVideos.length} TylerPath videos`);

// ─── scoring ──────────────────────────────────────────────────────────────────
const STOP = new Set([
  "a","an","the","and","or","of","in","on","at","to","for","with","by","is",
  "are","do","does","try","these","you","your","this","that","it","its","my",
  "we","our","i","fix","need","mistakes","variations","exercise","exercises",
  "workout","training","how","tutorial","form","tips","guide","right","wrong",
  "correct","vs","best","gym","like","shg","warm","up","warmup","level","sets",
  "reps","light","weight","free","body","bodyweight"
]);

function tokenize(str) {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean)
    .map(t => t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
}
function keywords(str) { return tokenize(str).filter(t => !STOP.has(t) && t.length > 1); }

function scoreMatch(exName, title) {
  const exKw = keywords(exName), vidKw = keywords(title), vset = new Set(vidKw);
  let s = 0, hits = 0;
  if (title.toLowerCase().includes(exName.toLowerCase())) s += 50;
  for (const k of exKw) {
    if (vset.has(k)) { s += 10; hits++; }
    else if (vidKw.some(v => v.includes(k) || k.includes(v))) s += 4;
  }
  if (exKw.length >= 2 && hits >= 2) s += 5;
  const exSet = new Set(exKw);
  const unrel = vidKw.filter(v => !exSet.has(v)).length;
  s -= Math.max(0, unrel - 3);
  return s;
}

function bestMatch(exName, videos, minScore) {
  let best = null, bestScore = minScore - 1;
  for (const v of videos) {
    const s = scoreMatch(exName, v.title);
    if (s > bestScore) { bestScore = s; best = v; }
  }
  return best ? { ...best, score: bestScore } : null;
}

// ─── extract video ID from any YouTube URL ─────────────────────────────────
function extractVideoId(url) {
  if (!url) return null;
  const m =
    url.match(/youtu\.be\/([^?&/]+)/) ||
    url.match(/youtube\.com\/shorts\/([^?&/]+)/) ||
    url.match(/[?&]v=([^&]+)/);
  return m?.[1] ?? null;
}

function makeShortUrl(id) {
  return id ? `https://www.youtube.com/shorts/${id}` : "";
}

// ─── scan Firestore ──────────────────────────────────────────────────────────
console.log(`\nScanning gyms/${gymId}/exerciseCatalog ...`);
const snap = await db.collection(`gyms/${gymId}/exerciseCatalog`).get();

const changes = [];
let skipped = 0;

for (const doc of snap.docs) {
  const d = doc.data();
  const rawVid = String(d.videoUrl ?? "").trim();
  const rawGym = String(d.gymVideoUrl ?? "").trim();

  // Only fix docs where both URLs are identical (the legacy bug)
  if (!rawVid || !rawGym || rawVid !== rawGym) {
    skipped++;
    continue;
  }

  const gymVidId = extractVideoId(rawGym);
  // gymVideoUrl is correct — keep it, but normalise to shorts URL format
  const newGymVideoUrl = gymVidId ? makeShortUrl(gymVidId) : rawGym;

  // Try to find a DeltaBolic tutorial for this exercise
  const dbMatch = bestMatch(d.name, deltabolicVideos, 30);
  const tpMatch = !dbMatch ? bestMatch(d.name, tylerpathVideos, 20) : null;
  const tutorialMatch = dbMatch ?? tpMatch;

  const newVideoUrl = tutorialMatch ? makeShortUrl(tutorialMatch.id) : "";
  const newVideoSource = newVideoUrl ? "youtube" : "none";

  const patch = {
    videoUrl: newVideoUrl,
    videoSource: newVideoSource,
    gymVideoUrl: newGymVideoUrl,
    gymVideoSource: "youtube",
    updatedAt: new Date().toISOString(),
  };

  const changed =
    d.videoUrl !== newVideoUrl ||
    d.gymVideoUrl !== newGymVideoUrl ||
    d.videoSource !== newVideoSource;

  if (!changed) { skipped++; continue; }

  const channelLabel = dbMatch ? `DeltaBolic (${dbMatch.score})` : tpMatch ? `TylerPath (${tpMatch.score})` : "none";
  console.log(
    `  ${writeMode ? "[write]" : "[dry] "} ${d.name}\n` +
    `    videoUrl:    ${newVideoUrl || "(cleared)"} [${channelLabel}]\n` +
    `    gymVideoUrl: ${newGymVideoUrl} [SHG]\n` +
    `    match title: ${tutorialMatch?.title ?? "—"}`
  );

  changes.push({ ref: doc.ref, name: d.name, patch });
}

console.log(`\nFound ${changes.length} docs to fix, ${skipped} skipped (already correct or only one URL set)`);

if (writeMode && changes.length > 0) {
  for (let i = 0; i < changes.length; i += 450) {
    const batch = db.batch();
    changes.slice(i, i + 450).forEach(c => batch.set(c.ref, c.patch, { merge: true }));
    await batch.commit();
  }
  console.log(`\n✓ Applied ${changes.length} fixes to gyms/${gymId}/exerciseCatalog`);
} else if (!writeMode) {
  console.log("\nDry run — re-run with --write to apply.");
}
