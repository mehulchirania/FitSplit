/**
 * list-exercises.mjs — prints all exercise IDs + names from Firestore
 * Run: node scripts/list-exercises.mjs
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const sa = require("C:/Users/mehul/Documents/Codex/2026-05-03/FireBaseKeys/fitsplit-29215-firebase-adminsdk-fbsvc-91bb9ca45d.json");

initializeApp({ credential: cert(sa), projectId: "fitsplit-29215" });
const db = getFirestore();

async function main() {
  const snap = await db.collection("gyms/shg/exerciseCatalog").get();
  console.log(`Found ${snap.size} exercises in gyms/shg/exerciseCatalog:\n`);
  const rows = snap.docs.map(d => ({ id: d.id, name: d.data().name, muscle: d.data().muscleGroup }));
  rows.sort((a,b) => (a.muscle||"").localeCompare(b.muscle||"") || (a.name||"").localeCompare(b.name||""));
  rows.forEach(r => console.log(`  ${r.id.padEnd(36)} ${(r.muscle||"?").padEnd(12)} ${r.name}`));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
