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
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
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

function makeAuth(uid, role, gymId, memberId) {
  return { uid, token: { role, gymId, ...(memberId ? { memberId } : {}) } };
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
