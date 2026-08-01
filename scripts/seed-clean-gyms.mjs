import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
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

if (!clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const auth = getAuth();

const NOW = new Date().toISOString();
const TODAY_STR = NOW.slice(0, 10);
const ONE_YEAR_LATER = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
const ONE_YEAR_LATER_STR = ONE_YEAR_LATER.slice(0, 10);

async function deleteCollection(pathStr) {
  const ref = db.collection(pathStr);
  const snap = await ref.get();
  if (snap.empty) return;
  const chunks = [];
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    chunks.push(docs.slice(i, i + 400));
  }
  await Promise.all(chunks.map(chunk => {
    const batch = db.batch();
    chunk.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
  }));
}

async function ensureAuthUser(uid, email, password, displayName, phone) {
  try {
    if (email) {
      try {
        const existingByEmail = await auth.getUserByEmail(email);
        if (existingByEmail && existingByEmail.uid !== uid) {
          await auth.deleteUser(existingByEmail.uid);
        }
      } catch (e) { /* ignore */ }
    }

    if (phone) {
      try {
        const existingByPhone = await auth.getUserByPhoneNumber(phone);
        if (existingByPhone && existingByPhone.uid !== uid) {
          await auth.deleteUser(existingByPhone.uid);
        }
      } catch (e) { /* ignore */ }
    }

    try {
      await auth.getUser(uid);
      await auth.updateUser(uid, {
        email,
        password,
        displayName,
        ...(phone ? { phoneNumber: phone } : {})
      });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        await auth.createUser({
          uid,
          email,
          password,
          displayName,
          ...(phone ? { phoneNumber: phone } : {})
        });
      } else {
        console.warn(`Auth update error for ${uid}:`, err.message);
      }
    }
  } catch (err) {
    console.warn(`Auth user setup error for ${uid} (${email}):`, err.message);
  }
}

