import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const sa = require("C:/Users/mehul/Documents/Codex/2026-05-03/FireBaseKeys/fitsplit-29215-firebase-adminsdk-fbsvc-91bb9ca45d.json");
initializeApp({ credential: cert(sa), projectId: "fitsplit-29215" });
const db = getFirestore();

async function main() {
  // Check specific exercises used in seeded data
  const ids = ["ch_01","ch_02","ch_03","ch_04","tr_01","tr_02","bk_01","bk_02","bk_03","bk_04","bi_01","bi_03","lg_01","lg_02","lg_03","sh_01","sh_02"];
  for (const id of ids) {
    const doc = await db.doc(`gyms/shg/exerciseCatalog/${id}`).get();
    if (!doc.exists) { console.log(`${id.padEnd(8)} MISSING`); continue; }
    const d = doc.data();
    console.log(`${id.padEnd(8)} isActive=${d.isActive}  name="${d.name}"`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
