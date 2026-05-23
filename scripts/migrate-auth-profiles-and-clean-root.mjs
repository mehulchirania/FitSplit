import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import workoutsData from "../lib/workouts.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const writeMode = process.argv.includes("--write");

try {
  const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch {
  // Existing process env is fine.
}

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";
let credential;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8"));
  credential = cert({
    projectId: serviceAccount.project_id || projectId,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key
  });
} else {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    console.error("Missing Firebase Admin credentials.");
    process.exit(1);
  }
  credential = cert({ projectId, clientEmail, privateKey });
}

if (!getApps().length) initializeApp({ credential });
const db = getFirestore();
const now = new Date().toISOString();

const defaultExerciseNames = new Set(
  Object.values(workoutsData.exercise_catalog)
    .flat()
    .map((exercise) => String(exercise.name ?? "").trim().toLowerCase())
);

const gymOwnedRootCollections = [
  "notifications",
  "exerciseRequests",
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

function roleCollection(role) {
  return role === "member" ? "members" : "staff";
}

function authIndexPayload(id, data) {
  const gymId = String(data.defaultGymId ?? data.gymId ?? "shg");
  return {
    id: String(data.id ?? id),
    authUid: String(data.authUid ?? data.uid ?? id),
    email: String(data.email ?? ""),
    authEmail: String(data.authEmail ?? data.email ?? ""),
    username: data.username ? String(data.username) : "",
    phone: data.phone ? String(data.phone) : "",
    fullName: String(data.fullName ?? "FitSplit user"),
    role: String(data.role ?? "member"),
    staffType: data.staffType ? String(data.staffType) : "",
    defaultGymId: gymId,
    gymId,
    isActive: data.isActive !== false,
    mustChangePassword: data.mustChangePassword === true,
    authIndexOnly: true,
    updatedAt: now
  };
}

function fullGymProfilePayload(id, data) {
  const gymId = String(data.defaultGymId ?? data.gymId ?? "shg");
  return {
    ...data,
    id: String(data.id ?? id),
    authUid: String(data.authUid ?? data.uid ?? id),
    defaultGymId: gymId,
    gymId,
    mirroredFromRootProfile: true,
    updatedAt: String(data.updatedAt ?? now)
  };
}

async function commitOps(ops, label) {
  if (!writeMode) {
    console.log(`[dry-run] ${label}: ${ops.length} write/delete operation(s)`);
    return;
  }
  for (let i = 0; i < ops.length; i += 450) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + 450)) {
      if (op.type === "set") batch.set(op.ref, op.data, { merge: op.merge !== false });
      if (op.type === "delete") batch.delete(op.ref);
    }
    await batch.commit();
  }
  console.log(`[write] ${label}: ${ops.length} write/delete operation(s)`);
}

async function migrateProfiles() {
  const ops = [];
  const rootProfiles = await db.collection("profiles").get();

  for (const doc of rootProfiles.docs) {
    const data = doc.data();
    const role = String(data.role ?? "");
    if (!role) continue;
    const gymId = String(data.defaultGymId ?? data.gymId ?? "shg");
    ops.push({
      type: "set",
      ref: db.collection("authProfiles").doc(doc.id),
      data: authIndexPayload(doc.id, data)
    });

    if (role !== "admin") {
      ops.push({
        type: "set",
        ref: db.collection(`gyms/${gymId}/${roleCollection(role)}`).doc(doc.id),
        data: fullGymProfilePayload(doc.id, data)
      });
    }

    ops.push({ type: "delete", ref: doc.ref });
  }

  const gyms = await db.collection("gyms").get();
  for (const gym of gyms.docs) {
    for (const subcollection of ["members", "staff"]) {
      const snap = await gym.ref.collection(subcollection).get();
      for (const doc of snap.docs) {
        ops.push({
          type: "set",
          ref: db.collection("authProfiles").doc(doc.id),
          data: authIndexPayload(doc.id, doc.data())
        });
      }
    }
  }

  await commitOps(ops, "profiles -> authProfiles + gym scoped profiles");
}

async function moveGymOwnedRootCollections() {
  const ops = [];

  for (const collection of gymOwnedRootCollections) {
    const snapshot = await db.collection(collection).get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const gymId = String(data.gymId ?? "");
      if (!gymId || gymId === "global") continue;
      ops.push({
        type: "set",
        ref: db.collection(`gyms/${gymId}/${collection}`).doc(doc.id),
        data: { ...data, id: String(data.id ?? doc.id), gymId, migratedFromRootPath: doc.ref.path, updatedAt: String(data.updatedAt ?? now) }
      });
      ops.push({ type: "delete", ref: doc.ref });
    }
  }

  await commitOps(ops, "root gym-owned operational collections -> gym dirs");
}

async function splitExerciseCatalog() {
  const ops = [];
  const snapshot = await db.collection("exerciseCatalog").get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const name = String(data.name ?? "").trim();
    const isDefault = defaultExerciseNames.has(name.toLowerCase());
    const gymId = String(data.gymId ?? "");

    if (isDefault) {
      ops.push({
        type: "set",
        ref: doc.ref,
        data: {
          gymId: "global",
          scope: "default",
          gymVideoUrl: "",
          gymVideoSource: "none",
          updatedAt: now
        }
      });
      continue;
    }

    if (gymId && gymId !== "global") {
      ops.push({
        type: "set",
        ref: db.collection(`gyms/${gymId}/exerciseCatalog`).doc(doc.id),
        data: { ...data, id: String(data.id ?? doc.id), gymId, scope: "custom", migratedFromRootPath: doc.ref.path, updatedAt: now }
      });
      ops.push({ type: "delete", ref: doc.ref });
    }
  }

  await commitOps(ops, "exerciseCatalog split default root vs custom gym");
}

async function splitWorkoutPrograms() {
  const ops = [];
  const snapshot = await db.collection("workoutPrograms").get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const scope = String(data.scope ?? "");
    const source = String(data.source ?? "");
    const gymId = String(data.gymId ?? "");
    const isDefault = scope === "default" || source === "predefined" || gymId === "global";

    if (isDefault) {
      ops.push({
        type: "set",
        ref: doc.ref,
        data: { gymId: "global", scope: "default", updatedAt: now }
      });
      continue;
    }

    if (gymId) {
      ops.push({
        type: "set",
        ref: db.collection(`gyms/${gymId}/workoutPrograms`).doc(doc.id),
        data: { ...data, id: String(data.id ?? doc.id), gymId, scope: "custom", migratedFromRootPath: doc.ref.path, updatedAt: now }
      });
      ops.push({ type: "delete", ref: doc.ref });
    }
  }

  await commitOps(ops, "workoutPrograms split default root vs custom gym");
}

console.log(writeMode ? "Writing tenant cleanup migration..." : "Dry run only. Re-run with --write to apply changes.");
await migrateProfiles();
await moveGymOwnedRootCollections();
await splitExerciseCatalog();
await splitWorkoutPrograms();
console.log("Done.");
