import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import workoutsData from "../lib/workouts.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const writeMode = process.argv.includes("--write");
const gymId = process.argv.find((arg) => arg.startsWith("--gym="))?.split("=")[1] || "shg";

try {
  const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch {
  // .env.local is optional when the shell already has credentials.
}

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";
let credential;
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (credsPath) {
  const serviceAccount = JSON.parse(readFileSync(credsPath, "utf-8"));
  credential = cert({
    projectId: serviceAccount.project_id || projectId,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key
  });
} else {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    console.error("Missing Firebase Admin credentials.");
    process.exit(1);
  }
  credential = cert({ projectId, clientEmail, privateKey });
}

if (!getApps().length) initializeApp({ credential });
const db = getFirestore();

function key(name) {
  return String(name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

const defaultsByName = new Map();
for (const exercises of Object.values(workoutsData.exercise_catalog)) {
  for (const exercise of exercises) {
    defaultsByName.set(key(exercise.name), {
      name: exercise.name,
      videoUrl: exercise.video_url || "",
      gymVideoUrl: exercise.gym_video_url || ""
    });
  }
}

async function patchSnapshot(snapshot, target) {
  const now = new Date().toISOString();
  const changes = [];
  const equals = (current, next) => {
    if (typeof next === "string") return String(current ?? "") === next;
    return current === next;
  };

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const defaults = defaultsByName.get(key(data.name));
    if (!defaults) continue;

    const patch =
      target === "root"
        ? {
            videoUrl: defaults.videoUrl,
            videoSource: defaults.videoUrl ? "youtube" : "none",
            gymVideoUrl: "",
            gymVideoSource: "none",
            updatedAt: now
          }
        : {
            videoUrl: defaults.videoUrl,
            videoSource: defaults.videoUrl ? "youtube" : "none",
            gymVideoUrl: defaults.gymVideoUrl,
            gymVideoSource: defaults.gymVideoUrl ? "youtube" : "none",
            updatedAt: now
          };

    const changed = Object.entries(patch)
      .filter(([field]) => field !== "updatedAt")
      .some(([field, value]) => !equals(data[field], value));
    if (!changed) continue;
    changes.push({ ref: doc.ref, name: data.name, patch });
  }

  if (!writeMode) {
    changes.forEach((change) => console.log(`[dry-run] ${target}: ${change.name}`));
    return changes.length;
  }

  for (let i = 0; i < changes.length; i += 450) {
    const batch = db.batch();
    changes.slice(i, i + 450).forEach((change) => batch.set(change.ref, change.patch, { merge: true }));
    await batch.commit();
  }

  changes.forEach((change) => console.log(`[updated] ${target}: ${change.name}`));
  return changes.length;
}

console.log(writeMode ? "Writing exercise video sync..." : "Dry run only. Re-run with --write to update Firestore.");
console.log(`Loaded ${defaultsByName.size} workout catalog defaults from lib/workouts.json.`);

const rootSnapshot = await db.collection("exerciseCatalog").get();
const scopedSnapshot = await db.collection(`gyms/${gymId}/exerciseCatalog`).get();

const rootCount = await patchSnapshot(rootSnapshot, "root");
const scopedCount = await patchSnapshot(scopedSnapshot, "gym");

console.log(`Done. ${writeMode ? "Updated" : "Planned"} ${rootCount} root and ${scopedCount} gym-scoped exercise video record(s).`);
