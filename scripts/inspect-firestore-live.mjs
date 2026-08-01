import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const envContent = fs.readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
} catch { /* no env */ }

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";
let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if ((!clientEmail || !privateKey) && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const sa = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8"));
    clientEmail = clientEmail || sa.client_email;
    privateKey  = privateKey  || sa.private_key;
  } catch (e) { console.warn("Could not read credentials file:", e.message); }
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

async function run() {
  console.log("=== FIRESTORE GYMS INSPECTION ===");
  const gymsSnap = await db.collection("gyms").get();
  console.log(`Total Gyms found: ${gymsSnap.size}`);

  for (const gymDoc of gymsSnap.docs) {
    const gymId = gymDoc.id;
    const gymData = gymDoc.data();
    console.log(`\nGym ID: [${gymId}] - ${gymData.name || "No name"}`);

    const membersSnap = await db.collection(`gyms/${gymId}/members`).get();
    console.log(`  Members count: ${membersSnap.size}`);
    membersSnap.docs.slice(0, 5).forEach(m => console.log(`    - Member ID: ${m.id}, Name: ${m.data().fullName}, Username: ${m.data().username}`));

    const staffSnap = await db.collection(`gyms/${gymId}/staff`).get();
    console.log(`  Staff count: ${staffSnap.size}`);
    staffSnap.docs.forEach(s => console.log(`    - Staff ID: ${s.id}, Name: ${s.data().fullName}, Role: ${s.data().role}, Username: ${s.data().username}`));
  }

  const authProfilesSnap = await db.collection("authProfiles").get();
  console.log(`\nTotal authProfiles found: ${authProfilesSnap.size}`);

  const meSnap = await db.collection("usernames").doc("mehulchirania").get();
  console.log(`\nmehulchirania username doc exists? ${meSnap.exists}`);
  const mehulSnap = await db.collection("usernames").doc("mehul").get();
  console.log(`mehul username doc exists? ${mehulSnap.exists}`);
}

run().catch(console.error);