async function run() {
  console.log("=== STEP 1: CLEARING ALL MEMBER DATA & STALE USERS ACROSS GYMS ===");

  const gymsSnap = await db.collection("gyms").get();
  const gymIds = gymsSnap.docs.map(d => d.id);

  await Promise.all(gymIds.map(async (gymId) => {
    console.log(`Clearing member collections for gym: ${gymId}`);
    const collectionsToClear = [
      "members", "memberships", "programAssignments", "liftLogs",
      "dayLogs", "bodyMetricLogs", "macroLogs", "activityLogs",
      "attendance", "paymentRequests", "ptSessions", "notifications", "staff"
    ];
    await Promise.all(collectionsToClear.map(col => deleteCollection(`gyms/${gymId}/${col}`)));
  }));

  // Remove old mehulchirania username doc if present
  await db.collection("usernames").doc("mehulchirania").delete().catch(() => {});
  try { await auth.deleteUser("member-mehulchirania"); } catch {}

  console.log("\n=== STEP 2: DEFINING & SEEDING GYMS, STAFF (1 Owner + 3 Trainers), AND 10 MEMBERS PER GYM ===");

  const gymsConfig = [
    {
      id: "shg",
      name: "Sri Shakthi Hanuman Gym",
      slug: "shg",
      abbreviation: "SHG",
      location: "Bengaluru, KA",
      owner: { id: "santosh-shg", name: "Santosh SHG", username: "santosh-shg", email: "santosh.shg@fitsplit.app" },
      trainers: [
        { id: "shg-trainer-1", name: "Ravi Kumar", username: "shg-trainer-1", email: "ravi.shg@fitsplit.app" },
        { id: "shg-trainer-2", name: "Priya Nair", username: "shg-trainer-2", email: "priya.shg@fitsplit.app" },
        { id: "shg-trainer-3", name: "Vikram Seth", username: "shg-trainer-3", email: "vikram.shg@fitsplit.app" }
      ],
      members: [
        { id: "member-mehul", name: "Mehul Chirania", username: "mehul", email: "mehul@members.fitsplit.app", phone: "+919688227039", isMehul: true },
        { id: "shg-m-02", name: "Aarav Sharma", username: "aarav", email: "aarav@example.com", phone: "+919876543210" },
        { id: "shg-m-03", name: "Meera Iyer", username: "meera", email: "meera@example.com", phone: "+919876542109" },
        { id: "shg-m-04", name: "Kabir Khan", username: "kabir", email: "kabir@example.com", phone: "+919876541098" },
        { id: "shg-m-05", name: "Nisha Rao", username: "nisha", email: "nisha@example.com", phone: "+919876540987" },
        { id: "shg-m-06", name: "Arjun Venkat", username: "arjun", email: "arjun@example.com", phone: "+919440011001" },
        { id: "shg-m-07", name: "Divya K", username: "divya", email: "divya@example.com", phone: "+919440011002" },
        { id: "shg-m-08", name: "Surya Prakash", username: "surya", email: "surya@example.com", phone: "+919440011003" },
        { id: "shg-m-09", name: "Lakshmi Anand", username: "lakshmi", email: "lakshmi@example.com", phone: "+919440011004" },
        { id: "shg-m-10", name: "Preethi Suresh", username: "preethi", email: "preethi@example.com", phone: "+919440011006" }
      ]
    },
    {
      id: "ironcore-blr",
      name: "IronCore Fitness",
      slug: "ironcore-blr",
      abbreviation: "ICF",
      location: "Indiranagar, Bengaluru",
      owner: { id: "ironcore-owner-1", name: "Arvind Rajagopal", username: "ironcore-owner-1", email: "arvind.ironcore@fitsplit.app" },
      trainers: [
        { id: "ironcore-trainer-1", name: "Meghana Suresh", username: "ironcore-trainer-1", email: "meghana.ironcore@fitsplit.app" },
        { id: "ironcore-trainer-2", name: "Karthik Raja", username: "ironcore-trainer-2", email: "karthik.ironcore@fitsplit.app" },
        { id: "ironcore-trainer-3", name: "Ananya Roy", username: "ironcore-trainer-3", email: "ananya.ironcore@fitsplit.app" }
      ],
      members: [
        { id: "icf-m-01", name: "Vikram Rao", username: "vikram.icf", email: "vikram.icf@example.com", phone: "+919800024740" },
        { id: "icf-m-02", name: "Yamini Iyengar", username: "yamini.icf", email: "yamini.icf@example.com", phone: "+919800025977" },
        { id: "icf-m-03", name: "Zoya Chowdary", username: "zoya.icf", email: "zoya.icf@example.com", phone: "+919800027214" },
        { id: "icf-m-04", name: "Anand Achari", username: "anand.icf", email: "anand.icf@example.com", phone: "+919800028451" },
        { id: "icf-m-05", name: "Aditya Pillai", username: "aditya.icf", email: "aditya.icf@example.com", phone: "+919800029688" },
        { id: "icf-m-06", name: "Bhavana Reddy", username: "bhavana.icf", email: "bhavana.icf@example.com", phone: "+919800030925" },
        { id: "icf-m-07", name: "Chetan Sharma", username: "chetan.icf", email: "chetan.icf@example.com", phone: "+919800032162" },
        { id: "icf-m-08", name: "Deepika Gowda", username: "deepika.icf", email: "deepika.icf@example.com", phone: "+919800033399" },
        { id: "icf-m-09", name: "Eshwar Verma", username: "eshwar.icf", email: "eshwar.icf@example.com", phone: "+919800034636" },
        { id: "icf-m-10", name: "Farida Shetty", username: "farida.icf", email: "farida.icf@example.com", phone: "+919800035873" }
      ]
    },
    {
      id: "pulse-hyd",
      name: "Pulse Fitness Studio",
      slug: "pulse-hyd",
      abbreviation: "PFS",
      location: "Gachibowli, Hyderabad",
      owner: { id: "pulse-owner-1", name: "Rehana Fatima", username: "pulse-owner-1", email: "rehana.pulse@fitsplit.app" },
      trainers: [
        { id: "pulse-trainer-1", name: "Sandeep Kaushik", username: "pulse-trainer-1", email: "sandeep.pulse@fitsplit.app" },
        { id: "pulse-trainer-2", name: "Farhan Ali", username: "pulse-trainer-2", email: "farhan.pulse@fitsplit.app" },
        { id: "pulse-trainer-3", name: "Kavya Sharma", username: "kavya.pulse@fitsplit.app", email: "kavya.pulse@fitsplit.app" }
      ],
      members: [
        { id: "pfs-m-01", name: "Rakesh Pillai", username: "rakesh.pfs", email: "rakesh.pfs@example.com", phone: "+919700010001" },
        { id: "pfs-m-02", name: "Sneha Reddy", username: "sneha.pfs", email: "sneha.pfs@example.com", phone: "+919700010002" },
        { id: "pfs-m-03", name: "Tarun Sharma", username: "tarun.pfs", email: "tarun.pfs@example.com", phone: "+919700010003" },
        { id: "pfs-m-04", name: "Uma Gowda", username: "uma.pfs", email: "uma.pfs@example.com", phone: "+919700010004" },
        { id: "pfs-m-05", name: "Vikram Verma", username: "vikram.pfs", email: "vikram.pfs@example.com", phone: "+919700010005" },
        { id: "pfs-m-06", name: "Wasim Akram", username: "wasim.pfs", email: "wasim.pfs@example.com", phone: "+919700010006" },
        { id: "pfs-m-07", name: "Yash Chopra", username: "yash.pfs", email: "yash.pfs@example.com", phone: "+919700010007" },
        { id: "pfs-m-08", name: "Zainab Begum", username: "zainab.pfs", email: "zainab.pfs@example.com", phone: "+919700010008" },
        { id: "pfs-m-09", name: "Aman Gupta", username: "aman.pfs", email: "aman.pfs@example.com", phone: "+919700010009" },
        { id: "pfs-m-10", name: "Bina Shah", username: "bina.pfs", email: "bina.pfs@example.com", phone: "+919700010010" }
      ]
    },
    {
      id: "titan-gym",
      name: "Titan Fitness Club",
      slug: "titan-gym",
      abbreviation: "TFC",
      location: "Bandra, Mumbai",
      owner: { id: "titan-owner-1", name: "Alok Nath", username: "titan-owner-1", email: "alok.titan@fitsplit.app" },
      trainers: [
        { id: "titan-trainer-1", name: "Rohan Mehta", username: "titan-trainer-1", email: "rohan.titan@fitsplit.app" },
        { id: "titan-trainer-2", name: "Simran Kaur", username: "titan-trainer-2", email: "simran.titan@fitsplit.app" },
        { id: "titan-trainer-3", name: "Aditya Verma", username: "aditya.titan@fitsplit.app" }
      ],
      members: [
        { id: "tfc-m-01", name: "Alisha Fernandes", username: "alisha.tfc", email: "alisha.tfc@example.com", phone: "+919600020001" },
        { id: "tfc-m-02", name: "Amit Yadav", username: "amit.tfc", email: "amit.tfc@example.com", phone: "+919600020002" },
        { id: "tfc-m-03", name: "Ananya Pillai", username: "ananya.tfc", email: "ananya.tfc@example.com", phone: "+919600020003" },
        { id: "tfc-m-04", name: "Aryan Kapadia", username: "aryan.tfc", email: "aryan.tfc@example.com", phone: "+919600020004" },
        { id: "tfc-m-05", name: "Deepak Bose", username: "deepak.tfc", email: "deepak.tfc@example.com", phone: "+919600020005" },
        { id: "tfc-m-06", name: "Esha Deol", username: "esha.tfc", email: "esha.tfc@example.com", phone: "+919600020006" },
        { id: "tfc-m-07", name: "Farhan Qureshi", username: "farhan.tfc", email: "farhan.tfc@example.com", phone: "+919600020007" },
        { id: "tfc-m-08", name: "Gaurav Bajaj", username: "gaurav.tfc", email: "gaurav.tfc@example.com", phone: "+919600020008" },
        { id: "tfc-m-09", name: "Hema Malini", username: "hema.tfc", email: "hema.tfc@example.com", phone: "+919600020009" },
        { id: "tfc-m-10", name: "Irfan Khan", username: "irfan.tfc", email: "irfan.tfc@example.com", phone: "+919600020010" }
      ]
    }
  ];

  await Promise.all(gymsConfig.map(async (gym) => {
    const gymId = gym.id;
    console.log(`\nProcessing Gym: ${gym.name} (${gymId})`);

    // Ensure Gym doc
    await db.collection("gyms").doc(gymId).set({
      id: gymId,
      name: gym.name,
      slug: gym.slug,
      abbreviation: gym.abbreviation,
      location: gym.location,
      status: "active",
      createdAt: NOW,
      updatedAt: NOW
    }, { merge: true });

    // Seed Owner (Password: password)
    const o = gym.owner;
    await ensureAuthUser(o.id, o.email, "password", o.name);
    await Promise.all([
      db.collection("authProfiles").doc(o.id).set({
        uid: o.id,
        email: o.email,
        role: "owner",
        gymId,
        mustChangePassword: false
      }, { merge: true }),
      db.collection("usernames").doc(o.username.toLowerCase()).set({
        uid: o.id,
        gymId,
        role: "owner",
        staffId: o.id
      }, { merge: true }),
      db.collection(`gyms/${gymId}/staff`).doc(o.id).set({
        id: o.id,
        authUid: o.id,
        fullName: o.name,
        username: o.username,
        email: o.email,
        authEmail: o.email,
        role: "owner",
        staffType: "owner",
        defaultGymId: gymId,
        isActive: true,
        mustChangePassword: false,
        createdAt: NOW,
        updatedAt: NOW
      }, { merge: true })
    ]);
    console.log(`  Created Owner: ${o.username} (password: password)`);

    // Seed 3 Trainers (Password: password)
    await Promise.all(gym.trainers.map(async (t) => {
      await ensureAuthUser(t.id, t.email, "password", t.name);
      await Promise.all([
        db.collection("authProfiles").doc(t.id).set({
          uid: t.id,
          email: t.email,
          role: "owner",
          gymId,
          mustChangePassword: false
        }, { merge: true }),
        db.collection("usernames").doc(t.username.toLowerCase()).set({
          uid: t.id,
          gymId,
          role: "trainer",
          staffId: t.id
        }, { merge: true }),
        db.collection(`gyms/${gymId}/staff`).doc(t.id).set({
          id: t.id,
          authUid: t.id,
          fullName: t.name,
          username: t.username,
          email: t.email,
          authEmail: t.email,
          role: "owner",
          staffType: "trainer",
          defaultGymId: gymId,
          isActive: true,
          mustChangePassword: false,
          createdAt: NOW,
          updatedAt: NOW
        }, { merge: true })
      ]);
      console.log(`  Created Trainer: ${t.username} (password: password)`);
    }));

    // Seed 10 Members per gym (PIN: 1234)
    await Promise.all(gym.members.map(async (m) => {
      const isMehul = !!m.isMehul;
      const assignedProgramId = "split_01"; // PPL x2
      const currentSplit = "PPL x2";

      await ensureAuthUser(m.id, m.email, "pin-1234", m.name, m.phone);
      const membershipId = `membership-${m.id}`;
      const startDate = TODAY_STR;
      const endDate = isMehul ? ONE_YEAR_LATER_STR : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const assignmentId = `assignment-${m.id}`;

      await Promise.all([
        db.collection("authProfiles").doc(m.id).set({
          uid: m.id,
          email: m.email,
          role: "member",
          gymId,
          mustChangePassword: false
        }, { merge: true }),
        db.collection("usernames").doc(m.username.toLowerCase()).set({
          uid: m.id,
          gymId,
          role: "member",
          memberId: m.id
        }, { merge: true }),
        db.collection("phones").doc(m.phone.replace(/\D/g, "")).set({
          uid: m.id,
          gymId,
          role: "member",
          memberId: m.id
        }, { merge: true }),
        db.collection(`gyms/${gymId}/members`).doc(m.id).set({
          id: m.id,
          authUid: m.id,
          fullName: m.name,
          username: m.username,
          email: m.email,
          authEmail: m.email,
          phone: m.phone,
          role: "member",
          defaultGymId: gymId,
          assignedTrainer: gym.trainers[0].id,
          assignedProgramId,
          currentSplit,
          goal: "Hypertrophy & Strength",
          isActive: true,
          createdAt: NOW,
          updatedAt: NOW
        }, { merge: true }),
        db.collection(`gyms/${gymId}/memberships`).doc(membershipId).set({
          id: membershipId,
          memberId: m.id,
          gymId,
          planName: isMehul ? "Annual VIP Membership" : "Standard Gym Membership",
          planType: isMehul ? "Annual" : "Semi-Annual",
          status: "active",
          startDate,
          endDate,
          amount: isMehul ? 18000 : 10000,
          createdAt: NOW,
          updatedAt: NOW
        }, { merge: true }),
        db.collection(`gyms/${gymId}/programAssignments`).doc(assignmentId).set({
          id: assignmentId,
          memberId: m.id,
          gymId,
          programId: "split_01",
          programName: "PPL x2 (Push Pull Legs 6-Day Split)",
          splitType: "PPL x2",
          status: "active",
          assignedAt: NOW,
          createdAt: NOW,
          updatedAt: NOW
        }, { merge: true })
      ]);

      console.log(`  Created Member: username=[${m.username}] ${isMehul ? "🔥 (Mehul: Active 1-year PPL x2)" : ""}`);
    }));
  }));

  console.log("\n=== COMPLETED SUCCESSFULLY! ===");
}

run().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
