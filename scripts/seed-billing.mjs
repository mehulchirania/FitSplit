/**
 * seed-billing.mjs
 *
 * Seeds packages, payment requests, memberships, and trainer assignments for
 * the primary gym (shg). Safe to re-run: it skips documents that already
 * exist (identified by stable IDs) and only upserts where needed.
 *
 * Usage:
 *   node scripts/seed-billing.mjs
 *
 * Requirements:
 *   - firebase-admin installed (it's already in devDependencies via functions/)
 *   - Service account key at the path below (or set GOOGLE_APPLICATION_CREDENTIALS)
 */

import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Firebase Admin initialisation ───────────────────────────────────────────

const SERVICE_ACCOUNT_PATH =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ??
  path.resolve(
    __dirname,
    "../../FireBaseKeys/fitsplit-29215-firebase-adminsdk-fbsvc-91bb9ca45d.json"
  );

let admin;
try {
  admin = require("firebase-admin");
} catch {
  // Try from functions sub-package
  admin = require(path.resolve(__dirname, "../functions/node_modules/firebase-admin"));
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = admin.firestore();

// ── Helpers ──────────────────────────────────────────────────────────────────

function gymPath(gymId, collection) {
  return `gyms/${gymId}/${collection}`;
}

async function upsert(collectionPath, docId, data) {
  const ref = db.collection(collectionPath).doc(docId);
  const existing = await ref.get();
  if (existing.exists) {
    console.log(`  ↳ skip  ${collectionPath}/${docId} (already exists)`);
    return false;
  }
  await ref.set(data);
  console.log(`  ✓ write ${collectionPath}/${docId}`);
  return true;
}

function isoDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function isoDateStr(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const GYM_ID = "shg";
const NOW = new Date().toISOString();

// ── 1. Packages ──────────────────────────────────────────────────────────────

const PACKAGES = [
  {
    id: "pkg-monthly",
    gymId: GYM_ID,
    name: "Monthly",
    description: "Full gym access for one month. No lock-in.",
    durationMonths: 1,
    price: 1500,
    currency: "INR",
    includesPT: false,
    isActive: true,
    createdAt: NOW,
  },
  {
    id: "pkg-quarterly",
    gymId: GYM_ID,
    name: "Quarterly",
    description: "3-month access. Save ₹500 vs monthly.",
    durationMonths: 3,
    price: 4000,
    currency: "INR",
    includesPT: false,
    isActive: true,
    createdAt: NOW,
  },
  {
    id: "pkg-annual",
    gymId: GYM_ID,
    name: "Annual",
    description: "Best value. 12 months unlimited gym access.",
    durationMonths: 12,
    price: 12000,
    currency: "INR",
    includesPT: false,
    isActive: true,
    createdAt: NOW,
  },
  {
    id: "pkg-pt-monthly",
    gymId: GYM_ID,
    name: "PT Monthly",
    description: "Gym access + 8 personal training sessions per month.",
    durationMonths: 1,
    price: 4000,
    currency: "INR",
    includesPT: true,
    ptSessionsIncluded: 8,
    isActive: true,
    createdAt: NOW,
  },
  {
    id: "pkg-pt-quarterly",
    gymId: GYM_ID,
    name: "PT Quarterly",
    description: "3 months + 24 PT sessions. Great for dedicated athletes.",
    durationMonths: 3,
    price: 10500,
    currency: "INR",
    includesPT: true,
    ptSessionsIncluded: 24,
    isActive: true,
    createdAt: NOW,
  },
];

// ── 2. Fetch existing members to create realistic payment requests ─────────

async function getMembers() {
  const snap = await db.collection(gymPath(GYM_ID, "members")).limit(10).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── 3. Seed approved memberships + payment requests for some members ────────

async function seedMemberBilling(members) {
  if (members.length === 0) {
    console.log("  ⚠ No members found in gym — skipping member billing seed.");
    return;
  }

  // Take up to 5 members to seed billing for
  const targets = members.slice(0, 5);

  for (let i = 0; i < targets.length; i++) {
    const m = targets[i];
    const memberId = m.id;
    const memberName = m.fullName ?? m.name ?? "Member";
    const pkg = PACKAGES[i % PACKAGES.length];

    // Approved payment request (historical)
    const reqId = `req-seed-${memberId}`;
    const approvedAt = isoDate(-(60 - i * 10)); // stagger past dates
    await upsert(gymPath(GYM_ID, "paymentRequests"), reqId, {
      id: reqId,
      gymId: GYM_ID,
      memberId,
      memberName,
      packageId: pkg.id,
      packageName: pkg.name,
      amount: pkg.price,
      currency: pkg.currency,
      method: ["cash", "upi", "card"][i % 3],
      status: "approved",
      requestedAt: isoDate(-(62 - i * 10)),
      resolvedAt: approvedAt,
      resolvedByName: "Owner",
    });

    // Active membership created from that request
    const memId = `mem-seed-${memberId}`;
    const startDate = isoDateStr(-(60 - i * 10));
    const endDate = isoDateStr(-(60 - i * 10) + pkg.durationMonths * 30);
    const isStillActive = new Date(endDate) > new Date();
    await upsert(gymPath(GYM_ID, "memberships"), memId, {
      id: memId,
      gymId: GYM_ID,
      memberId,
      packageId: pkg.id,
      planName: pkg.name,
      startDate,
      endDate,
      durationMonths: pkg.durationMonths,
      status: isStillActive ? "active" : "expired",
      paymentRequestId: reqId,
      activatedAt: approvedAt,
      createdAt: approvedAt,
    });
  }

  // One pending request from the last member
  const last = members[Math.min(5, members.length - 1)];
  if (last) {
    const pendingId = `req-pending-${last.id}`;
    await upsert(gymPath(GYM_ID, "paymentRequests"), pendingId, {
      id: pendingId,
      gymId: GYM_ID,
      memberId: last.id,
      memberName: last.fullName ?? last.name ?? "Member",
      packageId: PACKAGES[0].id,
      packageName: PACKAGES[0].name,
      amount: PACKAGES[0].price,
      currency: PACKAGES[0].currency,
      method: "upi",
      status: "pending",
      requestedAt: isoDate(-1),
    });
  }
}

// ── 4. Assign trainers to PT members ─────────────────────────────────────────

async function assignTrainersToPTMembers() {
  // Find trainers
  const trainerSnap = await db
    .collection(gymPath(GYM_ID, "staff"))
    .where("role", "==", "trainer")
    .get();

  if (trainerSnap.empty) {
    console.log("  ⚠ No trainers found — skipping trainer assignment.");
    return;
  }

  const trainers = trainerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const firstTrainer = trainers[0];
  console.log(`  → Found ${trainers.length} trainer(s). Will assign to PT members.`);

  // Find members with isPT flag that have no trainer assigned
  const ptMembersSnap = await db
    .collection(gymPath(GYM_ID, "members"))
    .where("isPT", "==", true)
    .get();

  let assigned = 0;
  for (const doc of ptMembersSnap.docs) {
    const data = doc.data();
    if (!data.assignedTrainerId) {
      await doc.ref.update({
        assignedTrainerId: firstTrainer.id,
        assignedTrainerName: firstTrainer.fullName ?? firstTrainer.name ?? "Trainer",
      });
      console.log(`  ✓ assigned trainer → member ${doc.id}`);
      assigned++;
    }
  }

  if (assigned === 0) {
    console.log("  ↳ All PT members already have a trainer assigned.");
  }
}

// ── 5. Trigger dashboard summary recompute (calls the Cloud Function) ────────

async function triggerDashboardSummary() {
  // Write a sentinel field on the gym doc to trigger the scheduled function
  // Alternatively, the cloud function can be called directly if deployed.
  // For now, we compute and write the summary manually here.
  const membersSnap = await db.collection(gymPath(GYM_ID, "members")).get();
  const members = membersSnap.docs.map((d) => d.data());

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const totalMembers = members.filter((m) => m.isActive !== false && !m.staffType).length;
  const activeMembers = members.filter(
    (m) => m.isActive !== false && !m.staffType && m.membershipStatus === "active"
  ).length;
  const ptMembers = members.filter(
    (m) => m.isActive !== false && !m.staffType && m.isPT === true
  ).length;

  // Expiring this week
  const membershipsSnap = await db
    .collection(gymPath(GYM_ID, "memberships"))
    .where("status", "==", "active")
    .get();
  const expiringThisWeek = membershipsSnap.docs.filter((d) => {
    const end = d.data().endDate;
    return end && end >= today && end <= sevenDaysLater;
  }).length;
  const expiredCount = membershipsSnap.docs.filter(
    (d) => d.data().endDate && d.data().endDate < today
  ).length;

  // Pending payment requests
  const pendingSnap = await db
    .collection(gymPath(GYM_ID, "paymentRequests"))
    .where("status", "==", "pending")
    .get();
  const pendingPaymentRequests = pendingSnap.size;

  // Trainers
  const trainerSnap = await db
    .collection(gymPath(GYM_ID, "staff"))
    .where("role", "==", "trainer")
    .get();
  const activeTrainers = trainerSnap.size;

  // MTD revenue
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const approvedSnap = await db
    .collection(gymPath(GYM_ID, "paymentRequests"))
    .where("status", "==", "approved")
    .get();
  const totalRevenueMTD = approvedSnap.docs
    .filter((d) => {
      const ra = d.data().resolvedAt;
      return ra && new Date(ra) >= startOfMonth;
    })
    .reduce((sum, d) => sum + Number(d.data().amount ?? 0), 0);

  const currency = "INR";
  const summary = {
    gymId: GYM_ID,
    totalMembers,
    activeMembers,
    ptMembers,
    expiringThisWeek,
    expiredCount,
    pendingPaymentRequests,
    activeTrainers,
    totalRevenueMTD,
    currency,
    lastComputedAt: new Date().toISOString(),
  };

  await db.doc(`gyms/${GYM_ID}/summaries/dashboard`).set(summary);
  console.log("  ✓ Dashboard summary written:", summary);
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== FitSplit Billing Seed ===\n");

  console.log("1. Packages");
  for (const pkg of PACKAGES) {
    await upsert(gymPath(GYM_ID, "packages"), pkg.id, pkg);
  }

  console.log("\n2. Member billing (payment requests + memberships)");
  const members = await getMembers();
  await seedMemberBilling(members);

  console.log("\n3. Trainer assignments for PT members");
  await assignTrainersToPTMembers();

  console.log("\n4. Dashboard summary");
  await triggerDashboardSummary();

  console.log("\n=== Done ===\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
