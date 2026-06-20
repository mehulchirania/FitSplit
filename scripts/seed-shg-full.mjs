/**
 * seed-shg-full.mjs
 *
 * Comprehensive data seed for the SHG gym:
 *   - 12 new members (diverse states: active/expired/no-plan/no-membership)
 *   - Lift logs + day logs + body metrics (training history)
 *   - PT sessions (completed + scheduled)
 *   - Payment requests (pending + approved) + memberships
 *   - Packages, activity logs, macro logs, notifications
 *
 * Usage:  node scripts/seed-shg-full.mjs
 * Needs GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 */

import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
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
} catch { /* no .env.local */ }

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
  console.error("Missing Firebase credentials. Set FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

// ── Constants ─────────────────────────────────────────────────────────────────
const GYM  = "shg";
const NOW  = new Date().toISOString();
const OWNER = "santosh-shg";
const TRAINER_1 = "shg-trainer-1";
const TRAINER_2 = "shg-trainer-2";

// Helper: ISO string N days from today
function daysAgo(n)   { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function daysAhead(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); }
function dateStr(n)   { return daysAgo(n).slice(0, 10); }
function aheadStr(n)  { return daysAhead(n).slice(0, 10); }

// ── Batch writer ──────────────────────────────────────────────────────────────
const BATCH_SIZE = 400;
let pending = [];

async function flush() {
  while (pending.length) {
    const chunk = pending.splice(0, BATCH_SIZE);
    const b = db.batch();
    for (const { ref, data, mode } of chunk) {
      if (mode === "set") b.set(ref, data, { merge: true });
      else b.set(ref, data);
    }
    await b.commit();
    console.log(`  ✓ committed ${chunk.length} docs`);
  }
}

// Firestore rejects `undefined` — strip it recursively
function clean(obj) {
  if (Array.isArray(obj)) return obj.map(clean);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, clean(v)])
    );
  }
  return obj;
}

function set(col, id, data) {
  const ref = db.collection(col).doc(id);
  pending.push({ ref, data: clean(data), mode: "set" });
}

function gymSet(col, id, data) {
  set(`gyms/${GYM}/${col}`, id, clean({ gymId: GYM, ...data }));
}

// ── 1. Members ────────────────────────────────────────────────────────────────

