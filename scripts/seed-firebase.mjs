import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import workoutsData from "../lib/workouts.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
try {
  const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch { /* no .env.local */ }

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";
const ownerId = "santosh-shg";
const gymId = "shg";

// Resolve credentials
let credential;
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credsPath) {
  const sa = JSON.parse(readFileSync(credsPath, "utf-8"));
  credential = cert({ projectId: sa.project_id || projectId, clientEmail: sa.client_email, privateKey: sa.private_key });
} else {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    console.error("Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.");
    process.exit(1);
  }
  credential = cert({ projectId, clientEmail, privateKey });
}

initializeApp({ credential });

const db = getFirestore();

function authProfilePayload(profile) {
  return {
    id: profile.id,
    authUid: profile.authUid ?? profile.id,
    fullName: profile.fullName ?? "",
    email: profile.email ?? "",
    authEmail: profile.authEmail ?? profile.email ?? "",
    username: profile.username ?? "",
    phone: profile.phone ?? "",
    role: profile.role,
    staffType: profile.staffType ?? null,
    defaultGymId: profile.defaultGymId ?? profile.gymId ?? gymId,
    gymId: profile.gymId ?? profile.defaultGymId ?? gymId,
    isActive: profile.isActive !== false,
    mustChangePassword: profile.mustChangePassword ?? false,
    authIndexOnly: true,
    updatedAt: profile.updatedAt ?? new Date().toISOString()
  };
}

async function setProfile(profile) {
  const collection = profile.role === "member" ? "members" : "staff";
  await db.collection("authProfiles").doc(profile.id).set(authProfilePayload(profile), { merge: true });
  await db.collection("gyms").doc(profile.defaultGymId ?? gymId).collection(collection).doc(profile.id).set(profile, {
    merge: true
  });
}

async function seedWorkspace() {
  await db.collection("gyms").doc(gymId).set(
    {
      id: gymId,
      name: "Sri Shakthi Hanuman Gym",
      slug: gymId,
      ownerUserId: ownerId,
      expiryWarningDays: 7,
      status: "active",
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  await setProfile({
      id: ownerId,
      fullName: "Santosh SHG",
      email: "santosh-shg@fitsplit.app",
      authEmail: "santosh-shg@fitsplit.app",
      username: "santosh-shg",
      role: "owner",
      staffType: "owner",
      defaultGymId: gymId,
      isActive: true,
      updatedAt: new Date().toISOString()
    });

  const trainers = [
    {
      id: "shg-trainer-1",
      fullName: "Ravi Kumar",
      email: "shg-trainer-1@fitsplit.app",
      username: "shg-trainer-1",
      avatarInitials: "RK"
    },
    {
      id: "shg-trainer-2",
      fullName: "Priya Nair",
      email: "shg-trainer-2@fitsplit.app",
      username: "shg-trainer-2",
      avatarInitials: "PN"
    }
  ];

  for (const trainer of trainers) {
    await setProfile({
        ...trainer,
        authEmail: trainer.email.toLowerCase(),
        role: "owner",
        staffType: "trainer",
        defaultGymId: gymId,
        isActive: true,
        updatedAt: new Date().toISOString()
      });
  }
}

async function getOrCreateExercise(muscleGroup, exercise) {
  const existing = await db
    .collection("gyms")
    .doc(gymId)
    .collection("exerciseCatalog")
    .where("gymId", "==", gymId)
    .where("name", "==", exercise.name)
    .limit(1)
    .get();

  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await db.collection("gyms").doc(gymId).collection("exerciseCatalog").doc(id).set({
    id,
    gymId,
    name: exercise.name,
    muscleGroup,
    equipment: exercise.mechanic,
    instructions: `${exercise.mechanic} ${muscleGroup.toLowerCase()} movement. Add final coaching notes and demo video later.`,
    videoSource: exercise.video_url ? "youtube" : "none",
    videoUrl: exercise.video_url ?? "",
    ownerOnly: true,
    isActive: true,
    createdBy: ownerId,
    createdAt: now,
    updatedAt: now
  });

  return id;
}

async function seedExercises() {
  const idMap = new Map();

  for (const [muscleGroup, exercises] of Object.entries(workoutsData.exercise_catalog)) {
    for (const exercise of exercises) {
      idMap.set(exercise.id, await getOrCreateExercise(muscleGroup, exercise));
    }
  }

  return idMap;
}

function splitTypeFor(split) {
  if (split.is_custom) return "custom";
  if (split.split_id === "split_01") return "ppl_x2";
  if (split.split_id === "split_02") return "ppl_upper_lower";
  if (split.split_id === "split_03") return "bro_split";
  return "combo_x2";
}

async function seedSplitTemplates(exerciseIdMap) {
  for (const split of workoutsData.training_splits) {
    const existing = await db
      .collection("gyms")
      .doc(gymId)
      .collection("workoutPrograms")
      .where("gymId", "==", gymId)
      .where("title", "==", split.name)
      .limit(1)
      .get();

    if (!existing.empty) {
      continue;
    }

    const activeDays = split.schedule.filter((day) => day.workouts.length > 0);
    const id = randomUUID();
    const now = new Date().toISOString();
    const days = split.schedule.map((day) => ({
      id: randomUUID(),
      title: day.title,
      dayNumber: day.day,
      focus: day.workouts.length ? day.title : "Rest and recovery",
      exercises: day.workouts
        .filter((workout) => workout.exercise_id && exerciseIdMap.has(workout.exercise_id))
        .map((workout, index) => ({
          exerciseId: exerciseIdMap.get(workout.exercise_id),
          sortOrder: index + 1,
          sets: workout.sets || null,
          reps: workout.reps || null,
          restSeconds: 75
        }))
    }));

    await db.collection("gyms").doc(gymId).collection("workoutPrograms").doc(id).set({
      id,
      gymId,
      title: split.name,
      description: split.description,
      goal: split.is_custom ? "Owner-selected custom routine" : "Structured hypertrophy training",
      difficulty: split.split_id === "split_04" ? "advanced" : "intermediate",
      daysPerWeek: activeDays.length,
      splitType: splitTypeFor(split),
      days,
      isActive: true,
      createdBy: ownerId,
      createdAt: now,
      updatedAt: now
    });

    await db.collection("gyms").doc(gymId).collection("workoutSplitTemplates").doc(randomUUID()).set({
      gymId,
      name: split.name,
      splitType: splitTypeFor(split),
      description: split.description,
      daysPerWeek: activeDays.length,
      templateData: split,
      createdBy: ownerId,
      isSystemTemplate: true,
      createdAt: now,
      updatedAt: now
    });
  }
}

await seedWorkspace();
const exerciseIdMap = await seedExercises();
await seedSplitTemplates(exerciseIdMap);

console.log("Firebase seed complete for Sri Shakthi Hanuman Gym.");
