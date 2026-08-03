/**
 * test-firestore-rules.mjs
 * Firestore security rule tests for Phase 2 — Multi-Gym, Trainer, PT, Billing.
 *
 * Requires the Firestore emulator to be running:
 *   firebase emulators:start --only firestore
 *
 * Run: npm run test:rules
 *
 * Scenarios covered:
 *  1. Admin can read/write any gym.
 *  2. Owner can read/update own gym; cannot read another gym.
 *  3. Trainer can read members in own gym; cannot access packages/billing.
 *  4. Member can read own member doc; cannot read another member.
 *  5. Unauthenticated user cannot read any gym data.
 *  6. Owner can create packages; trainer cannot.
 *  7. Owner can read payment requests; trainer cannot.
 *  8. Member can read own payment request; cannot read others'.
 *  9. Owner can read summaries; trainer cannot.
 * 10. PT session: trainer can read/write; member can only read own session.
 * 11. Root-level tenant isolation: root exerciseRequests are gym-scoped (no cross-tenant
 *     read/create); root macroLogs/activityLogs/memberships enforce member-self + gym scope.
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, "../firestore.rules");

const GYM_A = "gym-alpha";
const GYM_B = "gym-beta";
const OWNER_A = "owner-alpha";
const OWNER_B = "owner-beta";
const TRAINER_A = "trainer-alpha";
const MEMBER_A = "member-alpha";
const MEMBER_B = "member-beta";

let testEnv;

// Returns the custom-claim token options for authenticatedContext(userId, options).
// The user id / `sub` claim comes from the first arg to authenticatedContext, so `uid`
// must NOT appear here (newer @firebase/rules-unit-testing rejects a `uid` claim).
function makeAuth(_uid, role, gymId, memberId) {
  return { role, gymId, ...(memberId ? { memberId } : {}) };
}

async function setup() {
  testEnv = await initializeTestEnvironment({
    projectId: "fitsplit-rules-test",
    firestore: {
      rules: readFileSync(RULES_PATH, "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });

  // Seed minimal Firestore data via admin context (bypasses rules).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    // Gym docs.
    await db.doc(`gyms/${GYM_A}`).set({ name: "Gym Alpha", status: "active", ownerId: OWNER_A, trainerMemberVisibility: "assigned_only" });
    await db.doc(`gyms/${GYM_B}`).set({ name: "Gym Beta", status: "active", ownerId: OWNER_B });

    // Members.
    await db.doc(`gyms/${GYM_A}/members/${MEMBER_A}`).set({ gymId: GYM_A, memberId: MEMBER_A, fullName: "Alice", role: "member", isPT: false });
    await db.doc(`gyms/${GYM_A}/members/${MEMBER_B}`).set({ gymId: GYM_A, memberId: MEMBER_B, fullName: "Bob", role: "member", isPT: true, assignedTrainerId: TRAINER_A });

    // Staff.
    await db.doc(`gyms/${GYM_A}/staff/${OWNER_A}`).set({ role: "owner", defaultGymId: GYM_A });
    await db.doc(`gyms/${GYM_A}/staff/${TRAINER_A}`).set({ role: "trainer", defaultGymId: GYM_A, staffType: "trainer" });

    // Packages / payments / summaries.
    await db.doc(`gyms/${GYM_A}/packages/pkg-01`).set({ gymId: GYM_A, name: "Monthly", price: 1000, isActive: true });
    await db.doc(`gyms/${GYM_A}/paymentRequests/req-01`).set({ gymId: GYM_A, memberId: MEMBER_A, status: "pending", amount: 1000 });
    await db.doc(`gyms/${GYM_A}/summaries/dashboard`).set({ gymId: GYM_A, totalMembers: 2, lastComputedAt: new Date().toISOString() });

    // PT session.
    await db.doc(`gyms/${GYM_A}/ptSessions/sess-01`).set({ gymId: GYM_A, memberId: MEMBER_A, trainerId: TRAINER_A, status: "scheduled" });

    // Root mirrors (dual-write) used by the root-level rule tests below.
    await db.doc(`exerciseRequests/exreq-01`).set({ gymId: GYM_A, requestedBy: MEMBER_A, name: "Hack Squat", status: "pending" });
    await db.doc(`macroLogs/macro-01`).set({ gymId: GYM_A, memberId: MEMBER_A, date: "2026-06-05", calories: 2200 });
    await db.doc(`activityLogs/act-01`).set({ gymId: GYM_A, memberId: MEMBER_A, type: "cardio", durationMin: 30 });
    await db.doc(`memberships/mem-01`).set({ gymId: GYM_A, memberId: MEMBER_A, status: "active", endDate: "2026-12-31" });

    // Coach messages (member ↔ trainer thread), gym-scoped + root mirror.
    const coachMsg = {
      gymId: GYM_A,
      memberId: MEMBER_A,
      body: "How did the squat session feel?",
      senderRole: "trainer",
      senderId: TRAINER_A,
      createdAt: new Date().toISOString()
    };
    await db.doc(`gyms/${GYM_A}/coachMessages/msg-01`).set(coachMsg);
    await db.doc(`coachMessages/msg-01`).set(coachMsg);

    // Exercise swaps (member's substitutions for one program day).
    const swapDoc = {
      gymId: GYM_A,
      memberId: MEMBER_A,
      programId: "prog-01",
      dayId: "day-01",
      swaps: { "0": "exercise-alt-1" },
      updatedAt: new Date().toISOString()
    };
    await db.doc(`gyms/${GYM_A}/exerciseSwaps/${MEMBER_A}_day-01`).set(swapDoc);
    await db.doc(`exerciseSwaps/${MEMBER_A}_day-01`).set(swapDoc);

    // authProfiles.
    await db.doc(`authProfiles/${OWNER_A}`).set({ role: "owner", defaultGymId: GYM_A, fullName: "Owner Alpha" });
    await db.doc(`authProfiles/${TRAINER_A}`).set({ role: "trainer", defaultGymId: GYM_A, fullName: "Trainer Alpha" });
    await db.doc(`authProfiles/${MEMBER_A}`).set({ role: "member", defaultGymId: GYM_A, gymId: GYM_A, fullName: "Alice" });
    await db.doc(`authProfiles/${MEMBER_B}`).set({ role: "member", defaultGymId: GYM_A, gymId: GYM_A, fullName: "Bob" });
  });
}

async function teardown() {
  await testEnv.cleanup();
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function it(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message ?? err}`);
    failed++;
  }
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

async function runTests() {
  console.log("\n── Gym doc access ────────────────────────────────────────");

  await it("Admin can read any gym", async () => {
    const db = testEnv.authenticatedContext("admin-user", makeAuth("admin-user", "admin", "")).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}`).get());
    await assertSucceeds(db.doc(`gyms/${GYM_B}`).get());
  });

  await it("Owner can read own gym", async () => {
    const db = testEnv.authenticatedContext(OWNER_A, makeAuth(OWNER_A, "owner", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}`).get());
  });

  await it("Owner cannot read another gym", async () => {
    const db = testEnv.authenticatedContext(OWNER_B, makeAuth(OWNER_B, "owner", GYM_B)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}`).get());
  });

  await it("Unauthenticated user cannot read any gym", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.doc(`gyms/${GYM_A}`).get());
  });

  console.log("\n── Member access ─────────────────────────────────────────");

  await it("Owner can read members in own gym", async () => {
    const db = testEnv.authenticatedContext(OWNER_A, makeAuth(OWNER_A, "owner", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/members/${MEMBER_A}`).get());
  });

  await it("Trainer can read members in own gym", async () => {
    const db = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/members/${MEMBER_A}`).get());
  });

  await it("Member can read own member doc", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/members/${MEMBER_A}`).get());
  });

  await it("Member cannot read another member doc", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/members/${MEMBER_B}`).get());
  });

  await it("Owner from different gym cannot read members", async () => {
    const db = testEnv.authenticatedContext(OWNER_B, makeAuth(OWNER_B, "owner", GYM_B)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/members/${MEMBER_A}`).get());
  });

  console.log("\n── Packages (billing) access ─────────────────────────────");

  await it("Owner can read packages in own gym", async () => {
    const db = testEnv.authenticatedContext(OWNER_A, makeAuth(OWNER_A, "owner", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/packages/pkg-01`).get());
  });

  await it("Member can read packages in own gym", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/packages/pkg-01`).get());
  });

  await it("Trainer CANNOT read packages (billing blocked)", async () => {
    const db = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/packages/pkg-01`).get());
  });

  await it("Owner can create a package", async () => {
    const db = testEnv.authenticatedContext(OWNER_A, makeAuth(OWNER_A, "owner", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/packages/pkg-new`).set({ gymId: GYM_A, name: "Annual", price: 5000, isActive: true }));
  });

  await it("Trainer CANNOT create a package", async () => {
    const db = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/packages/pkg-trainer`).set({ gymId: GYM_A, name: "Trainer Pack", price: 500, isActive: true }));
  });

  console.log("\n── Payment requests access ───────────────────────────────");

  await it("Owner can read payment requests", async () => {
    const db = testEnv.authenticatedContext(OWNER_A, makeAuth(OWNER_A, "owner", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/paymentRequests/req-01`).get());
  });

  await it("Trainer CANNOT read payment requests", async () => {
    const db = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/paymentRequests/req-01`).get());
  });

  await it("Member can read own payment request", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/paymentRequests/req-01`).get());
  });

  await it("Member CANNOT read another member's payment request", async () => {
    const db = testEnv.authenticatedContext(MEMBER_B, makeAuth(MEMBER_B, "member", GYM_A, MEMBER_B)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/paymentRequests/req-01`).get());
  });

  console.log("\n── Dashboard summaries access ────────────────────────────");

  await it("Owner can read summaries", async () => {
    const db = testEnv.authenticatedContext(OWNER_A, makeAuth(OWNER_A, "owner", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/summaries/dashboard`).get());
  });

  await it("Trainer CANNOT read summaries", async () => {
    const db = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/summaries/dashboard`).get());
  });

  await it("Member CANNOT read summaries", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/summaries/dashboard`).get());
  });

  await it("Owner CANNOT write summaries (privileged/Functions only)", async () => {
    const db = testEnv.authenticatedContext(OWNER_A, makeAuth(OWNER_A, "owner", GYM_A)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/summaries/dashboard`).set({ gymId: GYM_A, totalMembers: 99 }));
  });

  console.log("\n── PT sessions access ────────────────────────────────────");

  await it("Trainer can read PT sessions in own gym", async () => {
    const db = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/ptSessions/sess-01`).get());
  });

  await it("Member can read own PT session", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/ptSessions/sess-01`).get());
  });

  await it("Member CANNOT delete PT session (owner-only delete)", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/ptSessions/sess-01`).delete());
  });

  await it("Trainer can update PT session (cover trainer support)", async () => {
    const db = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/ptSessions/sess-01`).update({ status: "active" }));
  });

  console.log("\n── Root-level tenant isolation (RLS hardening) ───────────");

  await it("Owner can read root exerciseRequest in own gym", async () => {
    const db = testEnv.authenticatedContext(OWNER_A, makeAuth(OWNER_A, "owner", GYM_A)).firestore();
    await assertSucceeds(db.doc(`exerciseRequests/exreq-01`).get());
  });

  await it("Owner from another gym CANNOT read root exerciseRequest (was a cross-tenant leak)", async () => {
    const db = testEnv.authenticatedContext(OWNER_B, makeAuth(OWNER_B, "owner", GYM_B)).firestore();
    await assertFails(db.doc(`exerciseRequests/exreq-01`).get());
  });

  await it("User from another gym CANNOT create a root exerciseRequest for someone else's gym", async () => {
    const db = testEnv.authenticatedContext(OWNER_B, makeAuth(OWNER_B, "owner", GYM_B)).firestore();
    await assertFails(db.doc(`exerciseRequests/exreq-spoof`).set({ gymId: GYM_A, name: "Spoofed", status: "pending" }));
  });

  await it("Member can read own root macroLog", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`macroLogs/macro-01`).get());
  });

  await it("Member CANNOT read another member's root macroLog", async () => {
    const db = testEnv.authenticatedContext(MEMBER_B, makeAuth(MEMBER_B, "member", GYM_A, MEMBER_B)).firestore();
    await assertFails(db.doc(`macroLogs/macro-01`).get());
  });

  await it("Member can read own root activityLog", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`activityLogs/act-01`).get());
  });

  await it("Member can read own root membership; trainer cannot", async () => {
    const memberDb = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(memberDb.doc(`memberships/mem-01`).get());
    const trainerDb = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertFails(trainerDb.doc(`memberships/mem-01`).get());
  });

  await it("Member CANNOT write root membership (privileged/Functions only)", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertFails(db.doc(`memberships/mem-01`).update({ status: "cancelled" }));
  });

  console.log("\n── Coach messages (private member ↔ trainer thread) ──────");

  await it("Member can read own coach thread", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/coachMessages/msg-01`).get());
  });

  await it("Member CANNOT read another member's coach thread", async () => {
    const db = testEnv.authenticatedContext(MEMBER_B, makeAuth(MEMBER_B, "member", GYM_A, MEMBER_B)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/coachMessages/msg-01`).get());
    await assertFails(db.doc(`coachMessages/msg-01`).get());
  });

  await it("Trainer in the gym can read the thread", async () => {
    const db = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/coachMessages/msg-01`).get());
  });

  await it("Owner of ANOTHER gym CANNOT read the thread (cross-tenant)", async () => {
    const db = testEnv.authenticatedContext(OWNER_B, makeAuth(OWNER_B, "owner", GYM_B)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/coachMessages/msg-01`).get());
    await assertFails(db.doc(`coachMessages/msg-01`).get());
  });

  await it("Member can send a message as themselves", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/coachMessages/msg-new`).set({
      gymId: GYM_A, memberId: MEMBER_A, body: "Felt strong, thanks!",
      senderRole: "member", senderId: MEMBER_A, createdAt: new Date().toISOString()
    }));
  });

  await it("Member CANNOT forge a message as the trainer", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/coachMessages/msg-forge`).set({
      gymId: GYM_A, memberId: MEMBER_A, body: "Skip leg day, coach says so",
      senderRole: "trainer", senderId: TRAINER_A, createdAt: new Date().toISOString()
    }));
  });

  await it("Member CANNOT write into another member's thread", async () => {
    const db = testEnv.authenticatedContext(MEMBER_B, makeAuth(MEMBER_B, "member", GYM_A, MEMBER_B)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/coachMessages/msg-x`).set({
      gymId: GYM_A, memberId: MEMBER_A, body: "not mine",
      senderRole: "member", senderId: MEMBER_B, createdAt: new Date().toISOString()
    }));
  });

  await it("Member can mark read, but CANNOT edit message body", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/coachMessages/msg-01`).update({ readAt: new Date().toISOString() }));
    await assertFails(db.doc(`gyms/${GYM_A}/coachMessages/msg-01`).update({ body: "rewritten history" }));
  });

  await it("Nobody can delete a coach message (audit trail)", async () => {
    const memberDb = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertFails(memberDb.doc(`gyms/${GYM_A}/coachMessages/msg-01`).delete());
    const trainerDb = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertFails(trainerDb.doc(`gyms/${GYM_A}/coachMessages/msg-01`).delete());
  });

  await it("Unauthenticated user CANNOT read a coach thread", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/coachMessages/msg-01`).get());
    await assertFails(db.doc(`coachMessages/msg-01`).get());
  });

  console.log("\n── Exercise swaps (member substitutions, trainer-visible) ─");

  await it("Member can read own exercise swaps", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/exerciseSwaps/${MEMBER_A}_day-01`).get());
  });

  await it("Trainer in the gym can read a member's swaps", async () => {
    const db = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/exerciseSwaps/${MEMBER_A}_day-01`).get());
  });

  await it("Member CANNOT read another member's swaps", async () => {
    const db = testEnv.authenticatedContext(MEMBER_B, makeAuth(MEMBER_B, "member", GYM_A, MEMBER_B)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/exerciseSwaps/${MEMBER_A}_day-01`).get());
  });

  await it("Owner of ANOTHER gym CANNOT read the swaps (cross-tenant)", async () => {
    const db = testEnv.authenticatedContext(OWNER_B, makeAuth(OWNER_B, "owner", GYM_B)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/exerciseSwaps/${MEMBER_A}_day-01`).get());
  });

  await it("Member can save their own swap for a new day (create)", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/exerciseSwaps/${MEMBER_A}_day-02`).set({
      gymId: GYM_A, memberId: MEMBER_A, programId: "prog-01", dayId: "day-02",
      swaps: { "1": "exercise-alt-2" }, updatedAt: new Date().toISOString()
    }));
  });

  await it("Member can update their own swap doc", async () => {
    const db = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertSucceeds(db.doc(`gyms/${GYM_A}/exerciseSwaps/${MEMBER_A}_day-01`).set({
      gymId: GYM_A, memberId: MEMBER_A, programId: "prog-01", dayId: "day-01",
      swaps: {}, updatedAt: new Date().toISOString()
    }, { merge: true }));
  });

  await it("Trainer CANNOT write a member's swap doc", async () => {
    const db = testEnv.authenticatedContext(TRAINER_A, makeAuth(TRAINER_A, "trainer", GYM_A)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/exerciseSwaps/${MEMBER_A}_day-01`).set({
      gymId: GYM_A, memberId: MEMBER_A, programId: "prog-01", dayId: "day-01",
      swaps: { "0": "trainer-forced-swap" }, updatedAt: new Date().toISOString()
    }, { merge: true }));
  });

  await it("Member CANNOT write into another member's swap doc", async () => {
    const db = testEnv.authenticatedContext(MEMBER_B, makeAuth(MEMBER_B, "member", GYM_A, MEMBER_B)).firestore();
    await assertFails(db.doc(`gyms/${GYM_A}/exerciseSwaps/${MEMBER_A}_day-03`).set({
      gymId: GYM_A, memberId: MEMBER_A, programId: "prog-01", dayId: "day-03",
      swaps: { "0": "not-mine" }, updatedAt: new Date().toISOString()
    }));
  });

  await it("Nobody can delete an exercise swap doc", async () => {
    const memberDb = testEnv.authenticatedContext(MEMBER_A, makeAuth(MEMBER_A, "member", GYM_A, MEMBER_A)).firestore();
    await assertFails(memberDb.doc(`gyms/${GYM_A}/exerciseSwaps/${MEMBER_A}_day-01`).delete());
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  try {
    console.log("🔒 FitSplit Firestore Rules Tests\n");
    console.log("   Make sure the Firestore emulator is running:");
    console.log("   firebase emulators:start --only firestore\n");

    await setup();
    await runTests();
  } finally {
    await teardown();
    console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
    if (failed > 0) process.exit(1);
    else process.exit(0);
  }
})();
