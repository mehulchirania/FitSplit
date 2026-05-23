import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import workoutsData from "../lib/workouts.json" with { type: "json" };

// Load .env.local so the script works with npm run seed:demo without needing
// shell-level env exports.
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
} catch { /* no .env.local — rely on real env vars */ }

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";

// Resolve credentials: prefer inline vars, fall back to service account JSON file.
let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if ((!clientEmail || !privateKey) && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const sa = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8"));
    clientEmail = clientEmail || sa.client_email;
    privateKey  = privateKey  || sa.private_key;
  } catch (e) {
    console.warn("Warning: could not read GOOGLE_APPLICATION_CREDENTIALS file:", e.message);
  }
}
const ownerId = "santosh-shg";
const adminId = "admin-fitsplit";
const gymId = "shg";
const dummyGymId = "dummy-gym";
const dummyOwnerId = "dummy-gym-owner-1";
const titanGymId = "titan-gym";
const titanOwnerId = "titan-owner-1";
const now = new Date().toISOString();

const members = [
  {
    id: "member-aarav",
    fullName: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "+91 98765 43210",
    joinedAt: "2026-02-01",
    avatarInitials: "AS",
    goal: "Build lean muscle",
    age: 29,
    heightCm: 174,
    weightKg: 72
  },
  {
    id: "member-meera",
    fullName: "Meera Iyer",
    email: "meera@example.com",
    phone: "+91 98765 42109",
    joinedAt: "2026-01-15",
    avatarInitials: "MI",
    goal: "Improve strength",
    age: 32,
    heightCm: 162,
    weightKg: 61
  },
  {
    id: "member-kabir",
    fullName: "Kabir Khan",
    email: "kabir@example.com",
    phone: "+91 98765 41098",
    joinedAt: "2025-12-10",
    avatarInitials: "KK",
    goal: "Fat loss and conditioning",
    age: 35,
    heightCm: 178,
    weightKg: 86
  },
  {
    id: "member-nisha",
    fullName: "Nisha Rao",
    email: "nisha@example.com",
    phone: "+91 98765 40987",
    joinedAt: "2026-03-02",
    avatarInitials: "NR",
    goal: "Beginner fitness",
    age: 26,
    heightCm: 158,
    weightKg: 55
  },
  {
    id: "member-mehul",
    fullName: "Mehul Chirania",
    email: "mehul@example.com",
    phone: "+91 9688227039",
    joinedAt: "2026-05-01",
    avatarInitials: "MC",
    goal: "Improve strength and mobility",
    age: 28,
    heightCm: 180,
    weightKg: 78
  }
];

const trainers = [
  {
    id: "shg-trainer-1",
    fullName: "Ravi Kumar",
    email: "shg-trainer-1@fitsplit.app",
    username: "shg-trainer-1",
    avatarInitials: "RK",
    staffType: "trainer"
  },
  {
    id: "shg-trainer-2",
    fullName: "Priya Nair",
    email: "shg-trainer-2@fitsplit.app",
    username: "shg-trainer-2",
    avatarInitials: "PN",
    staffType: "trainer"
  }
];

const memberships = [
  {
    id: "membership-aarav",
    memberId: "member-aarav",
    planName: "3 Month Strength",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    durationMonths: 3,
    paymentReference: "UPI-1038"
  },
  {
    id: "membership-meera",
    memberId: "member-meera",
    planName: "1 Month Renewal",
    startDate: "2026-04-10",
    endDate: "2026-05-09",
    durationMonths: 1,
    paymentReference: "CASH-887"
  },
  {
    id: "membership-kabir",
    memberId: "member-kabir",
    planName: "1 Month Conditioning",
    startDate: "2026-03-25",
    endDate: "2026-04-24",
    durationMonths: 1,
    paymentReference: "UPI-0991"
  },
  {
    id: "membership-nisha",
    memberId: "member-nisha",
    planName: "6 Month Starter",
    startDate: "2026-03-05",
    endDate: "2026-09-04",
    durationMonths: 6,
    paymentReference: "UPI-1116"
  },
  {
    id: "membership-mehul",
    memberId: "member-mehul",
    planName: "12 Month Elite",
    startDate: "2026-05-01",
    endDate: "2027-04-30",
    durationMonths: 12,
    paymentReference: "UPI-9999"
  }
];

