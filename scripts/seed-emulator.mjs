/**
 * Seeds the Firebase Local Emulator Suite with a deterministic test user who signs
 * in with a mobile number + 4-digit PIN, and who is already following a plan.
 * Idempotent: re-running reuses the Auth user, resets its PIN and re-writes the
 * profile and active plan. Refuses to run unless the project is a demo-* emulator
 * project, so it can never touch production.
 *
 * Usage: node scripts/seed-emulator.mjs   (emulators must be running)
 * Writes the sign-in details to .env.test.local (gitignored).
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// The one place the phone -> Firebase identity mapping lives (shared with the app).
import { normalizePhone, phoneToEmail, pinToPassword } from "../src/lib/phone-identity.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const credsFile = resolve(root, ".env.test.local");

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const fsHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
const projectId = process.env.FIREBASE_PROJECT_ID || "demo-fitsplit";
if (!projectId.startsWith("demo-")) {
  console.error(`Refusing to seed: project "${projectId}" is not a demo-* emulator project.`);
  process.exit(1);
}

const TEST_NAME = "Mehul";
const TEST_PHONE_INPUT = "9688227039";
const TEST_PIN = "1234";
/** "Push Pull Legs Upper Lower": the built-in 5-day split (packages/core split library). */
const PLAN_ID = "split_02";
/** The account the seed used before phone + PIN sign-in. Removed so it can't linger. */
const LEGACY_EMAIL = "test@fitsplit.test";

const phone = normalizePhone(TEST_PHONE_INPUT);
const email = phoneToEmail(phone);
const password = pinToPassword(TEST_PIN);

const authBase = `http://${authHost}/identitytoolkit.googleapis.com/v1`;
async function post(path, body) {
  const res = await fetch(`${authBase}/${path}?key=demo-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify(body)
  });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

process.env.FIRESTORE_EMULATOR_HOST = fsHost;
const { initializeApp, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
const app = getApps()[0] ?? initializeApp({ projectId });
const db = getFirestore(app);

// -- remove the legacy email/password test account, if a previous seed made one --
const legacy = await post("accounts:lookup", { email: [LEGACY_EMAIL] });
const legacyUid = legacy.json?.users?.[0]?.localId;
if (legacyUid) {
  await post("accounts:delete", { localId: legacyUid });
  await db.recursiveDelete(db.collection("users").doc(legacyUid));
  console.log(`Removed legacy emulator user ${LEGACY_EMAIL}`);
}

// -- the phone + PIN user ----------------------------------------------------------
let uid;
const signIn = await post("accounts:signInWithPassword", { email, password, returnSecureToken: true });
if (signIn.ok) {
  uid = signIn.json.localId;
} else {
  const created = await post("accounts:signUp", { email, password, displayName: TEST_NAME, returnSecureToken: true });
  if (created.ok) {
    uid = created.json.localId;
  } else if (created.json?.error?.message === "EMAIL_EXISTS") {
    // User exists with a different PIN: reset it through the emulator admin endpoint.
    const lookup = await post("accounts:lookup", { email: [email] });
    uid = lookup.json?.users?.[0]?.localId;
    await post("accounts:update", { localId: uid, password });
  } else {
    console.error("Failed to create test user:", JSON.stringify(created.json));
    process.exit(1);
  }
}

const now = new Date().toISOString();
const userRef = db.collection("users").doc(uid);
await userRef.set(
  {
    id: uid,
    fullName: TEST_NAME,
    phone,
    avatarInitials: "M",
    goal: "Build muscle",
    rehabConditions: ["lower-back-pain"],
    isActive: true,
    termsAcceptedAt: now,
    consent: {
      termsVersion: "seed",
      privacyVersion: "seed",
      acceptedAt: now,
      ageGroup: "adult",
      diagnostics: { granted: false, updatedAt: now }
    },
    isMinor: false,
    joinedAt: now.slice(0, 10),
    createdAt: now,
    updatedAt: now
  },
  { merge: true }
);

// -- active plan: PPL + Upper/Lower, so sign-in lands straight on Today ------------
const assignments = userRef.collection("programAssignments");
const active = await assignments.where("status", "==", "active").get();
await Promise.all(active.docs.filter((d) => d.id !== "seed-active").map((d) => d.ref.set({ status: "cancelled", updatedAt: now }, { merge: true })));
await assignments.doc("seed-active").set({
  id: "seed-active",
  memberId: uid,
  programId: PLAN_ID,
  assignedAt: now,
  status: "active",
  createdAt: now,
  updatedAt: now
});

writeFileSync(
  credsFile,
  `# Local Firebase EMULATOR test account (not a real person). Gitignored. Created by scripts/seed-emulator.mjs\nTEST_USER_NAME=${TEST_NAME}\nTEST_USER_PHONE=${TEST_PHONE_INPUT}\nTEST_USER_PIN=${TEST_PIN}\n`
);
console.log(`Seeded emulator user ${TEST_NAME} (${phone}, uid ${uid}) on plan ${PLAN_ID}. Sign-in details in .env.test.local`);
