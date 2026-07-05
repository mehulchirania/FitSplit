// Backfill legacy root Firestore collections into their canonical
// gym-scoped home: gyms/{gymId}/<collection>/{sameDocId}.
//
// Context: the app now reads gym-scoped collections only (root fallbacks were
// removed from hot read-model paths — see docs/12_ARCHITECTURE_AUDIT_2026.md
// and docs/16_FABLE_AUDIT_2026-07-05.md, finding F3). Any legacy data that
// still lives only in a root collection is invisible to the app until it is
// copied into gyms/{gymId}/<collection>. This script does that copy.
//
// DRY-RUN BY DEFAULT. Pass --apply to actually write. Root documents are
// NEVER deleted or modified — archival of root data is a separate, later step.
//
// Usage:
//   node scripts/backfill-root-to-gym.mjs                          # dry run, all collections
//   node scripts/backfill-root-to-gym.mjs --collections=liftLogs,dayLogs
//   node scripts/backfill-root-to-gym.mjs --gym=shg --apply         # write mode
//
// Idempotent: writes use set(..., { merge: true }) keyed by the original root
// doc id, so re-running is always safe and never creates duplicates.
//
// See docs/17_ROOT_BACKFILL_RUNBOOK.md for the full operational runbook.

import fs from "node:fs";
import path from "node:path";
import { cert, applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ---------------------------------------------------------------------------
// Env loading (same pattern as scripts/migrate-gym-scoped-firestore.mjs):
// read .env.local if present, without overriding already-set shell env vars.
// ---------------------------------------------------------------------------
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function privateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

// Same credential resolution as src/lib/firebase/admin.ts.
const hasServiceAccount = Boolean(process.env.FIREBASE_CLIENT_EMAIL && privateKey());
const hasApplicationDefault = Boolean(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.K_SERVICE ||
    process.env.FUNCTION_TARGET ||
    process.env.FIREBASE_CONFIG
);

if (!process.env.FIREBASE_PROJECT_ID || (!hasServiceAccount && !hasApplicationDefault)) {
  console.error(
    "Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID plus either\n" +
      "(FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) or GOOGLE_APPLICATION_CREDENTIALS\n" +
      "(via shell env or .env.local) before running this script."
  );
  process.exit(1);
}

initializeApp({
  credential: hasServiceAccount
    ? cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey()
      })
    : applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID
});

const db = getFirestore();

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const applyMode = args.includes("--apply");

function argValue(flag) {
  const hit = args.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : undefined;
}

const PRIMARY_GYM_ID = "shg";
const gymOverride = argValue("--gym");
const defaultGymId = gymOverride && gymOverride.trim() ? gymOverride.trim() : PRIMARY_GYM_ID;

// Root collections eligible for this backfill. Matches gymScopedCollectionPaths
// keys in src/lib/firebase/collections.ts, minus the intentional global
// catalogs (exerciseCatalog, workoutPrograms) and intentionally-root-only
// collections (authProfiles, usernames, phones, loginAttempts, archives).
const ALL_COLLECTIONS = [
  "liftLogs",
  "bodyMetricLogs",
  "dayLogs",
  "macroLogs",
  "activityLogs",
  "workoutSessions",
  "attendanceRecords",
  "ptSessions",
  "ptLiftLogs",
  "notifications",
  "contactMessages",
  "exerciseRequests",
  "memberships",
  "paymentRequests",
  "activityEvents",
  "packages"
];

const collectionsFilter = argValue("--collections");
const targetCollections = collectionsFilter
  ? collectionsFilter
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
  : ALL_COLLECTIONS;

const unknown = targetCollections.filter((c) => !ALL_COLLECTIONS.includes(c));
if (unknown.length) {
  console.error(
    `Unknown collection(s) in --collections: ${unknown.join(", ")}.\n` +
      `Valid options: ${ALL_COLLECTIONS.join(", ")}`
  );
  process.exit(1);
}

const BATCH_LIMIT = 400; // Firestore hard cap is 500 ops/batch; leave headroom.

function resolveGymId(data) {
  const raw = data?.gymId;
  if (typeof raw === "string" && raw.trim()) {
    return { gymId: raw.trim(), resolvedFromDoc: true };
  }
  return { gymId: defaultGymId, resolvedFromDoc: false };
}