const notifications = [
  {
    id: "notification-meera-expiring",
    recipientRole: "owner",
    recipientId: ownerId,
    type: "membership_expiring_soon",
    title: "Membership expiring soon",
    body: "Meera Iyer's membership ends on 09 May 2026.",
    createdAt: "2026-05-03T07:00:00+05:30"
  },
  {
    id: "notification-kabir-expired",
    recipientRole: "owner",
    recipientId: ownerId,
    type: "membership_expired",
    title: "Membership expired",
    body: "Kabir Khan's membership expired on 24 Apr 2026.",
    createdAt: "2026-05-03T07:00:00+05:30"
  },
  {
    id: "notification-aarav-program",
    recipientRole: "member",
    recipientId: "member-aarav",
    type: "program_assigned",
    title: "New workout assigned",
    body: "PPL + Upper/Lower is ready in your workout tab.",
    createdAt: "2026-04-25T10:05:00+05:30",
    readAt: "2026-04-25T10:20:00+05:30"
  }
];

const liftLogs = [
  {
    id: "lift-aarav-bench-last-week",
    memberId: "member-aarav",
    exerciseId: "ch_01",
    weight: 60,
    sets: 3,
    reps: "8",
    sessionId: "demo-session-last-week",
    loggedAt: "2026-04-27T18:20:00+05:30"
  },
  {
    id: "lift-aarav-bench-this-week",
    memberId: "member-aarav",
    exerciseId: "ch_01",
    weight: 62.5,
    sets: 3,
    reps: "8",
    sessionId: "demo-session-this-week",
    loggedAt: "2026-05-04T18:20:00+05:30"
  }
];

const programAssignments = [
  {
    id: "assignment-aarav",
    memberId: "member-aarav",
    programId: "split_02",
    assignedAt: "2026-04-25T10:00:00+05:30",
    status: "active"
  },
  {
    id: "assignment-meera",
    memberId: "member-meera",
    programId: "split_custom_template",
    assignedAt: "2026-04-20T16:00:00+05:30",
    status: "active"
  }
];

const activityEvents = [
  {
    id: "activity-owner-member-aarav",
    audience: "owner",
    title: 'New member added - "Aarav Sharma"',
    detail: "Training workspace record created for Sri Shakthi Hanuman Gym.",
    icon: "users",
    createdAt: "2026-05-04T10:30:00+05:30"
  },
  {
    id: "activity-owner-custom-plan",
    audience: "owner",
    title: "New workout plan created - Custom split v1",
    detail: "Owner-created custom plan is ready for assignment.",
    icon: "dumbbell",
    createdAt: "2026-05-04T09:45:00+05:30"
  },
  {
    id: "activity-member-membership-aarav",
    audience: "member",
    memberId: "member-aarav",
    title: "Membership status updated",
    detail: "Your active membership now shows the latest renewal window.",
    icon: "bell",
    createdAt: "2026-05-04T11:10:00+05:30"
  },
  {
    id: "activity-member-program-aarav",
    audience: "member",
    memberId: "member-aarav",
    title: "New workout plan assigned",
    detail: "PPL + Upper/Lower is available in your member portal.",
    icon: "dumbbell",
    createdAt: "2026-05-03T17:15:00+05:30"
  }
];

const siteLinks = [
  { id: "01-instagram", label: "Instagram profile", href: "#" },
  { id: "02-linkedin", label: "LinkedIn profile", href: "#" },
  { id: "03-youtube", label: "YouTube profile", href: "#" },
  { id: "04-email", label: "mehul@example.com", href: "mailto:mehul@example.com" }
];

// ── Titan Fitness Club seed data ──────────────────────────────────────────────