const MEMBERS = [
  // Active members with plans + active memberships
  { id: "shg-m-arjun",   fullName: "Arjun Venkat",      phone: "+91 94400 11001", joinedAt: dateStr(180), goal: "Hypertrophy",          age: 27, h: 175, w: 74,  slot: "A", state: "active",   plan: "split_02", pkg: "pkg-quarterly",  memberEnd: aheadStr(45) },
  { id: "shg-m-divya",   fullName: "Divya Krishnamurthy",phone: "+91 94400 11002", joinedAt: dateStr(150), goal: "Fat loss",             age: 31, h: 160, w: 64,  slot: "B", state: "active",   plan: "split_01", pkg: "pkg-annual",     memberEnd: aheadStr(210) },
  { id: "shg-m-surya",   fullName: "Surya Prakash",      phone: "+91 94400 11003", joinedAt: dateStr(120), goal: "Strength training",    age: 34, h: 182, w: 88,  slot: "A", state: "active",   plan: "split_02", pkg: "pkg-pt-monthly", memberEnd: aheadStr(12), isPT: true  },
  { id: "shg-m-lakshmi", fullName: "Lakshmi Anand",      phone: "+91 94400 11004", joinedAt: dateStr(90),  goal: "Cardio + toning",     age: 29, h: 163, w: 58,  slot: "C", state: "active",   plan: "split_01", pkg: "pkg-quarterly",  memberEnd: aheadStr(60) },
  { id: "shg-m-murugan", fullName: "Murugan Selvam",     phone: "+91 94400 11005", joinedAt: dateStr(200), goal: "Powerlifting",        age: 38, h: 170, w: 95,  slot: "D", state: "active",   plan: "split_03", pkg: "pkg-annual",     memberEnd: aheadStr(5),  isPT: true  }, // expiring soon
  { id: "shg-m-preethi", fullName: "Preethi Suresh",     phone: "+91 94400 11006", joinedAt: dateStr(60),  goal: "Build lean muscle",   age: 25, h: 158, w: 52,  slot: "B", state: "active",   plan: "split_01", pkg: "pkg-monthly",    memberEnd: aheadStr(8) },
  // Members with expired memberships
  { id: "shg-m-ganesan", fullName: "Ganesan Pillai",     phone: "+91 94400 11007", joinedAt: dateStr(250), goal: "General fitness",     age: 43, h: 168, w: 80,  slot: "A", state: "expired",  plan: "split_02", pkg: "pkg-quarterly",  memberEnd: dateStr(15) },
  { id: "shg-m-kavitha", fullName: "Kavitha Rajan",      phone: "+91 94400 11008", joinedAt: dateStr(300), goal: "Weight loss",         age: 36, h: 155, w: 70,  slot: "C", state: "expired",  plan: "split_01", pkg: "pkg-monthly",    memberEnd: dateStr(30) },
  // Members without a workout plan (but have memberships)
  { id: "shg-m-balaji",  fullName: "Balaji Natarajan",   phone: "+91 94400 11009", joinedAt: dateStr(14),  goal: "Muscle building",     age: 22, h: 176, w: 68,  slot: "D", state: "active",   plan: null,       pkg: "pkg-monthly",    memberEnd: aheadStr(16) },
  { id: "shg-m-sathya",  fullName: "Sathya Narayanan",   phone: "+91 94400 11010", joinedAt: dateStr(7),   goal: "General fitness",     age: 45, h: 165, w: 78,  slot: "B", state: "active",   plan: null,       pkg: "pkg-quarterly",  memberEnd: aheadStr(83) },
  // Members without any membership (just joined / walked in)
  { id: "shg-m-radha",   fullName: "Radhakrishnan Iyer", phone: "+91 94400 11011", joinedAt: dateStr(3),   goal: "Beginner fitness",    age: 52, h: 167, w: 82,  slot: "A", state: "active",   plan: null,       pkg: null,             memberEnd: null },
  { id: "shg-m-prema",   fullName: "Prema Devi",         phone: "+91 94400 11012", joinedAt: dateStr(1),   goal: "Weight management",   age: 39, h: 154, w: 65,  slot: "C", state: "active",   plan: null,       pkg: null,             memberEnd: null },
];

// ── 2. Program assignments (only for members with a plan) ─────────────────────

const ASSIGNMENTS = MEMBERS.filter(m => m.plan).map(m => ({
  id:         `asgn-${m.id}`,
  memberId:   m.id,
  programId:  m.plan,
  assignedAt: daysAgo(Math.floor(Math.random() * 60 + 10)),
  status:     "active",
}));

// ── 3. Memberships ─────────────────────────────────────────────────────────────

const MEMBERSHIPS = MEMBERS.filter(m => m.pkg).map(m => {
  const ms = m.memberEnd && new Date(m.memberEnd) < new Date() ? "expired"
           : m.memberEnd && new Date(m.memberEnd) < new Date(Date.now() + 14*864e5) ? "expiring_soon"
           : "active";
  return {
    id:             `mem-${m.id}`,
    memberId:       m.id,
    packageId:      m.pkg,
    planName:       { "pkg-monthly": "Monthly", "pkg-quarterly": "Quarterly", "pkg-annual": "Annual", "pkg-pt-monthly": "PT Monthly", "pkg-pt-quarterly": "PT Quarterly" }[m.pkg],
    startDate:      m.memberEnd ? dateStr(m.pkg.includes("annual") ? 365 : m.pkg.includes("quarterly") ? 90 : 30) : dateStr(30),
    endDate:        m.memberEnd?.slice(0, 10) ?? "",
    durationMonths: m.pkg === "pkg-annual" ? 12 : m.pkg.includes("quarterly") ? 3 : 1,
    status:         ms,
    activatedAt:    daysAgo(30),
  };
});

