/**
 * patch-exercise-data.mjs
 *
 * Targeted one-off fixes for live Firestore exercise catalog:
 *   1. Reclassify exercises miscategorised as "Shoulders" that belong to "Legs":
 *      - Body Weight Hip Thruster  → Legs
 *      - Front Squat(s)            → Legs
 *      - Walking Leg Lunges        → Legs
 *   2. Fix typo: "Battle Rope Exercixse" → "Battle Rope Exercise"
 *
 * Applies across ALL gyms (exerciseCatalog root collection + gyms/{gymId}/exerciseCatalog).
 *
 * Run:  node scripts/patch-exercise-data.mjs
 */

import { readFileSync } from "node:fs";
import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── .env.local ────────────────────────────────────────────────────────────────
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
    console.error("Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.");
    process.exit(1);
  }
  credential = cert({ projectId, clientEmail, privateKey });
}
initializeApp({ credential });
const db = getFirestore();

// ─────────────────────────────────────────────────────────────────────────────
// Patch rules — each entry: { match, updates }
//   match(data) → boolean   — true if this doc should be patched
//   updates     → object    — Firestore field updates to apply
// ─────────────────────────────────────────────────────────────────────────────

const patches = [
  {
    // Body Weight Hip Thruster / Hip Thrust miscategorised as Shoulders
    match: (d) => /hip\s*thrust/i.test(d.name ?? "") && d.muscleGroup === "Shoulders",
    updates: { muscleGroup: "Legs" },
    label: "Hip Thruster: Shoulders → Legs",
  },
  {
    // Front Squat(s) miscategorised as Shoulders
    match: (d) => /front\s*squat/i.test(d.name ?? "") && d.muscleGroup === "Shoulders",
    updates: { muscleGroup: "Legs" },
    label: "Front Squat: Shoulders → Legs",
  },
  {
    // Walking Leg Lunges / Walking Lunges miscategorised as Shoulders
    match: (d) => /walking.*lunge|lunge.*walking/i.test(d.name ?? "") && d.muscleGroup === "Shoulders",
    updates: { muscleGroup: "Legs" },
    label: "Walking Lunges: Shoulders → Legs",
  },
  {
    // Typo: Battle Rope Exercixse → Battle Rope Exercise
    match: (d) => /exercixse/i.test(d.name ?? ""),
    updates: (d) => ({ name: (d.name ?? "").replace(/exercixse/gi, "Exercise") }),
    label: "Fix typo: Exercixse → Exercise",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Scan root exerciseCatalog collection
// ─────────────────────────────────────────────────────────────────────────────

async function scanCollection(colRef, label) {
  const snap = await colRef.get();
  if (snap.empty) return 0;
  let count = 0;
  const batch = db.batch();
  let ops = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    for (const patch of patches) {
      if (!patch.match(data)) continue;
      const updates = typeof patch.updates === "function" ? patch.updates(data) : patch.updates;
      batch.update(doc.ref, { ...updates, updatedAt: new Date().toISOString() });
      console.log(`  [${label}] ${patch.label} — doc ${doc.id} (${data.name})`);
      ops++;
      count++;
      break; // only one patch per doc
    }
  }

  if (ops > 0) await batch.commit();
  return count;
}

// Root collection
let total = await scanCollection(db.collection("exerciseCatalog"), "root");

// Per-gym subcollections
const gymsSnap = await db.collection("gyms").get();
for (const gymDoc of gymsSnap.docs) {
  const subCol = db.collection("gyms").doc(gymDoc.id).collection("exerciseCatalog");
  const n = await scanCollection(subCol, `gyms/${gymDoc.id}`);
  total += n;
}

if (total === 0) {
  console.log("No matching docs found — nothing to patch.");
} else {
  console.log(`\nDone. Patched ${total} document(s).`);
}
