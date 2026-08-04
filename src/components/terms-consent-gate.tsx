"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptTerms } from "@/lib/firebase/actions";
import { logoutUser } from "@/lib/auth";

/**
 * Blocking first-login consent gate. Rendered by the root layout only when the
 * signed-in user has not yet accepted the Terms + Privacy Policy. Accepting
 * records consent and proceeds; declining logs the user out.
 */
export function TermsConsentGate() {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [error, setError] = useState("");

  function onAccept() {
    setError("");
    start(async () => {
      const res = await acceptTerms();
      if (res.status === "success") {
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  function onDecline() {
    start(async () => {
      await logoutUser();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-gate-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "18px",
          padding: "28px",
          boxShadow: "var(--shadow)",
        }}
      >
        <h2 id="terms-gate-title" style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)", margin: "0 0 12px" }}>
          Before you continue
        </h2>
        <p style={{ color: "var(--text-soft)", lineHeight: 1.6, margin: "0 0 16px" }}>
          To use FitSplit you must agree to our{" "}
          <Link href="/terms" target="_blank" style={{ color: "var(--brand)", fontWeight: 600 }}>Terms of Service</Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" style={{ color: "var(--brand)", fontWeight: 600 }}>Privacy Policy</Link>,
          including the processing of your fitness and health-related data as described there.
        </p>

        {error && (
          <p style={{ color: "var(--danger)", fontSize: "0.9rem", margin: "0 0 12px" }} role="alert">
            {error}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
          <button
            type="button"
            onClick={onAccept}
            disabled={isPending}
            style={{
              width: "100%",
              minHeight: "44px",
              background: "var(--brand)",
              border: "none",
              borderRadius: "10px",
              padding: "11px 14px",
              color: "var(--primary-foreground)",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: isPending ? "default" : "pointer",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? "Please wait…" : "Accept & continue"}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={isPending}
            style={{
              width: "100%",
              minHeight: "44px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "11px 14px",
              color: "var(--text-soft)",
              fontSize: "0.95rem",
              cursor: isPending ? "default" : "pointer",
            }}
          >
            Decline &amp; log out
          </button>
        </div>
      </div>
    </div>
  );
}