// ── 4. Payment requests ────────────────────────────────────────────────────────

const PKGS = {
  "pkg-monthly":     { name: "Monthly",     price: 1500,  currency: "INR" },
  "pkg-quarterly":   { name: "Quarterly",   price: 4000,  currency: "INR" },
  "pkg-annual":      { name: "Annual",      price: 12000, currency: "INR" },
  "pkg-pt-monthly":  { name: "PT Monthly",  price: 4000,  currency: "INR" },
  "pkg-pt-quarterly":{ name: "PT Quarterly",price: 10500, currency: "INR" },
};

const PAYMENT_REQUESTS = [
  // Approved historical
  ...MEMBERS.filter(m => m.pkg).map((m, i) => ({
    id:            `pr-approved-${m.id}`,
    memberId:      m.id,
    memberName:    m.fullName,
    packageId:     m.pkg,
    packageName:   PKGS[m.pkg].name,
    amount:        PKGS[m.pkg].price,
    currency:      "INR",
    method:        ["cash","upi","card","upi"][i % 4],
    status:        "approved",
    requestedAt:   daysAgo(35 + i * 2),
    resolvedAt:    daysAgo(33 + i * 2),
    resolvedByName: "Santosh SHG",
  })),
  // Pending — these show up in the billing queue
  {
    id: "pr-pending-balaji", memberId: "shg-m-balaji", memberName: "Balaji Natarajan",
    packageId: "pkg-monthly", packageName: "Monthly", amount: 1500, currency: "INR",
    method: "upi", status: "pending", requestedAt: daysAgo(1),
  },
  {
    id: "pr-pending-sathya", memberId: "shg-m-sathya", memberName: "Sathya Narayanan",
    packageId: "pkg-quarterly", packageName: "Quarterly", amount: 4000, currency: "INR",
    method: "cash", status: "pending", requestedAt: daysAgo(2),
  },
  {
    id: "pr-pending-radha", memberId: "shg-m-radha", memberName: "Radhakrishnan Iyer",
    packageId: "pkg-monthly", packageName: "Monthly", amount: 1500, currency: "INR",
    method: "upi", status: "pending", requestedAt: daysAgo(0),
  },
  // Renewal payment for expiring member
  {
    id: "pr-pending-murugan", memberId: "shg-m-murugan", memberName: "Murugan Selvam",
    packageId: "pkg-pt-quarterly", packageName: "PT Quarterly", amount: 10500, currency: "INR",
    method: "cash", status: "pending", requestedAt: daysAgo(1),
  },
];

// ── 5. PT sessions ─────────────────────────────────────────────────────────────

function ptSession(id, memberId, memberName, trainerId, trainerName, daysOffset, status, focus) {
  const at = daysOffset >= 0 ? daysAhead(daysOffset) : daysAgo(-daysOffset);
  return {
    id, gymId: GYM, memberId, memberName, trainerId, trainerName,
    scheduledAt: at.slice(0,10) + "T07:00:00+05:30",
    durationMinutes: 45,
    status, notes: focus,
    createdAt: daysAgo(10), updatedAt: NOW,
  };
}

