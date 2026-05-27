/**
 * list-program-exercises.mjs
 * Shows: (1) active exercises for shg, (2) the Arnold Split exercises assigned to member-mehul
 * Run: node scripts/list-program-exercises.mjs
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sa = require("C:/Users/mehul/Documents/Codex/2026-05-03/FireBaseKeys/fitsplit-29215-firebase-adminsdk-fbsvc-91bb9ca45d.json");

initializeApp({ credential: cert(sa), projectId: "fitsplit-29215" });
const db = getFirestore();

async function main() {
  // 1. Active exercise IDs
  const catalogSnap = await db.collection("gyms/shg/exerciseCatalog")
    .where("isActive", "==", true).get();
  const activeIds = new Map(catalogSnap.docs.map(d => [d.id, { name: d.data().name, muscle: d.data().muscleGroup }]));
  console.log(`\nActive exercises: ${activeIds.size}`);

  // 2. Program assignment for member-mehul
  const assignSnap = await db.collection("gyms/shg/programAssignments")
    .where("memberId", "==", "member-mehul").get();
  console.log(`\nProgram assignments for member-mehul: ${assignSnap.size}`);
  for (const doc of assignSnap.docs) {
    const d = doc.data();
    console.log(`  Assignment: ${doc.id}  programId=${d.programId}  status=${d.status}`);

    // 3. Get program days/exercises
    const progDoc = await db.collection("gyms/shg/workoutPrograms").doc(d.programId).get();
    if (!progDoc.exists) { console.log("  (program not found)"); continue; }
    const prog = progDoc.data();
    console.log(`  Program name: ${prog.name}`);
    for (const day of (prog.days ?? [])) {
      const exIds = (day.exercises ?? []).map(e => e.exerciseId);
      const names = exIds.map(id => activeIds.get(id)?.name ?? `MISSING(${id})`);
      console.log(`    Day ${day.dayNumber ?? "?"} (${day.title}): ${names.join(", ")}`);
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