const titanMembers = [
  { id: "titan-ravi",     fullName: "Ravi Shankar",     email: "ravi.s@titan.com",     phone: "+91 97000 20001", joinedAt: "2026-01-05", avatarInitials: "RS", goal: "Powerlifting",            isActive: true  },
  { id: "titan-kavya",    fullName: "Kavya Krishnan",   email: "kavya.k@titan.com",    phone: "+91 97000 20002", joinedAt: "2026-01-12", avatarInitials: "KK", goal: "Endurance training",      isActive: true  },
  { id: "titan-amit",     fullName: "Amit Yadav",       email: "amit.y@titan.com",     phone: "+91 97000 20003", joinedAt: "2026-01-18", avatarInitials: "AY", goal: "Body recomposition",      isActive: true  },
  { id: "titan-sonal",    fullName: "Sonal Mehta",      email: "sonal.m@titan.com",    phone: "+91 97000 20004", joinedAt: "2026-01-25", avatarInitials: "SM", goal: "Weight loss",             isActive: true  },
  { id: "titan-deepak",   fullName: "Deepak Bose",      email: "deepak.b@titan.com",   phone: "+91 97000 20005", joinedAt: "2026-02-03", avatarInitials: "DB", goal: "Hypertrophy",             isActive: true  },
  { id: "titan-neha",     fullName: "Neha Kapoor",      email: "neha.k@titan.com",     phone: "+91 97000 20006", joinedAt: "2026-02-10", avatarInitials: "NK", goal: "Functional fitness",      isActive: true  },
  { id: "titan-kiran",    fullName: "Kiran Tiwari",     email: "kiran.t@titan.com",    phone: "+91 97000 20007", joinedAt: "2026-02-17", avatarInitials: "KT", goal: "Athletic conditioning",   isActive: true  },
  { id: "titan-sanjay",   fullName: "Sanjay Bhatt",     email: "sanjay.b@titan.com",   phone: "+91 97000 20008", joinedAt: "2026-02-22", avatarInitials: "SB", goal: "Strength and power",      isActive: false },
  { id: "titan-ananya",   fullName: "Ananya Pillai",    email: "ananya.p@titan.com",   phone: "+91 97000 20009", joinedAt: "2026-03-01", avatarInitials: "AP", goal: "Core strength",           isActive: true  },
  { id: "titan-mohit",    fullName: "Mohit Saxena",     email: "mohit.s@titan.com",    phone: "+91 97000 20010", joinedAt: "2026-03-08", avatarInitials: "MS", goal: "Build muscle",            isActive: true  },
  { id: "titan-ishaan",   fullName: "Ishaan Malhotra",  email: "ishaan.m@titan.com",   phone: "+91 97000 20011", joinedAt: "2026-03-15", avatarInitials: "IM", goal: "Weight loss",             isActive: true  },
  { id: "titan-tanvi",    fullName: "Tanvi Choudhary",  email: "tanvi.c@titan.com",    phone: "+91 97000 20012", joinedAt: "2026-03-20", avatarInitials: "TC", goal: "Flexibility and strength", isActive: true  },
  { id: "titan-gaurav",   fullName: "Gaurav Rane",      email: "gaurav.r@titan.com",   phone: "+91 97000 20013", joinedAt: "2026-03-28", avatarInitials: "GR", goal: "Cardio conditioning",     isActive: false },
  { id: "titan-poornima", fullName: "Poornima Das",     email: "poornima.d@titan.com", phone: "+91 97000 20014", joinedAt: "2026-04-02", avatarInitials: "PD", goal: "Lean muscle",             isActive: true  },
  { id: "titan-sachin",   fullName: "Sachin Pandey",    email: "sachin.p@titan.com",   phone: "+91 97000 20015", joinedAt: "2026-04-08", avatarInitials: "SP", goal: "Strength training",       isActive: true  },
  { id: "titan-alisha",   fullName: "Alisha Fernandes", email: "alisha.f@titan.com",   phone: "+91 97000 20016", joinedAt: "2026-04-12", avatarInitials: "AF", goal: "Toning",                  isActive: true  },
  { id: "titan-varun",    fullName: "Varun Mathur",     email: "varun.m@titan.com",    phone: "+91 97000 20017", joinedAt: "2026-04-20", avatarInitials: "VM", goal: "Fat loss",                isActive: true  },
  { id: "titan-nandini",  fullName: "Nandini Iyer",     email: "nandini.i@titan.com",  phone: "+91 97000 20018", joinedAt: "2026-04-25", avatarInitials: "NI", goal: "Beginner fitness",        isActive: true  },
  { id: "titan-aryan",    fullName: "Aryan Kapadia",    email: "aryan.k@titan.com",    phone: "+91 97000 20019", joinedAt: "2026-05-01", avatarInitials: "AK", goal: "Muscle building",         isActive: true  },
  { id: "titan-meghna",   fullName: "Meghna Sharma",    email: "meghna.s@titan.com",   phone: "+91 97000 20020", joinedAt: "2026-05-05", avatarInitials: "MS", goal: "General fitness",         isActive: true  },
];

