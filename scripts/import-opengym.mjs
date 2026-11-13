// Usage: node scripts/import-opengym.mjs <path-to-openGym/catalogue>
// Imports ONLY MIT-licensed ExerciseDB-sourced entries (textSource === "exercisedb")
// and ONLY text fields. No descriptions (AGPL), no media (proprietary), no i18n.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2];
if (!root) {
  console.error("usage: node scripts/import-opengym.mjs <catalogue-dir>");
  process.exit(1);
}
const dir = join(resolve(root), "exercises");
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "exercises", "exercises.json");

const KEEP = ["id", "name", "bodyPart", "equipment", "target", "secondaryMuscles", "category", "instructions"];
const result = [];
for (const f of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
  const e = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (e.textSource !== "exercisedb") continue;
  const o = {};
  for (const k of KEEP) o[k] = e[k] ?? (k === "secondaryMuscles" || k === "instructions" ? [] : "");
  result.push(o);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(result));
console.log(`Wrote ${result.length} exercises to ${out}`);
