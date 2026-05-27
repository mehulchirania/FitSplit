/**
 * seed-lift-logs.mjs
 * Clears all lift logs for member-mehul and seeds 4 weeks of
 * split_04 (6-day programme) workout history with progressive overload.
 *
 * Run:  node scripts/seed-lift-logs.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require(
  "C:/Users/mehul/Documents/Codex/2026-05-03/FireBaseKeys/fitsplit-29215-firebase-adminsdk-fbsvc-91bb9ca45d.json"
);

initializeApp({ credential: cert(serviceAccount), projectId: "fitsplit-29215" });
const db = getFirestore();

const MEMBER_ID = "member-mehul";
const GYM_ID    = "shg";
const COLLECTION = `gyms/${GYM_ID}/liftLogs`;

// ─── split_04 exercise templates ─────────────────────────────────────────────
// Keys match real Firestore exerciseIds confirmed from the program doc.
// baseWeight in kg, weeklyIncrease in kg per week (0 = bodyweight/flat)

// Day 1 — Chest & Triceps 1
const D1 = [
  { exerciseId: "ch_01",                                   baseWeight: 70,  sets: 4, reps: "5",  weeklyIncrease: 2.5 },  // Barbell Bench Press
  { exerciseId: "efee6382-6ee5-487a-a746-20c89cd99198",    baseWeight: 40,  sets: 3, reps: "12", weeklyIncrease: 2.5 },  // Pec Deck Fly (canonical UUID)
  { exerciseId: "tr_01",                                   baseWeight: 25,  sets: 3, reps: "12", weeklyIncrease: 2.5 },  // Tricep Pushdown (Straight Bar)
];

// Day 2 — Back & Biceps 1
const D2 = [
  { exerciseId: "f17b8521-f7d5-428d-b9d0-2c5ecee1aee2",   baseWeight: 60,  sets: 4, reps: "6",  weeklyIncrease: 2.5 },  // Barbell Row (canonical UUID)
  { exerciseId: "bk_03",                                   baseWeight: 55,  sets: 4, reps: "10", weeklyIncrease: 2.5 },  // Lat Pulldown
  { exerciseId: "bi_01",                                   baseWeight: 35,  sets: 3, reps: "10", weeklyIncrease: 2.5 },  // Barbell Curl
];

// Day 3 — Legs & Shoulders 1
const D3 = [
  { exerciseId: "lg_01", baseWeight: 80,  sets: 4, reps: "6",  weeklyIncrease: 5   },  // Barbell Squat
  { exerciseId: "sh_01", baseWeight: 50,  sets: 3, reps: "8",  weeklyIncrease: 2.5 },  // Overhead Press
  { exerciseId: "sh_02", baseWeight: 10,  sets: 3, reps: "15", weeklyIncrease: 1   },  // Dumbbell Lateral Raise
];

// Day 4 — Chest & Triceps 2
const D4 = [
  { exerciseId: "ch_02", baseWeight: 30,  sets: 3, reps: "10", weeklyIncrease: 2.5 },  // Incline Dumbbell Press
  { exerciseId: "ch_04", baseWeight: 15,  sets: 3, reps: "12", weeklyIncrease: 2.5 },  // Cable Crossover
  { exerciseId: "tr_02", baseWeight: 20,  sets: 3, reps: "12", weeklyIncrease: 2.5 },  // Overhead Tricep Extension
];

// Day 5 — Back & Biceps 2
const D5 = [
  { exerciseId: "bk_01",                                   baseWeight: 0,   sets: 3, reps: "8",  weeklyIncrease: 0   },  // Pull-Ups (bodyweight)
  { exerciseId: "bk_04",                                   baseWeight: 50,  sets: 3, reps: "12", weeklyIncrease: 2.5 },  // Seated Cable Row
  { exerciseId: "ec5320ce-8770-4ca7-811d-2b77bbd770b8",   baseWeight: 14,  sets: 3, reps: "12", weeklyIncrease: 1   },  // Hammer Curl (canonical UUID)
];

// Day 6 — Legs & Shoulders 2
const D6 = [
  { exerciseId: "lg_03", baseWeight: 120, sets: 4, reps: "10", weeklyIncrease: 10  },  // Leg Press
  { exerciseId: "lg_02", baseWeight: 70,  sets: 4, reps: "8",  weeklyIncrease: 5   },  // Romanian Deadlift
  { exerciseId: "sh_02", baseWeight: 10,  sets: 3, reps: "15", weeklyIncrease: 1   },  // Dumbbell Lateral Raise
];

// Week pattern: Mon–Sat training, Sun rest
const WEEK_PATTERN = [D1, D2, D3, D4, D5, D6, null];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roundWeight(w) {
  return Math.round(w * 2) / 2; // nearest 0.5 kg
}

function isoAt(date, hour) {
  const d = new Date(date);
  d.setHours(hour, Math.floor(Math.random() * 45) + 5, 0, 0);
  return d.toISOString();
}

// ─── Build log entries ────────────────────────────────────────────────────────
function buildLogs() {
  const logs = [];
  // 4 weeks back from today (2026-05-27). Mon Apr 28 = start.
  const startDate = new Date("2026-04-28");

  for (let week = 0; week < 4; week++) {
    for (let dow = 0; dow < 7; dow++) {
      const template = WEEK_PATTERN[dow];
      if (!template) continue; // Sunday rest

      const date = new Date(startDate);
      date.setDate(date.getDate() + week * 7 + dow);
      const dateStr = date.toISOString().slice(0, 10);
      if (dateStr > "2026-05-27") continue; // no future entries

      const sessionId = `seed-${dateStr}`;
      // Stagger hours so same-date logs have distinct loggedAt timestamps
      let hour = 7 + Math.floor(Math.random() * 2); // 7 or 8 AM

      for (const ex of template) {
        const weight = roundWeight(ex.baseWeight + ex.weeklyIncrease * week);
        logs.push({
          memberId:   MEMBER_ID,
          gymId:      GYM_ID,
          exerciseId: ex.exerciseId,
          weight,
          sets:       ex.sets,
          reps:       ex.reps,
          sessionId,
          loggedAt:   isoAt(date, hour),
        });
        hour += 1; // space out timestamps within the session
      }
    }
  }

  return logs;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🗑  Deleting existing lift logs for member-mehul …");
  let deleted = 0;
  while (true) {
    const snap = await db.collection(COLLECTION)
      .where("memberId", "==", MEMBER_ID).limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.docs.length;
    process.stdout.write(`  deleted ${deleted} …\r`);
  }
  console.log(`\n✅ Deleted ${deleted} existing log(s).`);

  const logs = buildLogs();
  console.log(`\n📝 Writing ${logs.length} new lift log entries …`);
  for (let i = 0; i < logs.length; i += 400) {
    const chunk = logs.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach(log => batch.set(db.collection(COLLECTION).doc(), log));
    await batch.commit();
    process.stdout.write(`  written ${Math.min(i + 400, logs.length)}/${logs.length} …\r`);
  }

  const exerciseIds = [...new Set(logs.map(l => l.exerciseId))];
  console.log(`\n✅ Done! Seeded ${logs.length} entries across 24 training days.`);
  console.log(`   Exercises: ${exerciseIds.join(", ")}`);
  console.log(`   Muscle groups: Chest, Triceps, Back, Biceps, Legs, Shoulders`);
  process.exit(0);
}

main().catch(err => { console.error("❌ Seed failed:", err); process.exit(1); });
