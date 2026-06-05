"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Global error boundary for React rendering errors in the App Router.
 * Required by @sentry/nextjs to capture React render-phase exceptions.
 * Must render its own <html>/<body> because it replaces the root layout.
 */
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#111", color: "#f5f5f5" }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
          textAlign: "center",
          gap: "1rem"
        }}>
          <p style={{ fontSize: "2.5rem", margin: 0 }}>⚠️</p>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h2>
          <p style={{ color: "#a3a3a3", fontSize: "0.9rem", maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
            {error.message ?? "An unexpected error occurred. Your data is safe — please try again."}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 8,
              padding: "10px 28px",
              background: "#C8F135",
              color: "#0a0a0a",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.875rem"
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