const PT_SESSIONS = [
  // Completed sessions
  ptSession("pt-surya-1",  "shg-m-surya",  "Surya Prakash",  TRAINER_1, "Ravi Kumar",  -14, "completed",  "Squat technique + progressive overload"),
  ptSession("pt-surya-2",  "shg-m-surya",  "Surya Prakash",  TRAINER_1, "Ravi Kumar",  -10, "completed",  "Deadlift form check"),
  ptSession("pt-surya-3",  "shg-m-surya",  "Surya Prakash",  TRAINER_1, "Ravi Kumar",  -7,  "completed",  "Bench press 1RM test"),
  ptSession("pt-surya-4",  "shg-m-surya",  "Surya Prakash",  TRAINER_1, "Ravi Kumar",  -3,  "completed",  "Upper body volume day"),
  ptSession("pt-murugan-1","shg-m-murugan","Murugan Selvam", TRAINER_2, "Priya Nair",  -21, "completed",  "Powerlifting setup"),
  ptSession("pt-murugan-2","shg-m-murugan","Murugan Selvam", TRAINER_2, "Priya Nair",  -14, "completed",  "Competition prep squat"),
  ptSession("pt-murugan-3","shg-m-murugan","Murugan Selvam", TRAINER_2, "Priya Nair",  -7,  "completed",  "Deadlift max attempt"),
  ptSession("pt-arjun-1",  "shg-m-arjun",  "Arjun Venkat",   TRAINER_1, "Ravi Kumar",  -10, "completed",  "Push day coaching"),
  ptSession("pt-divya-1",  "shg-m-divya",  "Divya Krishnamurthy", TRAINER_2, "Priya Nair", -8, "completed", "Cardio + core circuit"),
  // Upcoming
  ptSession("pt-surya-5",  "shg-m-surya",  "Surya Prakash",  TRAINER_1, "Ravi Kumar",  1,   "scheduled",  "Full body strength"),
  ptSession("pt-murugan-4","shg-m-murugan","Murugan Selvam", TRAINER_2, "Priya Nair",  2,   "scheduled",  "Bench technique"),
  ptSession("pt-arjun-2",  "shg-m-arjun",  "Arjun Venkat",   TRAINER_1, "Ravi Kumar",  3,   "scheduled",  "Pull day coaching"),
  ptSession("pt-divya-2",  "shg-m-divya",  "Divya Krishnamurthy", TRAINER_2, "Priya Nair", 4, "scheduled", "HIIT + core"),
];

// ── 6. Lift logs (training history) ──────────────────────────────────────────

function liftLog(memberId, exerciseId, weight, sets, reps, daysAgoN) {
  const t = daysAgo(daysAgoN);
  const id = `ll-${memberId}-${exerciseId}-${daysAgoN}`;
  return { id, memberId, exerciseId, weight, sets, reps, loggedAt: t, sessionId: `sess-${memberId}-${daysAgoN}`, createdAt: t };
}

const EXERCISE_IDS = {
  bench: "ch_01", incline: "ch_02", squat: "lg_01", rdl: "lg_02", ohp: "sh_01",
  latPull: "bk_03", row: "bk_04", curl: "bi_01", pushdown: "tr_01", lateral: "sh_02",
};

