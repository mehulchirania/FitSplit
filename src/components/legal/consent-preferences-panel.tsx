"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { readDiagnosticsConsent, subscribeDiagnosticsConsent, writeDiagnosticsConsent } from "@/lib/consent-preferences";
import { setDiagnosticsConsent } from "@/lib/firebase/actions/privacy";

/**
 * Lets a person see and withdraw the one optional consent (client diagnostics) as
 * easily as it was given. Works signed out (device switch) and signed in (also
 * updates the consent record on the account).
 */
export function ConsentPreferencesPanel() {
  const enabled = useSyncExternalStore(subscribeDiagnosticsConsent, readDiagnosticsConsent, () => false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setMessage("");
    writeDiagnosticsConsent(next);
    startTransition(async () => {
      try {
        const res = await setDiagnosticsConsent(next);
        if (res.status === "error") {
          writeDiagnosticsConsent(false);
          setMessage(res.message);
        } else {
          setMessage(next ? "Saved. Diagnostics are on for this device." : "Saved. Diagnostics are off.");
        }
      } catch {
        // Signed out (no account record to update): the device switch above is what counts.
        setMessage(next ? "Saved for this device." : "Saved. Diagnostics are off.");
      }
    });
  }

  return (
    <section aria-labelledby="consent-prefs-title" style={{ marginTop: "var(--space-12)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border)" }}>
      <h2 id="consent-prefs-title" style={{ marginTop: 0 }}>Your consent choices</h2>
      <p>
        Optional: allow FitSplit to collect error diagnostics and occasional masked session replays from this
        browser to help us fix bugs. This is off unless you turn it on, and the app works the same either way.
        Withdrawing is as easy as giving it. To withdraw your agreement to the Terms and Privacy Notice, delete
        your account in <Link href="/member/settings">Settings</Link>.
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
        />
        <span>Send error diagnostics from this device</span>
      </label>
      <p role="status" aria-live="polite" style={{ minHeight: "1.5em", fontSize: "var(--text-sm)" }}>
        {message}
      </p>
    </section>
  );
}
