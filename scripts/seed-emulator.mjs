/**
 * Seeds the Firebase Local Emulator Suite with a deterministic test user.
 * Idempotent: re-running reuses the Auth user and re-writes the profile doc.
 * Refuses to run unless the emulator hosts are set - it can never touch production.
 *
 * Usage: node scripts/seed-emulator.mjs   (emulators must be running)
 * Writes credentials to .env.test.local (gitignored).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const credsFile = resolve(root, ".env.test.local");

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const fsHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
const projectId = process.env.FIREBASE_PROJECT_ID || "demo-fitsplit";
if (!projectId.startsWith("demo-")) {
  console.error(`Refusing to seed: project "${projectId}" is not a demo-* emulator project.`);
  process.exit(1);
}

function readCreds() {
  if (!existsSync(credsFile)) return {};
  return Object.fromEntries(
    readFileSync(credsFile, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
  );
}

const saved = readCreds();
const email = saved.TEST_USER_EMAIL || "test@fitsplit.test";
const password = saved.TEST_USER_PASSWORD || `Test-${randomBytes(9).toString("base64url")}`;
const fullName = "Test Lifter";

const authBase = `http://${authHost}/identitytoolkit.googleapis.com/v1`;
async function post(path, body) {
  const res = await fetch(`${authBase}/${path}?key=demo-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify(body)
  });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

let uid;
const signIn = await post("accounts:signInWithPassword", { email, password, returnSecureToken: true });
if (signIn.ok) {
  uid = signIn.json.localId;
} else {
  const created = await post("accounts:signUp", { email, password, displayName: fullName, returnSecureToken: true });
  if (created.ok) {
    uid = created.json.localId;
  } else if (created.json?.error?.message === "EMAIL_EXISTS") {
    // User exists with a different password: reset it through the emulator admin endpoint.
    const lookup = await post("accounts:lookup", { email: [email] });
    uid = lookup.json?.users?.[0]?.localId;
    if (!uid) {
      const q = await fetch(`http://${authHost}/emulator/v1/projects/${projectId}/accounts`, { headers: { Authorization: "Bearer owner" } }).then((r) => r.json());
      uid = q.users?.find((u) => u.email === email)?.localId;
    }
    await post("accounts:update", { localId: uid, password });
  } else {
    console.error("Failed to create test user:", JSON.stringify(created.json));
    process.exit(1);
  }
}

const { initializeApp, getApps } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");
process.env.FIRESTORE_EMULATOR_HOST = fsHost;
const app = getApps()[0] ?? initializeApp({ projectId });
const now = new Date().toISOString();
await getFirestore(app)
  .collection("users")
  .doc(uid)
  .set(
    {
      id: uid,
      fullName,
      email,
      avatarInitials: "TL",
      goal: "General fitness",
      isActive: true,
      termsAcceptedAt: now,
      joinedAt: now.slice(0, 10),
      createdAt: now,
      updatedAt: now
    },
    { merge: true }
  );

writeFileSync(
  credsFile,
  `# Local Firebase EMULATOR test account (not a real person). Gitignored. Created by scripts/seed-emulator.mjs\nTEST_USER_EMAIL=${email}\nTEST_USER_PASSWORD=${password}\n`
);
console.log(`Seeded emulator user ${email} (uid ${uid}). Credentials in .env.test.local`);