const LIFT_LOGS = [
  // Arjun — 8 weeks of push/pull history
  ...[42,35,28,21,14,7,3,1].flatMap((d, i) => [
    liftLog("shg-m-arjun", EXERCISE_IDS.bench,    60+i*2.5, 4, "8",     d),
    liftLog("shg-m-arjun", EXERCISE_IDS.incline,  40+i*2,   3, "10",    d),
    liftLog("shg-m-arjun", EXERCISE_IDS.ohp,      35+i*1.5, 4, "8",     d),
    liftLog("shg-m-arjun", EXERCISE_IDS.latPull,  55+i*2,   4, "10",    d),
    liftLog("shg-m-arjun", EXERCISE_IDS.row,      50+i*2,   3, "10",    d),
  ]),
  // Surya — powerlifting focus
  ...[45,38,31,24,17,10,5,2].flatMap((d, i) => [
    liftLog("shg-m-surya",  EXERCISE_IDS.squat,  100+i*5,  5, "5",     d),
    liftLog("shg-m-surya",  EXERCISE_IDS.bench,   80+i*2.5, 5, "5",     d),
    liftLog("shg-m-surya",  EXERCISE_IDS.rdl,     90+i*5,   4, "6",     d),
  ]),
  // Divya — cardio + toning
  ...[30,23,16,9,5,2].flatMap((d, i) => [
    liftLog("shg-m-divya",  EXERCISE_IDS.lateral, 8+i,     4, "15",    d),
    liftLog("shg-m-divya",  EXERCISE_IDS.latPull, 30+i*2,  3, "12",    d),
    liftLog("shg-m-divya",  EXERCISE_IDS.curl,    10+i,    3, "12",    d),
  ]),
  // Murugan — powerlifting
  ...[60,45,30,15,7,2].flatMap((d, i) => [
    liftLog("shg-m-murugan",EXERCISE_IDS.squat,  130+i*5,  5, "3",     d),
    liftLog("shg-m-murugan",EXERCISE_IDS.rdl,    120+i*5,  4, "4",     d),
    liftLog("shg-m-murugan",EXERCISE_IDS.bench,   100+i*2.5,5, "3",    d),
  ]),
  // Lakshmi
  ...[28,21,14,7,3].flatMap((d, i) => [
    liftLog("shg-m-lakshmi",EXERCISE_IDS.lateral, 6+i,    3, "15",    d),
    liftLog("shg-m-lakshmi",EXERCISE_IDS.latPull, 25+i*2, 3, "12",    d),
    liftLog("shg-m-lakshmi",EXERCISE_IDS.pushdown,18+i*2, 3, "12",    d),
  ]),
  // Preethi
  ...[20,13,7,3,1].flatMap((d, i) => [
    liftLog("shg-m-preethi",EXERCISE_IDS.squat,  40+i*5,  4, "10",    d),
    liftLog("shg-m-preethi",EXERCISE_IDS.bench,  25+i*2.5,3, "12",    d),
    liftLog("shg-m-preethi",EXERCISE_IDS.ohp,    20+i*1.5,3, "12",    d),
  ]),
  // Ganesan (expired membership but has history)
  ...[90,75,60,45,30,20].flatMap((d, i) => [
    liftLog("shg-m-ganesan",EXERCISE_IDS.bench,  55+i*2.5, 3, "10",   d),
    liftLog("shg-m-ganesan",EXERCISE_IDS.squat,  70+i*5,   3, "8",    d),
  ]),
  // Kavitha (expired membership)
  ...[80,60,45,30].flatMap((d, i) => [
    liftLog("shg-m-kavitha",EXERCISE_IDS.lateral,8+i,     3, "15",    d),
    liftLog("shg-m-kavitha",EXERCISE_IDS.latPull,28+i*2,  3, "12",    d),
  ]),
];

// ── 7. Day logs (workout completion) ─────────────────────────────────────────

function dayLog(memberId, daysAgoN) {
  const dateKey = daysAgo(daysAgoN).slice(0, 10);
  return {
    id:        `dl-${memberId}-${dateKey}`,
    memberId,
    date:      dateKey,
    completed: true,
    loggedAt:  daysAgo(daysAgoN),
    createdAt: daysAgo(daysAgoN),
  };
}

const DAY_LOGS = [
  // Arjun — 5 sessions/week for 6 weeks
  ...[42,40,38,35,33,28,26,24,21,19,14,12,10,7,5,3,1].map(d => dayLog("shg-m-arjun", d)),
  // Surya — 4 sessions/week
  ...[45,42,38,35,31,28,24,21,17,14,10,7,5,2].map(d => dayLog("shg-m-surya", d)),
  // Divya — 3 sessions/week
  ...[30,27,23,20,16,13,9,6,5,2].map(d => dayLog("shg-m-divya", d)),
  // Murugan — 3 sessions/week
  ...[60,57,53,48,45,41,38,35,31,28,24,21,17,14,10,7,5,2].map(d => dayLog("shg-m-murugan", d)),
  // Lakshmi
  ...[28,25,21,18,14,11,7,5,3].map(d => dayLog("shg-m-lakshmi", d)),
  // Preethi
  ...[20,17,13,10,7,5,3,1].map(d => dayLog("shg-m-preethi", d)),
  // Ganesan (history only)
  ...[90,87,83,78,75].map(d => dayLog("shg-m-ganesan", d)),
];

