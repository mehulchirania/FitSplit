/**
 * seed-demo-gyms.mjs
 *
 * Multi-gym E2E demo data seed. Builds on the shape/conventions of
 * scripts/seed-shg-full.mjs and scripts/seed-firebase-auth.mjs.
 *
 * Seeds THREE gyms with 20 members each (60 total):
 *   - shg          Sri Shakthi Hanuman Gym   (existing gym — topped up to 20)
 *   - ironcore-blr IronCore Fitness          (new gym, Bengaluru)
 *   - pulse-hyd    Pulse Fitness Studio      (new gym, Hyderabad)
 *
 * Each gym gets: 1 owner + 1 trainer (staff + authProfiles), 3 packages,
 * 20 members in varied states (active / expiring-soon / expired / no-plan /
 * no-membership / PT), program assignments distributed round-robin across
 * REAL workoutPrograms doc IDs (queried at runtime), multi-week training
 * history (liftLogs/dayLogs/bodyMetricLogs/macroLogs/activityLogs), implicit
 * attendance/workoutSessions docs, notifications, paymentRequests, and PT
 * sessions. Firebase Auth users + usernames/phones registries are created
 * for every new member and staff account.
 *
 * Idempotent: deterministic doc IDs + set(..., { merge: true }) everywhere,
 * so re-running never duplicates data.
 *
 * Usage:  node scripts/seed-demo-gyms.mjs
 * Needs FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (or
 * GOOGLE_APPLICATION_CREDENTIALS) in .env.local — same as the other seeds.
 */

import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Env loading (verbatim pattern from seed-shg-full.mjs) ──────────────────
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
  console.error("\nMissing Firebase Admin credentials.");
  console.error("Set FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in .env.local,");
  console.error("or GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account JSON file.");
  console.error("STOPPING — no data was written.\n");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();
const auth = getAuth();

// ── Helpers ──────────────────────────────────────────────────────────────
const NOW = new Date().toISOString();
function daysAgo(n)   { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function daysAhead(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); }
function dateStr(n)   { return daysAgo(n).slice(0, 10); }
function aheadStr(n)  { return daysAhead(n).slice(0, 10); }
function initials(name) { return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }

function clean(obj) {
  if (Array.isArray(obj)) return obj.map(clean);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, clean(v)])
    );
  }
  return obj;
}

const BATCH_SIZE = 400;
let pending = [];
function set(col, id, data) {
  pending.push({ ref: db.collection(col).doc(id), data: clean(data) });
}
function gymSet(gymId, col, id, data) {
  set(`gyms/${gymId}/${col}`, id, clean({ gymId, ...data }));
}
async function flush(label) {
  let n = 0;
  while (pending.length) {
    const chunk = pending.splice(0, BATCH_SIZE);
    const b = db.batch();
    for (const { ref, data } of chunk) b.set(ref, data, { merge: true });
    await b.commit();
    n += chunk.length;
  }
  if (label) console.log(`  ok ${label}: ${n} docs`);
  return n;
}

function membershipStatusFor(endDate) {
  if (!endDate) return undefined;
  const end = new Date(endDate);
  if (end < new Date()) return "expired";
  if (end < new Date(Date.now() + 14 * 864e5)) return "expiring_soon";
  return "active";
}

// ── Name pools (data-driven member generation) ──────────────────────────────
const FIRST_NAMES = [
  "Aditya","Bhavana","Chetan","Deepika","Eshwar","Farida","Gowtham","Harini",
  "Imran","Jyothi","Karthik","Lavanya","Manoj","Nithya","Om","Pallavi",
  "Rakesh","Sneha","Tarun","Uma","Vikram","Yamini","Zoya","Anand",
];
const LAST_NAMES = [
  "Reddy","Rao","Naidu","Sharma","Iyengar","Menon","Gowda","Chowdary",
  "Prasad","Verma","Achari","Bhat","Shetty","Pillai","Kumar","Devi",
];
const GOALS = [
  "Hypertrophy","Fat loss","Strength training","Cardio + toning","Powerlifting",
  "Build lean muscle","General fitness","Weight loss","Muscle building","Beginner fitness",
];
const SLOTS = ["A", "B", "C", "D"];

