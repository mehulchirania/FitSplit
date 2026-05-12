import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

loadEnvLocal();

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const staffPassword = process.env.FITSPLIT_DEMO_PASSWORD || "password";
const memberPin = process.env.FITSPLIT_MEMBER_DEMO_PIN || "1234";
const memberFirebasePassword = `pin-${memberPin}`;

const users = [
  {
    uid: "admin-fitsplit",
    email: "admin@fitsplit.app",
    displayName: "FitSplit Admin",
    role: "admin",
    gymId: "shg"
  },
  {
    uid: "santosh-shg",
    email: "santosh-shg@fitsplit.app",
    displayName: "Santosh SHG",
    role: "owner",
    gymId: "shg"
  },
  {
    uid: "shg-trainer-1",
    email: "shg-trainer-1@fitsplit.app",
    displayName: "Ravi Kumar",
    role: "owner",
    gymId: "shg"
  },
  {
    uid: "shg-trainer-2",
    email: "shg-trainer-2@fitsplit.app",
    displayName: "Priya Nair",
    role: "owner",
    gymId: "shg"
  },
  {
    uid: "dummy-gym-owner-1",
    email: "dummy-gym-owner-1@fitsplit.app",
    displayName: "Dummy Gym Owner",
    role: "owner",
    gymId: "dummy-gym"
  },
  {
    uid: "member-aarav",
    email: "aarav@example.com",
    phoneNumber: "+919876543210",
    displayName: "Aarav Sharma",
    role: "member",
    gymId: "shg"
  },
  {
    uid: "member-meera",
    email: "meera@example.com",
    phoneNumber: "+919876542109",
    displayName: "Meera Iyer",
    role: "member",
    gymId: "shg"
  },
  {
    uid: "member-kabir",
    email: "kabir@example.com",
    phoneNumber: "+919876541098",
    displayName: "Kabir Khan",
    role: "member",
    gymId: "shg"
  },
  {
    uid: "member-nisha",
    email: "nisha@example.com",
    phoneNumber: "+919876540987",
    displayName: "Nisha Rao",
    role: "member",
    gymId: "shg"
  },
  {
    uid: "member-mehul",
    email: "mehul@example.com",
    phoneNumber: "+919688227039",
    displayName: "Mehul Chirania",
    role: "member",
    gymId: "shg"
  }
];

initializeApp({
  credential:
    clientEmail && privateKey
      ? cert({ projectId, clientEmail, privateKey })
      : applicationDefault(),
  projectId
});

const auth = getAuth();

for (const user of users) {
  const { gymId, role, ...authUser } = user;
  const password = role === "member" ? memberFirebasePassword : staffPassword;

  try {
    await auth.updateUser(user.uid, {
      ...authUser,
      emailVerified: true,
      password
    });
    console.log(`Updated auth user ${user.uid}`);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }

    await auth.createUser({
      ...authUser,
      emailVerified: true,
      password
    });
    console.log(`Created auth user ${user.uid}`);
  }

  await auth.setCustomUserClaims(user.uid, {
    gymId,
    role,
    memberId: role === "member" ? user.uid : undefined
  });
}

console.log(`Seeded ${users.length} Firebase Auth users.`);
console.log(`Staff demo password: ${staffPassword}`);
console.log(`Member demo PIN: ${memberPin}`);
