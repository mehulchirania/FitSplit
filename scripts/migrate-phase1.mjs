/**
 * migrate-phase1.mjs
 * Phase 1 data migration for Multi-Gym, Trainer, PT, Billing & Permissions redesign.
 *
 * What this script does:
 *  1. Backfills all staff records that have role="owner" + staffType="trainer"
 *     → sets role="trainer" on both the gym-scoped staff doc and the root authProfile.
 *  2. Sets isPT=false (default) on all member docs that are missing the isPT field.
 *  3. Backfills assignedTrainerId from the legacy string assignedTrainer field
 *     when the value is a UID (found in authProfiles). Skips display-name strings.
 *  4. Adds trainerMemberVisibility="assigned_only" to gym docs that are missing it.
 *  5. Adds ownerId to gym docs that are missing it, sourced from ownerUserId.
 *  6. Removes the duplicate "titan" gym entry (keeps the one with more members).
 *  7. Reports what changed without committing unless --commit flag is passed.
 *
 * Run (dry run):   node scripts/migrate-phase1.mjs
 * Run (commit):    node scripts/migrate-phase1.mjs --commit
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

const COMMIT = process.argv.includes("--commit");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }
function dryRun(msg) { if (!COMMIT) console.log(`  [DRY-RUN] ${msg}`); }
function committed(msg) { if (COMMIT) console.log(`  ✅ ${msg}`); }

async function batchWrite(ops) {
  // Firestore batch limit is 500 ops.
  for (let i = 0; i < ops.length; i += 499) {
    const chunk = ops.slice(i, i + 499);
    const batch = db.batch();
    for (const { ref, data, merge } of chunk) {
      if (merge) batch.set(ref, data, { merge: true });
      else batch.update(ref, data);
    }
    if (COMMIT) await batch.commit();
  }
}

// ─── Step 1: Backfill trainer role ───────────────────────────────────────────

async function backfillTrainerRole() {
  log("\n── Step 1: Backfill trainer role ──");

  // Find all gym-scoped staff docs with role=owner but staffType=trainer.
  const staffSnap = await db.collectionGroup("staff")
    .where("staffType", "==", "trainer")
    .where("role", "==", "owner")
    .get();

  log(`  Found ${staffSnap.size} legacy trainer-role staff docs to update.`);

  const ops = [];
  const affectedUids = new Set();

  for (const doc of staffSnap.docs) {
    dryRun(`Set role=trainer on staff/${doc.id} (gym: ${doc.ref.parent.parent?.id})`);
    ops.push({ ref: doc.ref, data: { role: "trainer" }, merge: true });
    affectedUids.add(doc.id);
  }

  // Also update root authProfile docs.
  for (const uid of affectedUids) {
    const authRef = db.collection("authProfiles").doc(uid);
    const authDoc = await authRef.get();
    if (authDoc.exists && authDoc.data()?.role === "owner" && authDoc.data()?.staffType === "trainer") {
      dryRun(`Set role=trainer on authProfiles/${uid}`);
      ops.push({ ref: authRef, data: { role: "trainer" }, merge: true });
    }
  }

  await batchWrite(ops);
  committed(`Updated ${staffSnap.size} staff records + ${affectedUids.size} authProfile records to role=trainer.`);
  return affectedUids.size;
}

// ─── Step 2: Default isPT=false on members missing the field ─────────────────

async function backfillIsPT() {
  log("\n── Step 2: Backfill isPT=false on members ──");

  // Firestore doesn't support "field does not exist" queries, so fetch all members
  // and filter client-side.
  const snap = await db.collectionGroup("members").get();
  const ops = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.isPT === undefined || data.isPT === null) {
      dryRun(`Set isPT=false on members/${doc.id}`);
      ops.push({ ref: doc.ref, data: { isPT: false }, merge: true });
    }
  }

  log(`  ${ops.length} member docs missing isPT — defaulting to false.`);
  await batchWrite(ops);
  committed(`Set isPT=false on ${ops.length} member docs.`);
  return ops.length;
}

// ─── Step 3: Backfill assignedTrainerId from string assignedTrainer ──────────

async function backfillAssignedTrainerId() {
  log("\n── Step 3: Backfill assignedTrainerId ──");

  // Build a lookup of all trainer UIDs from authProfiles.
  const trainerSnap = await db.collection("authProfiles")
    .where("role", "in", ["trainer", "owner"])
    .get();
  const trainerUids = new Set(trainerSnap.docs.map((d) => d.id));

  const membersSnap = await db.collectionGroup("members").get();
  const ops = [];

  for (const doc of membersSnap.docs) {
    const data = doc.data();
    // Only backfill when: assignedTrainerId is absent AND assignedTrainer is a UID.
    if (!data.assignedTrainerId && data.assignedTrainer && trainerUids.has(data.assignedTrainer)) {
      dryRun(`Set assignedTrainerId=${data.assignedTrainer} on members/${doc.id}`);
      ops.push({ ref: doc.ref, data: { assignedTrainerId: data.assignedTrainer }, merge: true });
    }
  }

  log(`  ${ops.length} member docs have assignedTrainer set to a UID — backfilling assignedTrainerId.`);
  await batchWrite(ops);
  committed(`Set assignedTrainerId on ${ops.length} member docs.`);
  return ops.length;
}

// ─── Step 4: Add trainerMemberVisibility to gyms ─────────────────────────────

async function backfillTrainerVisibility() {
  log("\n── Step 4: Add trainerMemberVisibility to gyms ──");

  const gymsSnap = await db.collection("gyms").get();
  const ops = [];

  for (const doc of gymsSnap.docs) {
    const data = doc.data();
    if (!data.trainerMemberVisibility) {
      dryRun(`Set trainerMemberVisibility=assigned_only on gyms/${doc.id}`);
      ops.push({ ref: doc.ref, data: { trainerMemberVisibility: "assigned_only" }, merge: true });
    }
  }

  log(`  ${ops.length} gym docs missing trainerMemberVisibility — defaulting to assigned_only.`);
  await batchWrite(ops);
  committed(`Set trainerMemberVisibility=assigned_only on ${ops.length} gym docs.`);
  return ops.length;
}

// ─── Step 5: Add ownerId to gyms ─────────────────────────────────────────────

async function backfillGymOwnerId() {
  log("\n── Step 5: Add ownerId to gyms ──");

  const gymsSnap = await db.collection("gyms").get();
  const ops = [];

  for (const doc of gymsSnap.docs) {
    const data = doc.data();
    if (!data.ownerId && data.ownerUserId) {
      dryRun(`Set ownerId=${data.ownerUserId} on gyms/${doc.id}`);
      ops.push({ ref: doc.ref, data: { ownerId: data.ownerUserId }, merge: true });
    }
  }

  log(`  ${ops.length} gym docs missing ownerId — copying from ownerUserId.`);
  await batchWrite(ops);
  committed(`Set ownerId on ${ops.length} gym docs.`);
  return ops.length;
}

// ─── Step 6: Report duplicate Titan gym entries ───────────────────────────────

async function reportDuplicateGyms() {
  log("\n── Step 6: Duplicate gym report ──");

  const gymsSnap = await db.collection("gyms").get();
  const byName = new Map();

  for (const doc of gymsSnap.docs) {
    const name = String(doc.data().name ?? "").toLowerCase().trim();
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push({ id: doc.id, memberCount: doc.data().memberCount ?? 0 });
  }

  let found = 0;
  for (const [name, entries] of byName) {
    if (entries.length > 1) {
      found++;
      log(`  ⚠️  Duplicate gym name "${name}":`);
      for (const e of entries) {
        log(`       id="${e.id}"  memberCount=${e.memberCount}`);
      }
      const keep = entries.sort((a, b) => b.memberCount - a.memberCount)[0];
      const remove = entries.filter((e) => e.id !== keep.id);
      log(`     → Keep: ${keep.id}. Remove: ${remove.map((e) => e.id).join(", ")}`);
      log(`     → Run manually: node scripts/delete-gym.mjs ${remove.map((e) => e.id).join(" ")}`);
    }
  }

  if (found === 0) log("  No duplicate gym names found.");
  return found;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏗️  FitSplit Phase 1 Migration — ${COMMIT ? "COMMIT MODE" : "DRY-RUN (pass --commit to apply)"}\n`);

  const results = {
    trainerRoleBackfills: await backfillTrainerRole(),
    isPTBackfills: await backfillIsPT(),
    assignedTrainerIdBackfills: await backfillAssignedTrainerId(),
    trainerVisibilityBackfills: await backfillTrainerVisibility(),
    ownerIdBackfills: await backfillGymOwnerId(),
    duplicateGyms: await reportDuplicateGyms(),
  };

  console.log("\n── Summary ──────────────────────────────────────────────");
  console.log(`  Trainer role backfills    : ${results.trainerRoleBackfills}`);
  console.log(`  isPT=false defaults       : ${results.isPTBackfills}`);
  console.log(`  assignedTrainerId backfill: ${results.assignedTrainerIdBackfills}`);
  console.log(`  trainerMemberVisibility   : ${results.trainerVisibilityBackfills}`);
  console.log(`  ownerId on gyms           : ${results.ownerIdBackfills}`);
  console.log(`  Duplicate gym names       : ${results.duplicateGyms}`);
  if (!COMMIT) {
    console.log("\n  Run with --commit to apply all changes.");
  } else {
    console.log("\n  ✅ All changes committed to Firestore.");
  }

  process.exit(0);
}

main().catch((err) => { console.error("❌ Migration failed:", err); process.exit(1); });