const titanProgramAssignments = [
  { id: "assignment-titan-ravi",    memberId: "titan-ravi",    programId: "split_02", assignedAt: "2026-01-10T09:00:00+05:30", status: "active" },
  { id: "assignment-titan-kavya",   memberId: "titan-kavya",   programId: "split_01", assignedAt: "2026-01-18T10:00:00+05:30", status: "active" },
  { id: "assignment-titan-amit",    memberId: "titan-amit",    programId: "split_03", assignedAt: "2026-01-22T11:00:00+05:30", status: "active" },
  { id: "assignment-titan-deepak",  memberId: "titan-deepak",  programId: "split_02", assignedAt: "2026-02-08T09:30:00+05:30", status: "active" },
  { id: "assignment-titan-kiran",   memberId: "titan-kiran",   programId: "split_04", assignedAt: "2026-02-20T08:00:00+05:30", status: "active" },
  { id: "assignment-titan-ananya",  memberId: "titan-ananya",  programId: "split_01", assignedAt: "2026-03-05T10:00:00+05:30", status: "active" },
  { id: "assignment-titan-mohit",   memberId: "titan-mohit",   programId: "split_03", assignedAt: "2026-03-12T11:00:00+05:30", status: "active" },
  { id: "assignment-titan-sachin",  memberId: "titan-sachin",  programId: "split_02", assignedAt: "2026-04-10T09:00:00+05:30", status: "active" },
];

const muscleThumbnails = {
  Chest:
    "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=80",
  Back:
    "https://images.unsplash.com/photo-1571019613914-85f342c6a11e?auto=format&fit=crop&w=900&q=80",
  Legs:
    "https://images.unsplash.com/photo-1534368959876-26bf04f2c947?auto=format&fit=crop&w=900&q=80",
  Shoulders:
    "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?auto=format&fit=crop&w=900&q=80",
  Biceps:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  Triceps:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80"
};

function splitTypeFor(split) {
  if (split.is_custom) return "custom";
  if (split.split_id === "split_01") return "ppl_x2";
  if (split.split_id === "split_02") return "ppl_upper_lower";
  if (split.split_id === "split_03") return "bro_split";
  return "combo_x2";
}

function workoutProgramFromSplit(split) {
  const activeDays = split.schedule.filter((day) => day.workouts.length > 0);
  return {
    id: split.split_id,
    gymId,
    title: split.name,
    description: split.description,
    goal: split.is_custom ? "Owner-selected custom routine" : "Structured hypertrophy training",
    difficulty: split.split_id === "split_04" ? "advanced" : "intermediate",
    daysPerWeek: activeDays.length,
    splitType: splitTypeFor(split),
    days: split.schedule.map((day) => ({
      id: `${split.split_id}-day-${day.day}`,
      title: day.title,
      dayNumber: day.day,
      focus: day.workouts.length ? day.title : "Rest and recovery",
      exercises: day.workouts
        .filter((workout) => workout.exercise_id)
        .map((workout, index) => ({
          exerciseId: workout.exercise_id,
          sortOrder: index + 1,
          sets: workout.sets || null,
          reps: workout.reps || null,
          restSeconds: 75
        }))
    })),
    isActive: true,
    createdBy: ownerId,
    createdAt: now,
    updatedAt: now
  };
}

function valueToField(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return { integerValue: String(value) };
  }

  if (typeof value === "number") {
    return { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(valueToField) } };
  }

  return { mapValue: { fields: objectToFields(value) } };
}

function objectToFields(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [key, valueToField(fieldValue)])
  );
}

function createAdminSetDoc() {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey })
  });

  const db = getFirestore();
  return async function setAdminDoc(collection, id, data) {
    await db.collection(collection).doc(id).set(data, { merge: true });
  };
}

function getFirebaseCliAccessToken() {
  const configPath = path.join(
    os.homedir(),
    ".config",
    "configstore",
    "firebase-tools.json"
  );
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return config.tokens?.access_token;
}

