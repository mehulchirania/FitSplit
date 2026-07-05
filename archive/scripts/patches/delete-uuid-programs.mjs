/**
 * delete-uuid-programs.mjs
 *
 * Identifies and deletes duplicate workout programs whose exercises use
 * UUID-style IDs (e.g. "92d19df8-...") instead of short-code IDs.
 * These are migration artifacts from a previous catalog import.
 *
 * A program is flagged if ALL of its exercise IDs look like UUIDs
 * (match /^[0-9a-f]{8}-[0-9a-f]{4}-/i).
 *
 * Usage:
 *   node scripts/delete-uuid-programs.mjs          # dry run — lists what would be deleted
 *   node scripts/delete-uuid-programs.mjs --delete  # actually deletes
 */

import { readFileSync } from "node:fs";
import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = !process.argv.includes("--delete");

try {
  const env = readFileSync(pathResolve(__dirname, "../.env.local"), "utf-8");
  for (const line of env.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] ??= v;
  }
} catch { /* real env vars */ }

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";

let credential;
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credsPath) {
  const sa = JSON.parse(readFileSync(credsPath, "utf-8"));
  credential = cert({ projectId: sa.project_id || projectId, clientEmail: sa.client_email, privateKey: sa.private_key });
} else {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    console.error("Missing credentials.");
    process.exit(1);
  }
  credential = cert({ projectId, clientEmail, privateKey });
}
initializeApp({ credential });
const db = getFirestore();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

function hasUuidExercises(program) {
  const allExercises = (program.days ?? []).flatMap((d) => d.exercises ?? []);
  if (allExercises.length === 0) return false;
  return allExercises.every((ex) => UUID_RE.test(ex.exerciseId ?? ""));
}

async function scanAndDelete(colRef, label) {
  const snap = await colRef.get();
  if (snap.empty) return;

  const toDelete = snap.docs.filter((doc) => hasUuidExercises(doc.data()));

  if (toDelete.length === 0) {
    console.log(`  [${label}] No UUID-exercise programs found.`);
    return;
  }

  for (const doc of toDelete) {
    const d = doc.data();
    console.log(`  ${DRY_RUN ? "[DRY RUN] Would delete" : "Deleting"}: [${label}] "${d.title}" (id: ${doc.id})`);
  }

  if (!DRY_RUN) {
    const batch = db.batch();
    for (const doc of toDelete) batch.delete(doc.ref);
    await batch.commit();
    console.log(`  Deleted ${toDelete.length} program(s) from [${label}].`);
  }
}

console.log(DRY_RUN ? "=== DRY RUN — pass --delete to actually delete ===\n" : "=== LIVE DELETE ===\n");

// Root collection
await scanAndDelete(db.collection("workoutPrograms"), "root/workoutPrograms");

// Per-gym subcollections
const gymsSnap = await db.collection("gyms").get();
for (const gymDoc of gymsSnap.docs) {
  const subCol = db.collection("gyms").doc(gymDoc.id).collection("workoutPrograms");
  await scanAndDelete(subCol, `gyms/${gymDoc.id}/workoutPrograms`);
}

console.log("\nDone.");
