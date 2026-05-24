"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function OwnerError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[OwnerError]", error);
  }, [error]);

  return (
    <main className="page">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", padding: "2rem", textAlign: "center", gap: "1rem" }}>
        <p style={{ fontSize: "2rem" }}>⚠️</p>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Owner dashboard error</h2>
        <p style={{ color: "var(--text-soft)", fontSize: "0.9rem", maxWidth: 360 }}>
          {error.message ?? "Could not load this page. This may be a temporary issue."}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button className="button button-primary" onClick={reset} type="button">
            Try again
          </button>
          <Link className="button button-secondary" href="/owner">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
