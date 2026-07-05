import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const writeMode = process.argv.includes("--write");
const PRIMARY_GYM_ID = "shg";

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
} catch {
  // No .env.local; rely on shell env.
}

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";
let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if ((!clientEmail || !privateKey) && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8"));
    clientEmail ||= serviceAccount.client_email;
    privateKey ||= serviceAccount.private_key;
  } catch (error) {
    console.warn("Warning: could not read GOOGLE_APPLICATION_CREDENTIALS:", error.message);
  }
}

if (!clientEmail || !privateKey) {
  console.error("Firebase Admin credentials missing. Add FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS.");
  process.exit(1);
}

initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  projectId
});

const db = getFirestore();
const migratedAt = new Date().toISOString();

const operationalCollections = [
  "exerciseCatalog",
  "exerciseRequests",
  "workoutPrograms",
  "notifications",
  "workoutSplitTemplates",
  "liftLogs",
  "programAssignments",
  "activityEvents",
  "workoutSessions",
  "contactMessages",
  "siteLinks",
  "attendanceRecords",
  "bodyMetricLogs",
  "dayLogs"
];

function inferGymId(data) {
  return String(data.gymId || data.defaultGymId || data.workspaceId || PRIMARY_GYM_ID).trim() || PRIMARY_GYM_ID;
}

function profileCollectionFor(data) {
  return data.role === "member" ? "members" : "staff";
}

async function commitBatch(batch, pendingWrites) {
  if (!writeMode || pendingWrites === 0) return;
  await batch.commit();
}

async function mirrorDocs(collectionName, getTarget) {
  const snapshot = await db.collection(collectionName).get();
  let planned = 0;
  let skipped = 0;
  let batch = db.batch();
  let pendingWrites = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const target = getTarget(doc.id, data);
    if (!target) {
      skipped += 1;
      continue;
    }

    planned += 1;
    if (writeMode) {
      batch.set(
        db.doc(target.path),
        {
          ...data,
          ...target.extra,
          id: data.id || doc.id,
          migratedFromRootPath: `${collectionName}/${doc.id}`,
          migratedAt
        },
        { merge: true }
      );
      pendingWrites += 1;

      if (pendingWrites >= 450) {
        await commitBatch(batch, pendingWrites);
        batch = db.batch();
        pendingWrites = 0;
      }
    }
  }

  await commitBatch(batch, pendingWrites);
  return { source: collectionName, planned, skipped };
}

async function createGymSkeletonMeta() {
  const gymSnapshot = await db.collection("gyms").get();
  const gyms = gymSnapshot.empty ? [PRIMARY_GYM_ID] : gymSnapshot.docs.map((doc) => doc.id);
  let batch = db.batch();
  let pendingWrites = 0;

  for (const gymId of gyms) {
    if (!writeMode) continue;
    batch.set(
      db.doc(`gyms/${gymId}/_meta/firestoreSkeleton`),
      {
        version: 1,
        model: "gym-first",
        subcollections: [
          "members",
          "staff",
          "exerciseCatalog",
          "exerciseRequests",
          "workoutPrograms",
          "notifications",
          "workoutSplitTemplates",
          "liftLogs",
          "programAssignments",
          "activityEvents",
          "workoutSessions",
          "contactMessages",
          "siteLinks",
          "attendanceRecords",
          "bodyMetricLogs",
          "dayLogs"
        ],
        updatedAt: migratedAt
      },
      { merge: true }
    );
    pendingWrites += 1;
  }

  await commitBatch(batch, pendingWrites);
  return gyms.length;
}

console.log(writeMode ? "Writing gym-scoped Firestore mirrors..." : "Dry run only. Re-run with --write to write data.");

const results = [];

results.push(await mirrorDocs("profiles", (docId, data) => {
  if (data.role === "admin") return null;
  const gymId = inferGymId(data);
  const scopedCollection = profileCollectionFor(data);
  return {
    path: `gyms/${gymId}/${scopedCollection}/${docId}`,
    extra: {
      authUid: data.authUid || docId,
      defaultGymId: gymId,
      gymId
    }
  };
}));

for (const collectionName of operationalCollections) {
  results.push(await mirrorDocs(collectionName, (docId, data) => {
    const gymId = inferGymId(data);
    return {
      path: `gyms/${gymId}/${collectionName}/${docId}`,
      extra: { gymId }
    };
  }));
}

const skeletonGymCount = await createGymSkeletonMeta();

console.table(results);
console.log(`${writeMode ? "Updated" : "Would update"} skeleton metadata for ${skeletonGymCount} gym(s).`);
console.log(writeMode ? "Done." : "No writes performed.");