// ── 8. Body metric logs ────────────────────────────────────────────────────────

function bodyLog(memberId, weightKg, bodyFat, daysAgoN) {
  const d = daysAgo(daysAgoN).slice(0, 10);
  return { id: `bm-${memberId}-${d}`, memberId, date: d, weightKg, bodyFatPercent: bodyFat, loggedAt: daysAgo(daysAgoN), createdAt: daysAgo(daysAgoN) };
}

const BODY_LOGS = [
  bodyLog("shg-m-arjun",   75.0, 18, 90), bodyLog("shg-m-arjun",   74.2, 17, 60), bodyLog("shg-m-arjun",   73.5, 16, 30), bodyLog("shg-m-arjun",   72.8, 15, 7),
  bodyLog("shg-m-surya",   90.0, 22, 90), bodyLog("shg-m-surya",   89.0, 21, 60), bodyLog("shg-m-surya",   88.2, 20, 30), bodyLog("shg-m-surya",   88.0, 19, 7),
  bodyLog("shg-m-divya",   66.0, 28, 60), bodyLog("shg-m-divya",   65.0, 27, 30), bodyLog("shg-m-divya",   64.2, 26, 7),
  bodyLog("shg-m-murugan", 97.0, 26, 90), bodyLog("shg-m-murugan", 96.0, 25, 60), bodyLog("shg-m-murugan", 95.5, 24, 30),
  bodyLog("shg-m-lakshmi", 60.0, 24, 60), bodyLog("shg-m-lakshmi", 59.0, 23, 30), bodyLog("shg-m-lakshmi", 58.5, 22, 7),
  bodyLog("shg-m-preethi", 54.0, 26, 30), bodyLog("shg-m-preethi", 53.5, 25, 7),
];

// ── 9. Activity logs (cardio / stretching) ─────────────────────────────────────

function actLog(memberId, type, minutes, notes, daysAgoN) {
  const t = daysAgo(daysAgoN);
  return { id: `act-${memberId}-${type}-${daysAgoN}`, memberId, type, durationMinutes: minutes, notes, loggedAt: t, createdAt: t };
}

const ACTIVITY_LOGS = [
  actLog("shg-m-arjun",   "cardio",    20, "Treadmill warm-up",      3),
  actLog("shg-m-arjun",   "cardio",    25, "HIIT on treadmill",      7),
  actLog("shg-m-arjun",   "stretching",15, "Full body post-workout",  1),
  actLog("shg-m-divya",   "cardio",    40, "Elliptical steady state", 2),
  actLog("shg-m-divya",   "cardio",    35, "Cycling + row machine",   5),
  actLog("shg-m-divya",   "stretching",20, "Hip flexor + hamstring",  2),
  actLog("shg-m-surya",   "stretching",15, "Squat mobility drills",   1),
  actLog("shg-m-lakshmi", "cardio",    30, "Brisk treadmill walk",    3),
  actLog("shg-m-lakshmi", "stretching",20, "Yoga cool-down",          1),
  actLog("shg-m-murugan", "stretching",15, "Hip + spine mobility",    2),
  actLog("shg-m-preethi", "cardio",    20, "Cycling warm-up",         4),
];

// ── 10. Macro logs ─────────────────────────────────────────────────────────────

function macroLog(memberId, cals, protein, carbs, fat, daysAgoN) {
  const dateKey = daysAgo(daysAgoN).slice(0, 10);
  return { id: `macro-${memberId}-${dateKey}`, memberId, date: dateKey, calories: cals, proteinG: protein, carbsG: carbs, fatG: fat, createdAt: daysAgo(daysAgoN) };
}