function nameFor(seedIndex) {
  const first = FIRST_NAMES[seedIndex % FIRST_NAMES.length];
  const last = LAST_NAMES[(seedIndex * 3 + 5) % LAST_NAMES.length];
  return `${first} ${last}`;
}

// Member "state" archetypes cycled round-robin across 20 slots per gym so
// every gym has the same E2E coverage: mostly active + a spread of edge cases.
const STATE_CYCLE = [
  "active", "active", "active", "active", "active",
  "active_pt", "active", "expiring_soon", "active",
  "expired", "active", "no_plan", "active",
  "no_membership", "active", "active_pt", "active",
  "expiring_soon", "expired", "no_membership",
];

const PKG_DEFS = {
  "pkg-monthly":      { name: "Monthly",      price: 1500,  months: 1  },
  "pkg-quarterly":    { name: "Quarterly",    price: 4000,  months: 3  },
  "pkg-annual":       { name: "Annual",       price: 12000, months: 12 },
  "pkg-pt-monthly":   { name: "PT Monthly",   price: 4000,  months: 1  },
  "pkg-pt-quarterly": { name: "PT Quarterly", price: 10500, months: 3  },
};

const EXERCISE_IDS = {
  bench: "ch_01", incline: "ch_02", squat: "lg_01", rdl: "lg_02", ohp: "sh_01",
  latPull: "bk_03", row: "bk_04", curl: "bi_01", pushdown: "tr_01", lateral: "sh_02",
};
const EXERCISE_POOL = Object.values(EXERCISE_IDS);

// ── Gym definitions ─────────────────────────────────────────────────────────

const GYMS = [
  {
    id: "shg",
    isNew: false,
    name: "Sri Shakthi Hanuman Gym",
    ownerName: "Santosh SHG",
    ownerId: "santosh-shg",
    ownerEmail: "santosh-shg@fitsplit.app",
    trainerId: "shg-trainer-1",
    trainerName: "Ravi Kumar",
    trainerEmail: "shg-trainer-1@fitsplit.app",
    location: "Coimbatore, Tamil Nadu",
  },
  {
    id: "ironcore-blr",
    isNew: true,
    name: "IronCore Fitness",
    ownerName: "Arvind Rajagopal",
    ownerId: "ironcore-owner-1",
    ownerEmail: "ironcore-owner-1@fitsplit.app",
    trainerId: "ironcore-trainer-1",
    trainerName: "Meghana Suresh",
    trainerEmail: "ironcore-trainer-1@fitsplit.app",
    location: "Bengaluru, Karnataka",
  },
  {
    id: "pulse-hyd",
    isNew: true,
    name: "Pulse Fitness Studio",
    ownerName: "Rehana Fatima",
    ownerId: "pulse-owner-1",
    ownerEmail: "pulse-owner-1@fitsplit.app",
    trainerId: "pulse-trainer-1",
    trainerName: "Sandeep Kaushik",
    trainerEmail: "pulse-trainer-1@fitsplit.app",
    location: "Hyderabad, Telangana",
  },
];

const STAFF_PASSWORD = process.env.FITSPLIT_DEMO_PASSWORD || "password";

// ── Main ─────────────────────────────────────────────────────────────────

console.log("\n=== FitSplit Multi-Gym Demo Seed ===\n");

// workoutPrograms live gym-scoped (gyms/{gymId}/workoutPrograms), not root —
// verified against live data (root collection is empty; shg carries the
// predefined split_01..split_04 catalog plus custom programs). New gyms start
// with none, so we copy shg's 4 predefined splits into each new gym's own
// workoutPrograms subcollection (re-scoped gymId/createdBy) before querying
// per-gym program IDs at runtime for assignment — this keeps assignment
// driven by real, queried doc IDs rather than hardcoded guesses.
console.log("Fetching shg predefined workoutPrograms (source for new-gym catalogs)…");
const shgProgramsSnap = await db.collection("gyms/shg/workoutPrograms").get();
const PREDEFINED_SPLIT_IDS = new Set(["split_01", "split_02", "split_03", "split_04"]);
const shgPredefinedPrograms = shgProgramsSnap.docs
  .filter(d => PREDEFINED_SPLIT_IDS.has(d.id))
  .map(d => ({ id: d.id, data: d.data() }));
