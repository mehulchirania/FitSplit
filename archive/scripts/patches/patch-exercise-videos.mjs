/**
 * patch-exercise-videos.mjs
 *
 * Patches exerciseCatalog documents in Firestore that have an empty videoUrl
 * with the corresponding video_url from lib/workouts.json (populated by scripts/video-utils/map_youtube_api.py).
 *
 * Usage:
 *   node scripts/patch-exercise-videos.mjs
 *
 * Reads credentials from GOOGLE_APPLICATION_CREDENTIALS (service account JSON),
 * or from FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import workoutsData from "../lib/workouts.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch { /* .env.local not found — rely on real env */ }

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";
const gymId = "shg";

// Resolve credentials: prefer service account JSON file, fall back to key/email env vars
let credential;
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credsPath) {
  const sa = JSON.parse(readFileSync(credsPath, "utf-8"));
  credential = cert({ projectId: sa.project_id || projectId, clientEmail: sa.client_email, privateKey: sa.private_key });
} else {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    console.error("Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.");
    process.exit(1);
  }
  credential = cert({ projectId, clientEmail, privateKey });
}

initializeApp({ credential });
const db = getFirestore();

// Build a name → video_url lookup from workouts.json
const videoByName = new Map();
for (const exercises of Object.values(workoutsData.exercise_catalog)) {
  for (const ex of exercises) {
    if (ex.video_url) {
      videoByName.set(ex.name.toLowerCase().trim(), ex.video_url);
    }
  }
}

console.log(`Loaded ${videoByName.size} exercises with video URLs from workouts.json`);

async function run() {
  const snapshot = await db
    .collection("exerciseCatalog")
    .where("gymId", "==", gymId)
    .get();

  if (snapshot.empty) {
    console.log("No exercises found in Firestore for gym:", gymId);
    return;
  }

  let updated = 0;
  let skipped = 0;
  const batch = db.batch();
  const now = new Date().toISOString();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const existingUrl = String(data.videoUrl ?? "").trim();

    if (existingUrl) {
      skipped++;
      continue; // already has a URL — don't overwrite
    }

    const name = String(data.name ?? "").toLowerCase().trim();
    const videoUrl = videoByName.get(name);

    if (videoUrl) {
      batch.update(doc.ref, {
        videoUrl,
        videoSource: "youtube",
        updatedAt: now
      });
      updated++;
      console.log(`  Patching: ${data.name}`);
    } else {
      skipped++;
    }
  }

  if (updated === 0) {
    console.log("Nothing to patch — all exercises already have video URLs or no matches found.");
    return;
  }

  await batch.commit();
  console.log(`\nDone. Patched ${updated} exercise(s), skipped ${skipped}.`);
}

run().catch((err) => {
  console.error("Patch failed:", err);
  process.exit(1);
});
