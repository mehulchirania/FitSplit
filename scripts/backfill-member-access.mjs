import fs from "fs";
import path from "path";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const envPath = path.join(process.cwd(), ".env.local");

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    if (process.env[key]) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function privateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

const hasServiceAccount = Boolean(process.env.FIREBASE_CLIENT_EMAIL && privateKey());
const hasApplicationDefault = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CONFIG);

if (!process.env.FIREBASE_PROJECT_ID || (!hasServiceAccount && !hasApplicationDefault)) {
  console.log("Firebase Admin env unavailable; skipped member access backfill.");
  process.exit(0);
}

initializeApp({
  credential: hasServiceAccount
    ? cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey()
      })
    : applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID
});

const db = getFirestore();
const auth = getAuth();
const now = new Date().toISOString();

const snapshot = await db.collection("profiles").where("role", "==", "member").get();
let patchedProfiles = 0;
let createdAuthUsers = 0;

for (const doc of snapshot.docs) {
  const data = doc.data();
  const username = String(data.username || data.phone || data.email || doc.id).trim();
  let authEmail = String(data.authEmail || `${doc.id}@members.fitsplit.app`).trim().toLowerCase();
  const gymId = String(data.defaultGymId || "shg");
  const fullName = String(data.fullName || doc.id);
  const profilePatch = {};

  if (!data.username) profilePatch.username = username;
  if (!data.authEmail) profilePatch.authEmail = authEmail;

  if (Object.keys(profilePatch).length) {
    profilePatch.updatedAt = now;
    await doc.ref.set(profilePatch, { merge: true });
    patchedProfiles += 1;
  }

  try {
    await auth.getUser(doc.id);
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    try {
      await auth.createUser({
        uid: doc.id,
        email: authEmail,
        emailVerified: true,
        displayName: fullName,
        password: "pin-1234",
        disabled: data.isActive === false
      });
    } catch (createError) {
      if (createError.code !== "auth/email-already-exists") {
        throw createError;
      }

      authEmail = `${doc.id}@members.fitsplit.app`;
      await auth.createUser({
        uid: doc.id,
        email: authEmail,
        emailVerified: true,
        displayName: fullName,
        password: "pin-1234",
        disabled: data.isActive === false
      });
      await doc.ref.set({ authEmail, updatedAt: now }, { merge: true });
    }
    createdAuthUsers += 1;
  }

  await auth.setCustomUserClaims(doc.id, {
    role: "member",
    gymId,
    memberId: doc.id
  });
}

console.log(
  `Backfill complete: ${patchedProfiles} profile(s) patched, ${createdAuthUsers} auth user(s) created, ${snapshot.size} member(s) checked.`
);
