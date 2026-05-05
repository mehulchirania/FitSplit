import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const password = process.env.FITSPLIT_DEMO_PASSWORD || "password";

const users = [
  {
    uid: "admin-fitsplit",
    email: "admin@fitsplit.app",
    displayName: "FitSplit Admin",
    role: "admin",
    gymId: "titan-v2-fitness"
  },
  {
    uid: "titan-owner-1",
    email: "titan-owner-1@fitsplit.app",
    displayName: "Titan V2 Owner",
    role: "owner",
    gymId: "titan-v2-fitness"
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
    gymId: "titan-v2-fitness"
  },
  {
    uid: "member-meera",
    email: "meera@example.com",
    phoneNumber: "+919876542109",
    displayName: "Meera Iyer",
    role: "member",
    gymId: "titan-v2-fitness"
  },
  {
    uid: "member-kabir",
    email: "kabir@example.com",
    phoneNumber: "+919876541098",
    displayName: "Kabir Khan",
    role: "member",
    gymId: "titan-v2-fitness"
  },
  {
    uid: "member-nisha",
    email: "nisha@example.com",
    phoneNumber: "+919876540987",
    displayName: "Nisha Rao",
    role: "member",
    gymId: "titan-v2-fitness"
  },
  {
    uid: "member-mehul",
    email: "mehul@example.com",
    phoneNumber: "+919688227039",
    displayName: "Mehul Chirania",
    role: "member",
    gymId: "titan-v2-fitness"
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

console.log(`Seeded ${users.length} Firebase Auth users. Demo password: ${password}`);