if (shgPredefinedPrograms.length === 0) {
  console.error("No predefined split_01..split_04 programs found under gyms/shg/workoutPrograms. Seed the program catalog first (npm run seed:demo). Stopping.");
  process.exit(1);
}
console.log(`  found ${shgPredefinedPrograms.length} predefined programs to propagate: ${shgPredefinedPrograms.map(p => p.id).join(", ")}`);

console.log("\nChecking existing shg member count…");
const shgMembersSnap = await db.collection("gyms/shg/members").get();
const existingShgIds = new Set(shgMembersSnap.docs.map(d => d.id));
console.log(`  shg currently has ${existingShgIds.size} members`);

const summary = []; // { gym, membersCreated, membersUpdated, logsWritten, authCreated }
const authOps = []; // queued Firebase Auth create/update ops, applied at the end

function queueAuthUser({ uid, email, phone, displayName, password, role, gymId, memberId }) {
  authOps.push({ uid, email, phone, displayName, password, role, gymId, memberId });
}

// ── Per-gym seed ─────────────────────────────────────────────────────────
for (const gym of GYMS) {
  console.log(`\n--- ${gym.name} (${gym.id}) ---`);
  let membersCreated = 0;
  let membersUpdated = 0;
  let logsWritten = 0;

  // 1. Gym doc
  gymSetGymDoc(gym);

  // 2. Staff: owner + trainer
  const staff = [
    { id: gym.ownerId, fullName: gym.ownerName, email: gym.ownerEmail, staffType: "owner", role: "owner" },
    { id: gym.trainerId, fullName: gym.trainerName, email: gym.trainerEmail, staffType: "trainer", role: "owner" },
  ];
  for (const s of staff) {
    const staffData = {
      id: s.id, fullName: s.fullName, email: s.email, phone: "",
      avatarInitials: initials(s.fullName),
      role: s.role, staffType: s.staffType,
      defaultGymId: gym.id, gymId: gym.id, isActive: true,
      username: s.id, authEmail: s.email, authUid: s.id, authIndexOnly: false,
      mustChangePassword: false,
      createdAt: NOW, updatedAt: NOW,
    };
    set("authProfiles", s.id, staffData);
    gymSet(gym.id, "staff", s.id, staffData);
    set("usernames", s.id, { uid: s.id, gymId: gym.id, createdAt: NOW });
    if (gym.isNew) {
      queueAuthUser({ uid: s.id, email: s.email, displayName: s.fullName, password: STAFF_PASSWORD, role: s.role, gymId: gym.id });
    }
  }

  // 3. Packages (3 per gym)
  const gymPkgIds = ["pkg-monthly", "pkg-quarterly", "pkg-pt-monthly"];
  for (const pkgId of gymPkgIds) {
    const def = PKG_DEFS[pkgId];
    gymSet(gym.id, "packages", pkgId, {
      id: pkgId, name: def.name, description: `${def.name} access at ${gym.name}.`,
      durationMonths: def.months, price: def.price, currency: "INR",
      includesPT: pkgId.includes("pt"), isActive: true, createdAt: NOW,
    });
  }

  // 3b. Propagate the predefined split_01..split_04 program catalog into new
  // gyms (shg already has it). This gives every gym a real, queryable set of
  // workoutPrograms doc IDs to assign from — no hardcoded program-ID guesses.
  if (gym.isNew) {
    for (const p of shgPredefinedPrograms) {
      gymSet(gym.id, "workoutPrograms", p.id, {
        ...p.data, gymId: gym.id, createdBy: gym.ownerId, updatedAt: NOW,
      });
    }
  }
  await flush(`${gym.id} programs/staff/packages`);
  const gymProgramsSnap = await db.collection(`gyms/${gym.id}/workoutPrograms`).get();
  const PROGRAM_IDS = gymProgramsSnap.docs.map(d => d.id);
  console.log(`  ${gym.id}: ${PROGRAM_IDS.length} programs available for assignment (${PROGRAM_IDS.join(", ")})`);

  // 4. Members — build 20 target members for this gym.
  // For shg: keep existing members (including member-mehul), fill the gap to 20.
  const targetCount = 20;
  const gymMembers = []; // { id, fullName, phone, isNew, ... }

  if (!gym.isNew) {
    // Reuse existing member IDs as-is (already fully seeded by seed-shg-full.mjs
    // / demo firestore). We only need to know how many more to add.
    const need = Math.max(0, targetCount - existingShgIds.size);
    for (let i = 0; i < need; i++) {
      gymMembers.push(makeNewMemberSpec(gym.id, i, existingShgIds.size + i, PROGRAM_IDS));
    }
    console.log(`  shg: ${existingShgIds.size} existing kept, adding ${need} new to reach ${targetCount}`);
  } else {
    for (let i = 0; i < targetCount; i++) {
      gymMembers.push(makeNewMemberSpec(gym.id, i, i, PROGRAM_IDS));
    }
  }

  // 5. Write new members + program assignments + memberships + PINs + histories
  const activeAssignable = [];
  for (const m of gymMembers) {
    const membershipStatus = membershipStatusFor(m.memberEnd);
    const memberData = {
      id: m.id, fullName: m.fullName, phone: m.phone,
      email: `${m.id}@${gym.id.replace(/[^a-z0-9]/g, "")}.local`,
      avatarInitials: initials(m.fullName),
      joinedAt: m.joinedAt, goal: m.goal, age: m.age, heightCm: m.h, weightKg: m.w,
      role: "member", defaultGymId: gym.id, gymId: gym.id,
      isActive: m.state !== "expired",
      membershipStatus, membershipEndDate: m.memberEnd?.slice(0, 10) ?? undefined,
      currentPackageName: m.pkg ? PKG_DEFS[m.pkg]?.name : undefined,
      isPT: m.state === "active_pt",
      createdAt: m.joinedAt, updatedAt: NOW,
      primarySlot: m.slot, secondarySlot: SLOTS[(SLOTS.indexOf(m.slot) + 2) % 4],
      username: m.id, authEmail: `${m.id}@members.fitsplit.app`, authUid: m.id, authIndexOnly: false,
      mustChangePassword: false,
    };
    set("authProfiles", m.id, memberData);
    gymSet(gym.id, "members", m.id, memberData);
    set("usernames", m.id, { uid: m.id, gymId: gym.id, createdAt: NOW });
    set("phones", `${gym.id}:${m.phone.replace(/\s+/g, "")}`, { uid: m.id, gymId: gym.id, createdAt: NOW });
    membersCreated++;

    queueAuthUser({
      uid: m.id, email: `${m.id}@members.fitsplit.app`, phone: m.phone.replace(/\s+/g, ""),
      displayName: m.fullName, password: `pin-${m.pin}`, role: "member", gymId: gym.id, memberId: m.id,
    });

    if (m.pkg) {
      const ms = {
        id: `mem-${m.id}`, memberId: m.id, packageId: m.pkg,
        planName: PKG_DEFS[m.pkg].name,
        startDate: m.memberEnd ? dateStr(m.pkg.includes("annual") ? 300 : m.pkg.includes("quarterly") ? 75 : 25) : dateStr(25),
        endDate: m.memberEnd?.slice(0, 10) ?? "",
        durationMonths: PKG_DEFS[m.pkg].months,
        status: membershipStatus === "expired" ? "expired" : "active",
        activatedAt: dateStr(25),
      };
      gymSet(gym.id, "memberships", ms.id, { ...ms, createdAt: ms.activatedAt, updatedAt: NOW });
    }

    if (m.plan) {
      const assignedAt = daysAgo(m.assignedDaysAgo);
      gymSet(gym.id, "programAssignments", `asgn-${m.id}`, {
        id: `asgn-${m.id}`, memberId: m.id, programId: m.plan,
        assignedAt, status: "active",
        createdBy: gym.ownerId, createdAt: assignedAt, updatedAt: NOW,
      });
      activeAssignable.push(m);
    }
  }

  // 6. Payment requests: pending for no-membership/no-plan members, approved historical for a few active ones
  const pendingCandidates = gymMembers.filter(m => m.state === "no_membership" || m.state === "no_plan").slice(0, 3);
  let prIdx = 0;
  for (const m of pendingCandidates) {
    const pkgId = m.pkg ?? "pkg-monthly";
    const def = PKG_DEFS[pkgId];
    gymSet(gym.id, "paymentRequests", `pr-pending-${m.id}`, {
      id: `pr-pending-${m.id}`, memberId: m.id, memberName: m.fullName,
      packageId: pkgId, packageName: def.name, amount: def.price, currency: "INR",
      method: ["cash", "upi", "card"][prIdx % 3], status: "pending",
      requestedAt: daysAgo(prIdx + 1), createdAt: daysAgo(prIdx + 1), updatedAt: NOW,
    });
    prIdx++;
  }
  const approvedCandidates = gymMembers.filter(m => m.pkg && m.state === "active").slice(0, 3);
  prIdx = 0;
  for (const m of approvedCandidates) {
    const def = PKG_DEFS[m.pkg];
    gymSet(gym.id, "paymentRequests", `pr-approved-${m.id}`, {
      id: `pr-approved-${m.id}`, memberId: m.id, memberName: m.fullName,
      packageId: m.pkg, packageName: def.name, amount: def.price, currency: "INR",
      method: ["upi", "cash", "card"][prIdx % 3], status: "approved",
      requestedAt: daysAgo(40 + prIdx * 2), resolvedAt: daysAgo(38 + prIdx * 2),
      resolvedByName: gym.ownerName, createdAt: daysAgo(40 + prIdx * 2), updatedAt: NOW,
    });
    prIdx++;
  }

  // 7. PT sessions for active_pt members
  const ptMembers = gymMembers.filter(m => m.state === "active_pt");
  for (const m of ptMembers) {
    const completedOffsets = [-14, -10, -7, -3];
    completedOffsets.forEach((d, i) => {
      const at = daysAgo(-d).slice(0, 10) + "T07:00:00+05:30";
      gymSet(gym.id, "ptSessions", `pt-${m.id}-${i}`, {
        id: `pt-${m.id}-${i}`, memberId: m.id, memberName: m.fullName,
        trainerId: gym.trainerId, trainerName: gym.trainerName,
        scheduledAt: at, durationMinutes: 45, status: "completed",
        notes: "Technique + progressive overload", createdAt: daysAgo(20), updatedAt: NOW,
      });
    });
    gymSet(gym.id, "ptSessions", `pt-${m.id}-next`, {
      id: `pt-${m.id}-next`, memberId: m.id, memberName: m.fullName,
      trainerId: gym.trainerId, trainerName: gym.trainerName,
      scheduledAt: daysAhead(2).slice(0, 10) + "T07:00:00+05:30",
      durationMinutes: 45, status: "scheduled", notes: "Full body strength",
      createdAt: daysAgo(1), updatedAt: NOW,
    });
  }

  // 8. Training history per active member with a plan: liftLogs, dayLogs,
  // bodyMetricLogs, macroLogs, attendanceRecords/workoutSessions, activityLogs.
  for (const m of activeAssignable) {
    if (m.state === "expired") continue; // expired members keep history from before expiry only (handled by weeks offset)
    const weeks = m.historyWeeks;
    const sessionsPerWeek = m.sessionsPerWeek;
    const totalSessions = weeks * sessionsPerWeek;
    const offsets = [];
    for (let i = 0; i < totalSessions; i++) {
      offsets.push(Math.round((i / (totalSessions - 1 || 1)) * (weeks * 7 - 1)));
    }
    const uniqueOffsets = [...new Set(offsets)].sort((a, b) => b - a); // oldest first

    const exList = pickExercisesForMember(m, EXERCISE_POOL);
    uniqueOffsets.forEach((d, i) => {
      const progress = i / Math.max(1, uniqueOffsets.length - 1);
      const dateKey = daysAgo(d).slice(0, 10);
      const loggedAt = daysAgo(d);

      // Lift logs: 2-3 exercises per session with mild progressive overload
      exList.slice(0, 3).forEach((exId, exIdx) => {
        const baseWeight = 20 + (exIdx * 10) + (m.seedIndex % 5) * 3;
        const weight = Math.round((baseWeight + progress * 15) * 2) / 2;
        gymSet(gym.id, "liftLogs", `ll-${m.id}-${exId}-${d}`, {
          id: `ll-${m.id}-${exId}-${d}`, memberId: m.id, exerciseId: exId,
          weight, sets: 3 + (exIdx === 0 ? 1 : 0), reps: exIdx === 0 ? "6" : "10",
          loggedAt, sessionId: `sess-${m.id}-${d}`, createdAt: loggedAt, updatedAt: NOW,
        });
        logsWritten++;
      });

      // Day log — deterministic ID per member/day/week
      const weekStart = getWeekStartStr(dateKey);
      gymSet(gym.id, "dayLogs", `${m.id}_day${(i % 6) + 1}_${weekStart}`, {
        id: `${m.id}_day${(i % 6) + 1}_${weekStart}`, memberId: m.id,
        date: dateKey, completed: true, loggedAt, createdAt: loggedAt, updatedAt: NOW,
      });
      logsWritten++;

      // Implicit attendance + workout session doc (id = memberId_yyyy-mm-dd)
      gymSet(gym.id, "attendanceRecords", `${m.id}_${dateKey}`, {
        id: `${m.id}_${dateKey}`, memberId: m.id, date: dateKey,
        checkInAt: loggedAt, source: "lift_log", createdAt: loggedAt, updatedAt: NOW,
      });
      gymSet(gym.id, "workoutSessions", `${m.id}_${dateKey}`, {
        id: `${m.id}_${dateKey}`, memberId: m.id, date: dateKey,
        status: "completed", startedAt: loggedAt, finishedAt: loggedAt,
        createdAt: loggedAt, updatedAt: NOW,
      });
      logsWritten += 2;

      // Macro log every other logged day
      if (i % 2 === 0) {
        const cals = 1800 + (m.seedIndex % 10) * 120;
        gymSet(gym.id, "macroLogs", `${m.id}_${dateKey}`, {
          id: `${m.id}_${dateKey}`, memberId: m.id, date: dateKey,
          calories: cals, proteinG: Math.round(cals * 0.3 / 4), carbsG: Math.round(cals * 0.45 / 4),
          fatG: Math.round(cals * 0.25 / 9), createdAt: loggedAt, updatedAt: NOW,
        });
        logsWritten++;
      }
    });

    // Body metric logs — monthly cadence across the history window
    const bodyPoints = Math.min(4, Math.max(1, Math.floor(weeks / 2)));
    for (let bp = 0; bp < bodyPoints; bp++) {
      const d = Math.round((weeks * 7) * (1 - bp / bodyPoints));
      const dateKey = daysAgo(d).slice(0, 10);
      const startW = m.w + 3 - bp * 1.2;
      gymSet(gym.id, "bodyMetricLogs", `bm-${m.id}-${dateKey}`, {
        id: `bm-${m.id}-${dateKey}`, memberId: m.id, date: dateKey,
        weightKg: Math.round(startW * 10) / 10, bodyFatPercent: Math.max(10, 24 - bp),
        loggedAt: daysAgo(d), createdAt: daysAgo(d), updatedAt: NOW,
      });
      logsWritten++;
    }

    // A couple of activity logs (cardio/stretching) for variety
    gymSet(gym.id, "activityLogs", `act-${m.id}-cardio-3`, {
      id: `act-${m.id}-cardio-3`, memberId: m.id, type: "cardio", durationMinutes: 20,
      notes: "Treadmill warm-up", loggedAt: daysAgo(3), createdAt: daysAgo(3), updatedAt: NOW,
    });
    gymSet(gym.id, "activityLogs", `act-${m.id}-stretch-1`, {
      id: `act-${m.id}-stretch-1`, memberId: m.id, type: "stretching", durationMinutes: 15,
      notes: "Full body post-workout", loggedAt: daysAgo(1), createdAt: daysAgo(1), updatedAt: NOW,
    });
    logsWritten += 2;
  }

  // 9. Owner notifications for edge-case members
  const expiring = gymMembers.filter(m => m.state === "expiring_soon");
  const expired = gymMembers.filter(m => m.state === "expired");
  const noPlan = gymMembers.filter(m => m.state === "no_plan");
  for (const m of expiring) {
    gymSet(gym.id, "notifications", `notif-${m.id}-expiring`, {
      id: `notif-${m.id}-expiring`, type: "membership_expiring_soon",
      body: `${m.fullName}'s membership expires soon.`, recipientRole: "owner",
      recipientId: gym.ownerId, createdAt: daysAgo(1), updatedAt: NOW,
    });
  }
  for (const m of expired) {
    gymSet(gym.id, "notifications", `notif-${m.id}-expired`, {
      id: `notif-${m.id}-expired`, type: "membership_expired",
      body: `${m.fullName}'s membership has expired.`, recipientRole: "owner",
      recipientId: gym.ownerId, createdAt: daysAgo(5), updatedAt: NOW,
    });
  }
  for (const m of noPlan) {
    gymSet(gym.id, "notifications", `notif-${m.id}-noplan`, {
      id: `notif-${m.id}-noplan`, type: "member_no_plan",
      body: `${m.fullName} has no workout plan assigned.`, recipientRole: "owner",
      recipientId: gym.ownerId, createdAt: daysAgo(1), updatedAt: NOW,
    });
  }
  for (const m of pendingCandidates) {
    gymSet(gym.id, "notifications", `notif-pr-${m.id}`, {
      id: `notif-pr-${m.id}`, type: "payment_request",
      body: `Payment request from ${m.fullName}.`, recipientRole: "owner",
      recipientId: gym.ownerId, createdAt: daysAgo(1), actionHref: "/owner/billing", updatedAt: NOW,
    });
  }

  await flush(`${gym.id} writes`);

  // Update gym memberCount
  await db.doc(`gyms/${gym.id}`).set({ memberCount: gym.isNew ? targetCount : existingShgIds.size + membersCreated, updatedAt: NOW }, { merge: true });

  summary.push({ gym: gym.id, membersCreated, membersUpdated, logsWritten });
}

