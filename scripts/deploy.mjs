#!/usr/bin/env node
/**
 * deploy.mjs — FitSplit App Hosting deploy workaround
 *
 * `firebase deploy --only apphosting` builds source but silently fails to
 * create a rollout. This script:
 *   1. Runs `firebase deploy --only apphosting` to build + upload source
 *   2. Finds the latest READY build that has no rollout
 *   3. Creates a rollout for it and polls until SUCCEEDED / FAILED
 *
 * Usage:
 *   node scripts/deploy.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT = "fitsplit-29215";
const LOCATION = "us-central1";
const BACKEND = "fitsplit";
const BASE = `https://firebaseapphosting.googleapis.com/v1beta/projects/${PROJECT}/locations/${LOCATION}/backends/${BACKEND}`;

function getToken() {
  const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const token = config.tokens?.access_token;
  if (!token) throw new Error("No Firebase CLI access token found. Run `firebase login` first.");
  return token;
}

async function api(method, url, body) {
  const token = getToken();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${url} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function getBuilds() {
  const data = await api("GET", `${BASE}/builds?pageSize=20`);
  return (data.builds ?? []).sort((a, b) => b.createTime.localeCompare(a.createTime));
}

async function getRollouts() {
  const data = await api("GET", `${BASE}/rollouts?pageSize=50`);
  return data.rollouts ?? [];
}

async function createRollout(buildName, rolloutId) {
  return api("POST", `${BASE}/rollouts?rolloutId=${rolloutId}`, { build: buildName });
}

async function pollRollout(rolloutId, maxMinutes = 10) {
  const url = `${BASE}/rollouts/${rolloutId}`;
  const deadline = Date.now() + maxMinutes * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 15_000));
    const rollout = await api("GET", url);
    process.stdout.write(`  state: ${rollout.state}\n`);
    if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(rollout.state)) {
      return rollout.state;
    }
  }
  return "TIMEOUT";
}

function nextRolloutId(rollouts) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todayRollouts = rollouts
    .map((r) => r.name.split("/").pop())
    .filter((id) => id.startsWith(`rollout-${today}-`));
  const maxN = todayRollouts.reduce((max, id) => {
    const n = parseInt(id.slice(-3), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, -1);
  return `rollout-${today}-${String(maxN + 1).padStart(3, "0")}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("▶  Step 1: Build source via Firebase CLI…");
try {
  execSync("firebase deploy --only apphosting --project " + PROJECT, {
    stdio: "inherit",
    timeout: 120_000
  });
  console.log("   Firebase CLI deploy completed (or was already live).\n");
} catch {
  // CLI exits non-zero if rollout creation fails — that's OK, we handle it below
  console.log("   CLI exited with error (expected if rollout step failed). Continuing…\n");
}

console.log("▶  Step 2: Finding latest READY build without a rollout…");
const [builds, rollouts] = await Promise.all([getBuilds(), getRollouts()]);
const rolledOutBuilds = new Set(rollouts.map((r) => r.build));
const candidate = builds.find((b) => b.state === "READY" && !rolledOutBuilds.has(b.name));

if (!candidate) {
  console.log("   No unrolled READY build found. The latest build may already be live.");
  process.exit(0);
}

console.log(`   Found: ${candidate.name.split("/").pop()} (${candidate.createTime})\n`);

console.log("▶  Step 3: Creating rollout…");
const rolloutId = nextRolloutId(rollouts);
await createRollout(candidate.name, rolloutId);
console.log(`   Rollout ${rolloutId} queued.\n`);

console.log("▶  Step 4: Waiting for rollout to complete (up to 10 min)…");
const finalState = await pollRollout(rolloutId);

if (finalState === "SUCCEEDED") {
  console.log(`\n✅  Deployed! ${candidate.name.split("/").pop()} is now live at https://fitsplit.in`);
} else {
  console.error(`\n❌  Rollout ended with state: ${finalState}`);
  process.exit(1);
}
