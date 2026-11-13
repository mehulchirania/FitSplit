/**
 * test-firestore-rules.mjs
 * Firestore security rule tests.
 *
 * Requires the Firestore emulator to be running:
 *   firebase emulators:start --only firestore
 *
 * Run: npm run test:rules
 *
 * Scenarios covered:
 *  1. A signed-in user can read their own users/{uid} document and subcollections.
 *  2. A signed-in user cannot read another user's data.
 *  3. Nobody can write directly from a client (all writes go through the Admin SDK).
 *  4. Signed-out visitors can read nothing.
 *  5. Any path outside users/{uid} is denied.
 */

import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, "../firestore.rules");

const ALICE = "alice";
const BOB = "bob";

let testEnv;
let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL ${name}\n       ${error instanceof Error ? error.message : error}`);
  }
}

async function main() {
  testEnv = await initializeTestEnvironment({
    projectId: "fitsplit-rules-test",
    firestore: { rules: readFileSync(RULES_PATH, "utf8"), host: "127.0.0.1", port: 8080 }
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`users/${ALICE}`).set({ fullName: "Alice" });
    await db.doc(`users/${ALICE}/liftLogs/l1`).set({ exerciseId: "bench", weight: 60 });
    await db.doc(`users/${ALICE}/rehabSessions/r1`).set({ exercisesCompleted: 5 });
    await db.doc(`users/${BOB}`).set({ fullName: "Bob" });
    await db.doc(`users/${BOB}/rehabSessions/r1`).set({ exercisesCompleted: 3 });
    await db.doc(`users/${BOB}/liftLogs/l1`).set({ exerciseId: "squat", weight: 100 });
    await db.doc("misc/doc").set({ any: true });
  });

  const alice = testEnv.authenticatedContext(ALICE).firestore();
  const anon = testEnv.unauthenticatedContext().firestore();

  console.log("firestore.rules");
  await check("user can read own profile", () => assertSucceeds(alice.doc(`users/${ALICE}`).get()));
  await check("user can read own subcollection", () => assertSucceeds(alice.doc(`users/${ALICE}/liftLogs/l1`).get()));
  await check("user cannot read another user's profile", () => assertFails(alice.doc(`users/${BOB}`).get()));
  await check("user cannot read another user's subcollection", () => assertFails(alice.doc(`users/${BOB}/liftLogs/l1`).get()));
  await check("user cannot write own profile from a client", () => assertFails(alice.doc(`users/${ALICE}`).set({ fullName: "Hax" })));
  await check("user cannot write own subcollection from a client", () =>
    assertFails(alice.doc(`users/${ALICE}/liftLogs/l2`).set({ weight: 999 }))
  );
  await check("user can read own rehab sessions", () => assertSucceeds(alice.doc(`users/${ALICE}/rehabSessions/r1`).get()));
  await check("user cannot read another user's rehab sessions", () => assertFails(alice.doc(`users/${BOB}/rehabSessions/r1`).get()));
  await check("user cannot write rehab sessions from a client", () =>
    assertFails(alice.doc(`users/${ALICE}/rehabSessions/r2`).set({ exercisesCompleted: 99 }))
  );
  await check("signed-out visitor cannot read a profile", () => assertFails(anon.doc(`users/${ALICE}`).get()));
  await check("other root collections are denied", () => assertFails(alice.doc("misc/doc").get()));

  await testEnv.cleanup();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