const MACRO_LOGS = [
  macroLog("shg-m-arjun",   2400, 180, 240, 65, 1), macroLog("shg-m-arjun",   2350, 175, 235, 60, 2), macroLog("shg-m-arjun",   2450, 185, 248, 68, 3),
  macroLog("shg-m-surya",   3200, 210, 340, 90, 1), macroLog("shg-m-surya",   3100, 205, 330, 88, 2),
  macroLog("shg-m-divya",   1800, 120, 180, 55, 1), macroLog("shg-m-divya",   1750, 115, 175, 52, 2),
  macroLog("shg-m-murugan", 3800, 240, 420, 105,1), macroLog("shg-m-murugan", 3700, 235, 410, 100,2),
];

// ── 11. Owner notifications ────────────────────────────────────────────────────

const NOTIFICATIONS = [
  { id: "notif-murugan-expiring",  type: "membership_expiring_soon", body: "Murugan Selvam's PT Monthly membership expires in 5 days.", createdAt: daysAgo(1) },
  { id: "notif-ganesan-expired",   type: "membership_expired",        body: "Ganesan Pillai's membership expired 15 days ago.", createdAt: daysAgo(15) },
  { id: "notif-kavitha-expired",   type: "membership_expired",        body: "Kavitha Rajan's membership expired 30 days ago.", createdAt: daysAgo(30) },
  { id: "notif-balaji-noplan",     type: "member_no_plan",            body: "Balaji Natarajan joined 14 days ago and has no workout plan assigned.", createdAt: daysAgo(1) },
  { id: "notif-sathya-noplan",     type: "member_no_plan",            body: "Sathya Narayanan joined 7 days ago without a plan.", createdAt: daysAgo(7) },
  { id: "notif-pr-balaji",         type: "payment_request",           body: "Payment request from Balaji Natarajan — ₹1,500 via UPI.", createdAt: daysAgo(1), actionHref: "/owner/billing" },
  { id: "notif-pr-sathya",         type: "payment_request",           body: "Payment request from Sathya Narayanan — ₹4,000 (Cash).", createdAt: daysAgo(2), actionHref: "/owner/billing" },
  { id: "notif-pr-murugan",        type: "payment_request",           body: "Murugan Selvam submitted a renewal — ₹10,500 PT Quarterly.", createdAt: daysAgo(1), actionHref: "/owner/billing" },
  { id: "notif-surya-pr",          type: "member_joined",             body: "Surya Prakash's PT plan starts today. First session with Ravi Kumar at 7 AM.", createdAt: daysAgo(120) },
  { id: "notif-arjun-pr",          type: "program_assigned",          body: "PPL + Upper/Lower assigned to Arjun Venkat.", createdAt: daysAgo(60) },
];

// ── 12. Floor slots assignment ─────────────────────────────────────────────────
// Written to authProfiles so getGymFloorLoadMap picks them up

// ── Write everything ──────────────────────────────────────────────────────────

console.log("\n=== SHG Full Seed ===\n");

// Members + auth profiles
console.log(`Seeding ${MEMBERS.length} members…`);
for (const m of MEMBERS) {
  const membershipStatus = !m.memberEnd ? undefined
    : new Date(m.memberEnd) < new Date() ? "expired"
    : new Date(m.memberEnd) < new Date(Date.now() + 14*864e5) ? "expiring_soon"
    : "active";
  const memberData = {
    id: m.id, fullName: m.fullName, phone: m.phone,
    email: `${m.id}@shg.local`,
    avatarInitials: m.fullName.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase(),
    joinedAt: m.joinedAt, goal: m.goal, age: m.age, heightCm: m.h, weightKg: m.w,
    role: "member", defaultGymId: GYM, gymId: GYM, isActive: m.state !== "expired",
    membershipStatus, membershipEndDate: m.memberEnd?.slice(0, 10) ?? undefined,
    currentPackageName: m.pkg ? PKGS[m.pkg]?.name : undefined,
    isPT: m.isPT ?? false,
    createdAt: m.joinedAt, updatedAt: NOW,
    primarySlot: m.slot, secondarySlot: ["A","B","C","D"][(["A","B","C","D"].indexOf(m.slot)+2)%4],
    username: m.id, authEmail: `${m.id}@shg.local`, authUid: m.id, authIndexOnly: false,
  };
  set("authProfiles", m.id, { ...memberData, mustChangePassword: false });
  gymSet("members", m.id, memberData);
}
await flush();

