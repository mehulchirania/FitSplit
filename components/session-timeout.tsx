"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/auth";

const sessionStartKey = "fitsplit-session-start";
const twoHoursMs = 2 * 60 * 60 * 1000;
const warningThresholdMs = 5 * 60 * 1000;

export function SessionTimeout({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(5);

  useEffect(() => {
    if (!isAuthenticated) {
      window.localStorage.removeItem(sessionStartKey);
      setShowWarning(false);
      return;
    }

    const now = Date.now();
    const existingStart = Number(window.localStorage.getItem(sessionStartKey) ?? now);
    const sessionStart = Number.isFinite(existingStart) ? existingStart : now;
    window.localStorage.setItem(sessionStartKey, String(sessionStart));

    const remaining = Math.max(0, twoHoursMs - (now - sessionStart));

    // Show warning when 5 minutes remain
    const warningDelay = remaining - warningThresholdMs;
    let warningId: number | undefined;
    let countdownId: number | undefined;

    if (warningDelay > 0) {
      warningId = window.setTimeout(() => {
        setShowWarning(true);
        setMinutesLeft(5);
        countdownId = window.setInterval(() => {
          setMinutesLeft((prev) => Math.max(0, prev - 1));
        }, 60_000);
      }, warningDelay);
    } else if (remaining > 0) {
      setShowWarning(true);
      setMinutesLeft(Math.ceil(remaining / 60_000));
    }

    const logoutId = window.setTimeout(async () => {
      window.localStorage.removeItem(sessionStartKey);
      setShowWarning(false);
      await logoutUser();
      router.replace("/");
      router.refresh();
    }, remaining);

    return () => {
      window.clearTimeout(warningId);
      window.clearTimeout(logoutId);
      window.clearInterval(countdownId);
    };
  }, [isAuthenticated, router]);

  if (!showWarning) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "var(--bg-card, #1a1a1a)",
        border: "1px solid var(--accent, #C8F135)",
        borderRadius: 10,
        padding: "12px 20px",
        color: "var(--text, #fff)",
        fontSize: "0.9rem",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        display: "flex",
        gap: 12,
        alignItems: "center",
        maxWidth: 380,
        width: "calc(100% - 32px)"
      }}
    >
      <span style={{ flex: 1 }}>
        Your session expires in <strong>{minutesLeft} minute{minutesLeft !== 1 ? "s" : ""}</strong>. Save any work.
      </span>
      <button
        onClick={() => setShowWarning(false)}
        style={{ background: "none", border: "none", color: "var(--text-soft)", cursor: "pointer", fontSize: "1.1rem", padding: "0 4px" }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
