import { readFileSync } from "node:fs";
import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
const gymId = "shg";

let credential;
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credsPath) {
  const sa = JSON.parse(readFileSync(credsPath, "utf-8"));
  credential = cert({ projectId: sa.project_id || projectId, clientEmail: sa.client_email, privateKey: sa.private_key });
} else {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  credential = cert({ projectId, clientEmail, privateKey });
}
initializeApp({ credential });
const db = getFirestore();

// A mapping of keywords/canonical names to muscle targets
const TARGET_MAP = [
  // CHEST
  { match: /incline.*press/i, desc: "Upper Chest" },
  { match: /decline.*press/i, desc: "Lower Chest" },
  { match: /bench press|chest press/i, desc: "Mid Chest / Overall Pectorals" },
  { match: /fly|pec deck/i, desc: "Mid Chest Isolation" },
  { match: /pullover/i, desc: "Serrated Anterior / Mid Chest" },
  
  // BACK
  { match: /pull-up|chin-up|pulldown/i, desc: "Lats" },
  { match: /barbell row|dumbbell row|t-bar row/i, desc: "Lats / Rhomboids / Traps" },
  { match: /chest supported row/i, desc: "Rhomboids / Traps" },
  { match: /deadlift/i, desc: "Spinal Erectors / Hamstrings / Glutes" },
  { match: /face pull/i, desc: "Rear Delts / Traps" },
  
  // SHOULDERS
  { match: /overhead press|military press|arnold press/i, desc: "Front Delt / Overall Shoulders" },
  { match: /lateral raise/i, desc: "Side Delt" },
  { match: /front raise/i, desc: "Front Delt" },
  { match: /reverse pec|rear delt/i, desc: "Rear Delt" },
  { match: /shrug/i, desc: "Traps" },
  
  // BICEPS
  { match: /hammer curl/i, desc: "Brachialis / Long Head" },
  { match: /preacher curl|concentration curl/i, desc: "Short Head (Peak)" },
  { match: /incline.*curl/i, desc: "Long Head (Stretch)" },
  { match: /bicep curl|barbell curl/i, desc: "Full Biceps" },
  { match: /reverse curl/i, desc: "Brachioradialis / Forearms" },
  
  // TRICEPS
  { match: /overhead.*extension|skull crusher/i, desc: "Long Head" },
  { match: /pushdown|kickback/i, desc: "Lateral & Medial Head" },
  { match: /close grip|dips/i, desc: "Full Triceps / Chest" },
  
  // LEGS
  { match: /front squat|hack squat|leg extension/i, desc: "Quads" },
  { match: /barbell squat|leg press/i, desc: "Quads / Glutes" },
  { match: /romanian deadlift|leg curl/i, desc: "Hamstrings" },
  { match: /hip thrust|glute bridge/i, desc: "Glutes" },
  { match: /calf raise/i, desc: "Calves" },
  { match: /lunge|split squat/i, desc: "Quads / Glutes" },
  
  // CORE
  { match: /crunch|sit-up/i, desc: "Upper Rectus Abdominis" },
  { match: /leg raise/i, desc: "Lower Rectus Abdominis" },
  { match: /plank/i, desc: "Transverse Abdominis (Core Stability)" },
  { match: /twist|bicycle/i, desc: "Obliques" },
  { match: /hyperextension/i, desc: "Spinal Erectors" },
];

function getTarget(name) {
  for (const t of TARGET_MAP) {
    if (t.match.test(name)) return t.desc;
  }
  return null;
}

async function run() {
  const snapshot = await db.collection(`gyms/${gymId}/exerciseCatalog`).get();
  console.log(`Found ${snapshot.docs.length} exercises to patch.`);
  
  let updated = 0;
  const batch = db.batch();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const name = data.name;
    const target = getTarget(name);
    
    if (target && data.muscleTargetDescription !== target) {
      batch.update(doc.ref, { muscleTargetDescription: target });
      console.log(`Updated ${name} -> ${target}`);
      updated++;
    }
  }
  
  if (updated > 0) {
    await batch.commit();
    console.log(`Successfully patched ${updated} exercises.`);
  } else {
    console.log(`No exercises needed patching.`);
  }
}

run().catch(console.error);