// Packages (idempotent)
console.log("Seeding packages…");
for (const [pkgId, pkg] of Object.entries(PKGS)) {
  gymSet("packages", pkgId, { id: pkgId, name: pkg.name, description: `${pkg.name} gym access.`, durationMonths: pkgId.includes("annual") ? 12 : pkgId.includes("quarterly") ? 3 : 1, price: pkg.price, currency: pkg.currency, includesPT: pkgId.includes("pt"), isActive: true, createdAt: NOW });
}
await flush();

// Program assignments
console.log(`Seeding ${ASSIGNMENTS.length} program assignments…`);
for (const a of ASSIGNMENTS) {
  gymSet("programAssignments", a.id, { ...a, createdBy: OWNER, createdAt: a.assignedAt, updatedAt: NOW });
}
await flush();

// Memberships
console.log(`Seeding ${MEMBERSHIPS.length} memberships…`);
for (const m of MEMBERSHIPS) {
  gymSet("memberships", m.id, { ...m, createdAt: m.activatedAt, updatedAt: NOW });
}
await flush();

// Payment requests
console.log(`Seeding ${PAYMENT_REQUESTS.length} payment requests…`);
for (const pr of PAYMENT_REQUESTS) {
  gymSet("paymentRequests", pr.id, { ...pr, createdAt: pr.requestedAt, updatedAt: NOW });
}
await flush();

// PT sessions
console.log(`Seeding ${PT_SESSIONS.length} PT sessions…`);
for (const s of PT_SESSIONS) {
  gymSet("ptSessions", s.id, s);
}
await flush();

// Lift logs
console.log(`Seeding ${LIFT_LOGS.length} lift logs…`);
for (const l of LIFT_LOGS) {
  gymSet("liftLogs", l.id, { ...l, updatedAt: NOW });
}
await flush();

// Day logs
console.log(`Seeding ${DAY_LOGS.length} day logs…`);
for (const d of DAY_LOGS) {
  gymSet("dayLogs", d.id, { ...d, updatedAt: NOW });
}
await flush();

// Body metric logs
console.log(`Seeding ${BODY_LOGS.length} body metric logs…`);
for (const b of BODY_LOGS) {
  gymSet("bodyMetricLogs", b.id, { ...b, updatedAt: NOW });
}
await flush();

// Activity logs
console.log(`Seeding ${ACTIVITY_LOGS.length} activity logs…`);
for (const a of ACTIVITY_LOGS) {
  gymSet("activityLogs", a.id, { ...a, updatedAt: NOW });
}
await flush();

// Macro logs
console.log(`Seeding ${MACRO_LOGS.length} macro logs…`);
for (const m of MACRO_LOGS) {
  gymSet("macroLogs", m.id, { ...m, updatedAt: NOW });
}
await flush();

// Notifications
console.log(`Seeding ${NOTIFICATIONS.length} notifications…`);
for (const n of NOTIFICATIONS) {
  gymSet("notifications", n.id, {
    ...n, recipientRole: "owner", recipientId: OWNER, gymId: GYM, updatedAt: NOW,
  });
}
await flush();

// Update gym memberCount
await db.doc(`gyms/${GYM}`).set({ memberCount: 12 + 5, updatedAt: NOW }, { merge: true });
console.log("Updated gym memberCount.");

console.log("\n=== Done — SHG is fully seeded ===\n");
process.exit(0);