function gymSetGymDoc(gym) {
  set("gyms", gym.id, {
    id: gym.id, name: gym.name, slug: gym.id,
    ownerName: gym.ownerName, ownerUserId: gym.ownerId, ownerId: gym.ownerId,
    status: "active", expiryWarningDays: 7, location: gym.location,
    updatedAt: NOW,
  });
}

function getWeekStartStr(dateKey) {
  const d = new Date(dateKey + "T00:00:00Z");
  const day = d.getUTCDay(); // 0 = Sun
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function pickExercisesForMember(m, pool) {
  const start = m.seedIndex % pool.length;
  return [pool[start], pool[(start + 3) % pool.length], pool[(start + 6) % pool.length]];
}

function makeNewMemberSpec(gymId, i, seedIndex, programIds) {
  const fullName = nameFor(seedIndex);
  const state = STATE_CYCLE[i % STATE_CYCLE.length];
  const slot = SLOTS[i % SLOTS.length];
  const id = `${gymId}-m-${seedIndex.toString().padStart(2, "0")}`;
  const pin = String(1000 + ((seedIndex * 37 + 7) % 9000)).padStart(4, "0");
  const goal = GOALS[seedIndex % GOALS.length];
  const age = 20 + (seedIndex * 7) % 40;
  const h = 155 + (seedIndex * 3) % 40;
  const w = 52 + (seedIndex * 5) % 45;
  const joinedDaysAgo = state === "no_membership" ? (seedIndex % 5) + 1 : 20 + (seedIndex * 11) % 260;

  let plan = null;
  let pkg = null;
  let memberEnd = null;
  let assignedDaysAgo = 10 + (seedIndex * 5) % 60;

  switch (state) {
    case "active":
    case "active_pt":
      plan = programIds[seedIndex % programIds.length];
      pkg = state === "active_pt" ? "pkg-pt-monthly" : ["pkg-monthly", "pkg-quarterly", "pkg-annual"][seedIndex % 3];
      memberEnd = aheadStr(15 + (seedIndex * 9) % 200);
      break;
    case "expiring_soon":
      plan = programIds[seedIndex % programIds.length];
      pkg = ["pkg-monthly", "pkg-quarterly"][seedIndex % 2];
      memberEnd = aheadStr(2 + (seedIndex % 10));
      break;
    case "expired":
      plan = programIds[seedIndex % programIds.length];
      pkg = ["pkg-monthly", "pkg-quarterly"][seedIndex % 2];
      memberEnd = dateStr(5 + (seedIndex % 40));
      break;
    case "no_plan":
      plan = null;
      pkg = ["pkg-monthly", "pkg-quarterly"][seedIndex % 2];
      memberEnd = aheadStr(10 + (seedIndex % 60));
      break;
    case "no_membership":
      plan = null;
      pkg = null;
      memberEnd = null;
      break;
  }

  // Vary training volume so lists/charts look organic:
  // just-joined members get almost nothing; long-tenured get more.
  const tenureWeeks = Math.max(1, Math.floor(joinedDaysAgo / 7));
  const historyWeeks = state === "no_membership" ? 0 : Math.min(6, Math.max(1, Math.min(tenureWeeks, 2 + (seedIndex % 5))));
  const sessionsPerWeek = [2, 3, 4, 5][seedIndex % 4];

  return {
    id, fullName, phone: `+91 98${(50000000 + seedIndex * 137).toString().slice(0, 7)}`,
    joinedAt: daysAgo(joinedDaysAgo), goal, age, h, w, slot, state, plan, pkg, memberEnd,
    pin, seedIndex, assignedDaysAgo, historyWeeks, sessionsPerWeek,
  };
}

// ── Firebase Auth users ──────────────────────────────────────────────────
console.log("\nCreating/updating Firebase Auth users…");
let authCreated = 0;
let authUpdated = 0;
for (const u of authOps) {
  const payload = {
    email: u.email,
    displayName: u.displayName,
    emailVerified: true,
    password: u.password,
  };
  if (u.phone) payload.phoneNumber = u.phone.startsWith("+") ? u.phone : `+${u.phone}`;
  try {
    await auth.updateUser(u.uid, payload);
    authUpdated++;
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      console.warn(`  auth error for ${u.uid}: ${error.message}`);
      continue;
    }
    try {
      await auth.createUser({ uid: u.uid, ...payload });
      authCreated++;
    } catch (createError) {
      console.warn(`  could not create auth user ${u.uid}: ${createError.message}`);
      continue;
    }
  }
  await auth.setCustomUserClaims(u.uid, {
    gymId: u.gymId, role: u.role, memberId: u.role === "member" ? u.uid : undefined,
  });
}
console.log(`  auth users created: ${authCreated}, updated: ${authUpdated}`);

// ── Summary ──────────────────────────────────────────────────────────────
console.log("\n=== Seed Summary ===\n");
console.log("gym            members  logsWritten");
for (const row of summary) {
  console.log(`${row.gym.padEnd(15)}${String(row.membersCreated).padEnd(9)}${row.logsWritten}`);
}
console.log(`\nTotal Firebase Auth ops: created ${authCreated}, updated ${authUpdated}`);
console.log("\n=== Done ===\n");
process.exit(0);
