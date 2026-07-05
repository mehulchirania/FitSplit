import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const sa = require("C:/Users/mehul/Documents/Codex/2026-05-03/FireBaseKeys/fitsplit-29215-firebase-adminsdk-fbsvc-91bb9ca45d.json");
initializeApp({ credential: cert(sa), projectId: "fitsplit-29215" });
const db = getFirestore();
async function main() {
  const progDoc = await db.collection("gyms/shg/workoutPrograms").doc("split_04").get();
  const prog = progDoc.data();
  for (const day of (prog.days ?? [])) {
    console.log(`\nDay ${day.dayNumber} — ${day.title}:`);
    for (const ex of (day.exercises ?? [])) {
      console.log(`  ${ex.exerciseId}`);
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
