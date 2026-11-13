import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";

export const dynamic = "force-static";
export const metadata = { title: "Exercise data notice | FitSplit" };

// Read at build time: the page is static, so NOTICE.md stays the single source.
const notice = readFileSync(join(process.cwd(), "src/data/exercises/NOTICE.md"), "utf8");

export default function ExerciseDataNoticePage() {
  return (
    <main style={{ margin: "0 auto", maxWidth: 760, padding: "48px 20px", color: "var(--text)" }}>
      <Link href="/about" style={{ color: "var(--text-soft)", fontSize: "0.9rem" }}>Back to About</Link>
      <pre style={{ marginTop: 24, whiteSpace: "pre-wrap", font: "inherit", lineHeight: 1.6 }}>{notice}</pre>
    </main>
  );
}
