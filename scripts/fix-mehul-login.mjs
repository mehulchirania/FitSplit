/**
 * fix-mehul-login.mjs
 *
 * One-time script to ensure Mehul's Firebase Auth account and Firestore
 * authProfiles document are correctly set up, and to clear any login lockout.
 *
 * Usage:
 *   node scripts/fix-mehul-login.mjs [--pin XXXX]
 *
 * Optional flags:
 *   --pin XXXX   Set a specific 4-digit PIN (default: 1234)
 *
 * Requires .env.local with FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY
 * (or GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON).
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ───────────────────────────────────────────────────────────
try {
  const envPath = path.resolve(__dirname, "../.env.local");
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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
} catch { /* no .env.local */ }

// ── Resolve service-account credentials ──────────────────────────────────────
const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";
let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if ((!clientEmail || !privateKey) && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const sa = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
    clientEmail = clientEmail || sa.client_email;
    privateKey = privateKey || sa.private_key;
  } catch (e) {
    console.warn("Could not read GOOGLE_APPLICATION_CREDENTIALS:", e.message);
  }
}

if (!clientEmail || !privateKey) {
  console.error("❌  Missing Firebase credentials.");
  console.error("    Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local");
  console.error("    or set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON file.");
  process.exit(1);
}

// ── Parse --pin flag ──────────────────────────────────────────────────────────
const pinFlagIndex = process.argv.indexOf("--pin");
const pin = pinFlagIndex !== -1 ? process.argv[pinFlagIndex + 1] : "1234";

if (!/^\d{4}$/.test(pin)) {
  console.error(`❌  PIN must be exactly 4 digits. Got: "${pin}"`);
  process.exit(1);
}

// ── Initialise ────────────────────────────────────────────────────────────────
initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });

const auth = getAuth();
const db = getFirestore();

const memberId = "member-mehul";
const authEmail = "mehul@example.com";
const firebasePassword = `pin-${pin}`;
const gymId = "shg";
const now = new Date().toISOString();

console.log(`\n🔧  fix-mehul-login — project: ${projectId}`);
console.log(`    memberId : ${memberId}`);
console.log(`    authEmail: ${authEmail}`);
console.log(`    PIN      : ${pin}\n`);

// ── 1. Create or update Firebase Auth user ────────────────────────────────────
try {
  await auth.updateUser(memberId, {
    email: authEmail,
    emailVerified: true,
    displayName: "Mehul Chirania",
    password: firebasePassword,
    phoneNumber: "+919688227039",
    disabled: false
  });
  console.log("✅  Firebase Auth user updated.");
} catch (err) {
  if (err.code !== "auth/user-not-found") throw err;
  await auth.createUser({
    uid: memberId,
    email: authEmail,
    emailVerified: true,
    displayName: "Mehul Chirania",
    password: firebasePassword,
    phoneNumber: "+919688227039",
    disabled: false
  });
  console.log("✅  Firebase Auth user created.");
}

// Set custom claims so the session cookie contains the right role/gymId
await auth.setCustomUserClaims(memberId, { gymId, role: "member", memberId });
console.log("✅  Custom claims set (role: member, gymId: shg).");

// ── 2. Upsert authProfiles Firestore document ─────────────────────────────────
const profileData = {
  id: memberId,
  authUid: memberId,
  fullName: "Mehul Chirania",
  email: authEmail,
  authEmail,
  username: "mehulchirania",
  phone: "+91 9688227039",
  role: "member",
  defaultGymId: gymId,
  gymId,
  isActive: true,
  avatarInitials: "MC",
  goal: "Improve strength and mobility",
  joinedAt: "2026-05-01",
  mustChangePassword: false,
  // Clear any lockout state
  failedLoginAttempts: 0,
  lockedUntil: null,
  lastFailedLoginAt: null,
  authIndexOnly: true,
  updatedAt: now
};

await db.collection("authProfiles").doc(memberId).set(profileData, { merge: true });
console.log("✅  authProfiles document upserted.");

// ── 3. Mirror to gyms/shg/members ────────────────────────────────────────────
await db.collection(`gyms/${gymId}/members`).doc(memberId).set(
  { ...profileData, mirroredFromRootProfile: true },
  { merge: true }
);
console.log("✅  gyms/shg/members mirror upserted.");

// ── 4. Clear lockout (belt-and-suspenders: search by authEmail field too) ─────
const lockSnap = await db.collection("authProfiles")
  .where("authEmail", "==", authEmail)
  .limit(5)
  .get();

for (const doc of lockSnap.docs) {
  if (doc.id === memberId) continue; // already cleared above
  await doc.ref.set(
    { failedLoginAttempts: 0, lockedUntil: null, lastFailedLoginAt: null },
    { merge: true }
  );
  console.log(`✅  Cleared lockout on duplicate doc: ${doc.id}`);
}

console.log(`
✔  Done!
   Login at fitsplit.in with:
     Username : mehulchirania  (or +91 9688227039 or mehul@example.com)
     PIN      : ${pin}
`);
