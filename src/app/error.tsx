"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "2rem", textAlign: "center", gap: "1rem" }}>
      <p style={{ fontSize: "2rem" }}>⚠️</p>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>Something went wrong</h2>
      <p style={{ color: "var(--text-soft)", fontSize: "0.9rem", maxWidth: 360 }}>
        {error.message ?? "An unexpected error occurred. Please try again."}
      </p>
      <button className="button button-primary" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}
