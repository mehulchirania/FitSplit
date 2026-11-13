/**
 * Starts Firebase Auth + Firestore emulators, seeds a test user, then runs
 * `next dev --webpack` wired to them. Never touches a real Firebase project.
 * Needs Java 11+ on PATH (Firestore emulator).  Ctrl+C stops everything.
 */
import { spawn } from "node:child_process";
import net from "node:net";

import { emulatorEnv } from "./emulator-env.mjs";
const env = { ...process.env, ...emulatorEnv };

function waitPort(port, timeoutMs = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const s = net.connect(port, "127.0.0.1");
      s.once("connect", () => { s.destroy(); resolve(); });
      s.once("error", () => {
        s.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error(`port ${port} not up`));
        else setTimeout(tick, 500);
      });
    };
    tick();
  });
}

const run = (cmd, args) => spawn(cmd, args, { stdio: "inherit", shell: true, env });

const java = spawn("java", ["-version"], { stdio: "ignore", shell: true });
java.on("exit", async (code) => {
  if (code !== 0) {
    console.error("Java is required for the Firestore emulator. Install: winget install Microsoft.OpenJDK.21");
    process.exit(1);
  }
  const emu = run("npx", ["firebase-tools", "emulators:start", "--only", "auth,firestore", "--project", "demo-fitsplit"]);
  const children = [emu];
  const stop = () => children.forEach((c) => c.kill());
  process.on("SIGINT", () => { stop(); process.exit(0); });
  emu.on("exit", () => process.exit(0));
  await Promise.all([waitPort(9099), waitPort(8080)]);
  await new Promise((r) => run("node", ["scripts/seed-emulator.mjs"]).on("exit", r));
  const next = run("npx", ["next", "dev", "--webpack"]);
  children.push(next);
  next.on("exit", () => { stop(); process.exit(0); });
});
