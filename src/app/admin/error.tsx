"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <main className="page">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", padding: "2rem", textAlign: "center", gap: "1rem" }}>
        <p style={{ fontSize: "2rem" }}>⚠️</p>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Admin console error</h2>
        <p style={{ color: "var(--text-soft)", fontSize: "0.9rem", maxWidth: 360 }}>
          {error.message ?? "Could not load this page. Check your Firebase connection and try again."}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button className="button button-primary" onClick={reset} type="button">
            Try again
          </button>
          <Link className="button button-secondary" href="/admin">
            Back to admin
          </Link>
        </div>
      </div>
    </main>
  );
}
