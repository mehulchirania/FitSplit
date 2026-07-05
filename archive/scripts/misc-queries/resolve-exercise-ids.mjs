/**
 * resolve-exercise-ids.mjs
 * Simulates the catalog merge to find the canonical exercise ID
 * the app uses for each name we care about.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const sa = require("C:/Users/mehul/Documents/Codex/2026-05-03/FireBaseKeys/fitsplit-29215-firebase-adminsdk-fbsvc-91bb9ca45d.json");
initializeApp({ credential: cert(sa), projectId: "fitsplit-29215" });
const db = getFirestore();

const TARGET_NAMES = [
  "Barbell Bench Press", "Incline Dumbbell Press", "Pec Deck Fly", "Cable Crossover",
  "Tricep Pushdown (Straight Bar)", "Overhead Tricep Extension",
  "Pull-Ups", "Barbell Row", "Lat Pulldown", "Seated Cable Row",
  "Barbell Curl", "Hammer Curl",
  "Barbell Squat", "Leg Press", "Romanian Deadlift",
  "Overhead Press", "Dumbbell Lateral Raise",
];

// Mock exercise IDs from workouts.json (the short-id ones)
const MOCK_IDS = {
  "Barbell Bench Press": "ch_01", "Incline Dumbbell Press": "ch_02",
  "Pec Deck Fly": "ch_03", "Cable Crossover": "ch_04",
  "Tricep Pushdown (Straight Bar)": "tr_01", "Overhead Tricep Extension": "tr_02",
  "Pull-Ups": "bk_01", "Barbell Row": "bk_02", "Lat Pulldown": "bk_03",
  "Seated Cable Row": "bk_04", "Barbell Curl": "bi_01", "Hammer Curl": "bi_03",
  "Barbell Squat": "lg_01", "Leg Press": "lg_03", "Romanian Deadlift": "lg_02",
  "Overhead Press": "sh_01", "Dumbbell Lateral Raise": "sh_02",
};

async function main() {
  const snap = await db.collection("gyms/shg/exerciseCatalog")
    .where("isActive", "==", true).get();

  // Simulate the merge exactly as the app does
  // Start with mock exercises (short IDs win initially)
  const byName = new Map();
  for (const [name, id] of Object.entries(MOCK_IDS)) {
    byName.set(name.toLowerCase(), { id, name });
  }

  // Process persisted docs
  for (const doc of snap.docs) {
    const data = doc.data();
    const name = String(data.name ?? "").toLowerCase().trim();
    const isMirrored = data.mirroredFromRootCollection === true && data.scope !== "custom";
    // skipDefaultOverride = true means: "I'm just a mirror of the default, keep the mock"
    if (isMirrored && byName.has(name)) continue; // keep mock/current
    // Otherwise overwrite with persisted version
    byName.set(name, { id: doc.id, name: data.name });
  }

  console.log("\nCanonical exercise IDs (as the app sees them):\n");
  for (const tgt of TARGET_NAMES) {
    const resolved = byName.get(tgt.toLowerCase());
    const mockId = MOCK_IDS[tgt];
    const matches = resolved?.id === mockId;
    console.log(`  ${matches ? "✓" : "✗"} ${tgt.padEnd(35)} → ${resolved?.id ?? "NOT FOUND"}${!matches ? `  (seeded as ${mockId})` : ""}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