async function processCollection(collectionName) {
  const report = {
    collection: collectionName,
    rootCount: 0,
    alreadyScoped: 0,
    wouldCopy: 0,
    copied: 0,
    noResolvableGymId: 0, // fell back to default gym id (still copied, just flagged)
    errors: 0
  };

  const rootSnapshot = await db.collection(collectionName).get();
  report.rootCount = rootSnapshot.size;

  if (rootSnapshot.empty) {
    console.log(`[${collectionName}] root collection empty — nothing to do.`);
    return report;
  }

  let batch = db.batch();
  let opsInBatch = 0;
  let processed = 0;

  for (const doc of rootSnapshot.docs) {
    const data = doc.data();
    const { gymId, resolvedFromDoc } = resolveGymId(data);
    if (!resolvedFromDoc) report.noResolvableGymId += 1;

    const targetRef = db.collection("gyms").doc(gymId).collection(collectionName).doc(doc.id);

    // Dry-run visibility into overlap: check existing gym-scoped doc.
    const existing = applyMode ? null : await targetRef.get();
    if (existing && existing.exists) {
      report.alreadyScoped += 1;
    } else {
      report.wouldCopy += 1;
    }

    if (applyMode) {
      batch.set(
        targetRef,
        {
          ...data,
          id: String(data.id ?? doc.id),
          gymId,
          mirroredFromRootCollection: true
        },
        { merge: true }
      );
      opsInBatch += 1;
      report.copied += 1;

      if (opsInBatch >= BATCH_LIMIT) {
        try {
          await batch.commit();
        } catch (error) {
          report.errors += 1;
          console.error(`[${collectionName}] batch commit failed:`, error.message);
        }
        batch = db.batch();
        opsInBatch = 0;
      }
    }

    processed += 1;
    if (processed % 500 === 0) {
      console.log(`[${collectionName}] processed ${processed}/${rootSnapshot.size}...`);
    }
  }

  if (applyMode && opsInBatch > 0) {
    try {
      await batch.commit();
    } catch (error) {
      report.errors += 1;
      console.error(`[${collectionName}] final batch commit failed:`, error.message);
    }
  }

  return report;
}

async function main() {
  console.log(
    applyMode
      ? `APPLY MODE — writing gyms/{gymId}/<collection> mirrors. Default gym id: ${defaultGymId}`
      : `DRY RUN — no writes will be made. Default gym id: ${defaultGymId}. Pass --apply to write.`
  );
  console.log(`Collections: ${targetCollections.join(", ")}\n`);

  const reports = [];
  for (const collectionName of targetCollections) {
    console.log(`--- ${collectionName} ---`);
    // Sequential on purpose: keeps console output readable and avoids
    // hammering Firestore with concurrent full-collection scans.
    const report = await processCollection(collectionName);
    reports.push(report);
    console.log(
      `[${collectionName}] root=${report.rootCount} alreadyScoped=${report.alreadyScoped} ` +
        `${applyMode ? "copied" : "wouldCopy"}=${applyMode ? report.copied : report.wouldCopy} ` +
        `noResolvableGymId(fell back to "${defaultGymId}")=${report.noResolvableGymId} errors=${report.errors}\n`
    );
  }

  console.log("=== Summary ===");
  console.table(
    reports.map((r) => ({
      collection: r.collection,
      rootDocs: r.rootCount,
      alreadyScoped: r.alreadyScoped,
      [applyMode ? "copied" : "wouldCopy"]: applyMode ? r.copied : r.wouldCopy,
      noGymIdOnDoc: r.noResolvableGymId,
      errors: r.errors
    }))
  );

  const totalErrors = reports.reduce((sum, r) => sum + r.errors, 0);
  if (totalErrors > 0) {
    console.error(`Completed with ${totalErrors} batch error(s). Review output above.`);
    process.exit(1);
  }

  if (!applyMode) {
    console.log("\nDry run complete. Re-run with --apply to write these changes.");
  } else {
    console.log("\nBackfill complete. Root documents were not modified or deleted.");
  }
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