function createRestSetDoc() {
  const accessToken = getFirebaseCliAccessToken();

  if (!accessToken) {
    throw new Error("Firebase CLI access token was not found.");
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  return async function setRestDoc(collection, id, data) {
    const response = await fetch(`${baseUrl}/${collection}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fields: objectToFields(data) })
    });

    if (!response.ok) {
      throw new Error(`${collection}/${id}: ${response.status} ${await response.text()}`);
    }
  };
}

const setDoc =
  clientEmail && privateKey
    ? createAdminSetDoc()
    : process.env.USE_FIREBASE_CLI_TOKEN === "1"
      ? createRestSetDoc()
      : null;

if (!setDoc) {
  console.error("Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY.");
  console.error(
    "For a local authenticated Firebase CLI fallback, rerun with USE_FIREBASE_CLI_TOKEN=1."
  );
  process.exit(1);
}

function authProfilePayload(id, data) {
  return {
    id,
    authUid: data.authUid ?? id,
    fullName: data.fullName ?? "",
    email: data.email ?? "",
    authEmail: data.authEmail ?? data.email ?? "",
    username: data.username ?? "",
    phone: data.phone ?? "",
    role: data.role,
    staffType: data.staffType ?? null,
    defaultGymId: data.defaultGymId ?? data.gymId ?? gymId,
    gymId: data.gymId ?? data.defaultGymId ?? gymId,
    isActive: data.isActive !== false,
    mustChangePassword: data.mustChangePassword ?? false,
    authIndexOnly: true,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now
  };
}

async function setProfileDoc(id, data) {
  const profile = { id, ...data };
  const tenantId = profile.defaultGymId ?? profile.gymId ?? gymId;
  const scopedCollection = profile.role === "member" ? "members" : "staff";

  await setDoc("authProfiles", id, authProfilePayload(id, profile));
  await setDoc(`gyms/${tenantId}/${scopedCollection}`, id, profile);
}

async function setGymScopedDoc(collection, id, data, fallbackGymId = gymId) {
  const tenantId = data.gymId ?? fallbackGymId;
  await setDoc(`gyms/${tenantId}/${collection}`, id, data);
}

await setDoc("gyms", gymId, {
  id: gymId,
  name: "Sri Shakthi Hanuman Gym",
  slug: gymId,
  ownerName: "Santosh SHG",
  ownerUserId: ownerId,
  expiryWarningDays: 7,
  memberCount: members.length,
  status: "active",
  updatedAt: now
});

await setProfileDoc(adminId, {
  id: adminId,
  fullName: "FitSplit Admin",
  email: "admin@fitsplit.local",
  authEmail: "admin@fitsplit.app",
  username: "admin",
  role: "admin",
  defaultGymId: gymId,
  isActive: true,
  createdAt: now,
  updatedAt: now
});

await setProfileDoc(ownerId, {
  id: ownerId,
  fullName: "Santosh SHG",
  email: "santosh-shg@fitsplit.app",
  authEmail: "santosh-shg@fitsplit.app",
  username: "santosh-shg",
  role: "owner",
  staffType: "owner",
  defaultGymId: gymId,
  isActive: true,
  createdAt: now,
  updatedAt: now
});

for (const trainer of trainers) {
  await setProfileDoc(trainer.id, {
    ...trainer,
    authEmail: trainer.email.toLowerCase(),
    role: "owner",
    defaultGymId: gymId,
    isActive: true,
    createdAt: now,
    updatedAt: now
  });
}

await setDoc("gyms", dummyGymId, {
  id: dummyGymId,
  name: "Dummy-Gym",
  slug: dummyGymId,
  ownerName: "Dummy Gym Owner",
  ownerUserId: dummyOwnerId,
  expiryWarningDays: 7,
  memberCount: 0,
  status: "active",
  updatedAt: now
});

await setProfileDoc(dummyOwnerId, {
  id: dummyOwnerId,
  fullName: "Dummy Gym Owner",
  email: "owner@dummygym.local",
  authEmail: "dummy-gym-owner-1@fitsplit.app",
  username: "dummy-gym-owner-1",
  role: "owner",
  defaultGymId: dummyGymId,
  isActive: true,
  createdAt: now,
  updatedAt: now
});

for (const member of members) {
  await setProfileDoc(member.id, {
    ...member,
    authEmail: member.email.toLowerCase(),
    username: member.id === "member-mehul" ? "mehulchirania" : member.email.toLowerCase(),
    role: "member",
    defaultGymId: gymId,
    isActive: true,
    createdAt: member.joinedAt,
    updatedAt: now
  });
}

for (const membership of memberships) {
  await setGymScopedDoc("memberships", membership.id, {
    ...membership,
    gymId,
    createdBy: ownerId,
    createdAt: `${membership.startDate}T00:00:00+05:30`,
    updatedAt: now
  });
}

for (const [muscleGroup, catalogExercises] of Object.entries(
  workoutsData.exercise_catalog
)) {
  for (const exercise of catalogExercises) {
    await setGymScopedDoc("exerciseCatalog", exercise.id, {
      id: exercise.id,
      gymId,
      name: exercise.name,
      muscleGroup,
      equipment: exercise.mechanic,
      instructions: `${exercise.mechanic} ${muscleGroup.toLowerCase()} movement. Add the final coaching notes and demo video from the owner catalog.`,
      videoSource: "none",
      videoUrl: "",
      thumbnailUrl:
        muscleThumbnails[muscleGroup] ??
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
      ownerOnly: true,
      isActive: true,
      createdBy: ownerId,
      createdAt: now,
      updatedAt: now
    });
  }
}

for (const split of workoutsData.training_splits) {
  const program = workoutProgramFromSplit(split);
  await setGymScopedDoc("workoutPrograms", program.id, program);
  await setGymScopedDoc("workoutSplitTemplates", split.split_id, {
    id: split.split_id,
    gymId,
    name: split.name,
    splitType: splitTypeFor(split),
    description: split.description,
    daysPerWeek: program.daysPerWeek,
    templateData: split,
    isSystemTemplate: true,
    createdBy: ownerId,
    createdAt: now,
    updatedAt: now
  });
}

for (const notification of notifications) {
  await setGymScopedDoc("notifications", notification.id, { ...notification, gymId });
}

for (const liftLog of liftLogs) {
  await setGymScopedDoc("liftLogs", liftLog.id, {
    ...liftLog,
    gymId,
    createdAt: liftLog.loggedAt,
    updatedAt: now
  });
}

for (const assignment of programAssignments) {
  await setGymScopedDoc("programAssignments", assignment.id, {
    ...assignment,
    gymId,
    createdBy: ownerId,
    createdAt: assignment.assignedAt,
    updatedAt: now
  });
}

for (const event of activityEvents) {
  await setGymScopedDoc("activityEvents", event.id, {
    ...event,
    gymId,
    createdBy: ownerId,
    updatedAt: now
  });
}

for (const link of siteLinks) {
  await setGymScopedDoc("siteLinks", link.id, {
    ...link,
    updatedAt: now
  });
}

// ── Titan Fitness Club workspace ─────────────────────────────────────────────

await setDoc("gyms", titanGymId, {
  id: titanGymId,
  name: "Titan Fitness Club",
  slug: titanGymId,
  ownerName: "Titan Owner",
  ownerUserId: titanOwnerId,
  expiryWarningDays: 7,
  memberCount: titanMembers.length,
  status: "active",
  location: "Mumbai, Maharashtra",
  logoUrl: "/titan-v2-fitness-logo.svg",
  updatedAt: now
});

await setProfileDoc(titanOwnerId, {
  id: titanOwnerId,
  fullName: "Titan Owner",
  email: "titan-owner-1@fitsplit.app",
  authEmail: "titan-owner-1@fitsplit.app",
  username: "titan-owner-1",
  avatarInitials: "TO",
  role: "owner",
  staffType: "owner",
  defaultGymId: titanGymId,
  isActive: true,
  createdAt: now,
  updatedAt: now
});

for (const member of titanMembers) {
  await setProfileDoc(member.id, {
    ...member,
    authEmail: member.email.toLowerCase(),
    username: member.email.toLowerCase(),
    role: "member",
    defaultGymId: titanGymId,
    isActive: member.isActive,
    createdAt: member.joinedAt,
    updatedAt: now
  });
}

for (const assignment of titanProgramAssignments) {
  await setGymScopedDoc("programAssignments", assignment.id, {
    ...assignment,
    gymId: titanGymId,
    createdBy: titanOwnerId,
    createdAt: assignment.assignedAt,
    updatedAt: now
  });
}

console.log("Seeded FitSplit demo Firestore records.");
