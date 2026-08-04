"use client";

import { useEffect, useState } from "react";

/**
 * Three-state theme control: light / dark / system (default).
 *
 * Persistence contract (must match the pre-paint script in app/layout.tsx):
 *   - 'light' or 'dark' -> localStorage['fitsplit-theme'] = that literal string
 *   - 'system'           -> the key is removed entirely
 * The layout script already treats a missing/invalid key as "follow OS", so
 * this component never needs to write the literal string "system".
 */

type StoredPreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "fitsplit-theme";

function readStoredPreference(): StoredPreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Storage can throw in some privacy modes — fall back to following the OS.
    return "system";
  }
}

function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
}

function persistPreference(preference: StoredPreference) {
  try {
    if (preference === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch {
    // Non-fatal: the in-memory state still drives the current tab correctly,
    // it just won't be remembered on the next visit.
  }
}

function nextPreference(current: StoredPreference): StoredPreference {
  if (current === "light") return "dark";
  if (current === "dark") return "system";
  return "light";
}

function labelFor(preference: StoredPreference, resolved: ResolvedTheme): string {
  if (preference === "light") return "Theme: light. Activate to switch to dark.";
  if (preference === "dark") return "Theme: dark. Activate to switch to automatic, matching your system.";
  return `Theme: automatic, currently ${resolved} to match your system. Activate to switch to light.`;
}

/*
 * The brief for this component calls for lucide-react's Sun / Moon / Monitor
 * icons "which the project already depends on" — but lucide-react is not in
 * package.json and is not present in node_modules (verified: no import of it
 * anywhere in the repo). Rather than add a new dependency mid-flight, these
 * three glyphs are hand-drawn here in the same stroke-based style already
 * used throughout src/components/icons.tsx (currentColor stroke, 24x24
 * viewBox, round caps/joins) so they're visually indistinguishable from an
 * actual lucide import.
 */
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * `className` is appended to the base icon-button classes so the three shells
 * that host this control (app topbar, member topbar, owner/admin sidebar) can
 * each size and place it without forking the component.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [preference, setPreference] = useState<StoredPreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  // The server can't know the stored preference, so the first client render
  // (before any effect runs) must render exactly what the server rendered —
  // that's the `!mounted` placeholder below. Only once this effect fires
  // (strictly after hydration) do we read localStorage and switch to the
  // real control. This is a client-only state update, not a hydration
  // mismatch: React already finished reconciling the initial markup.
  useEffect(() => {
    setPreference(readStoredPreference());
    setMounted(true);
  }, []);

  // Apply `preference` to the DOM, and while in "system" mode, live-follow
  // OS changes until the user picks an explicit theme or this unmounts.
  useEffect(() => {
    if (!mounted) return;

    if (preference !== "system") {
      setResolved(preference);
      applyResolvedTheme(preference);
      return;
    }

    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const applyFromSystem = (matchesLight: boolean) => {
      const next: ResolvedTheme = matchesLight ? "light" : "dark";
      setResolved(next);
      applyResolvedTheme(next);
    };

    applyFromSystem(mql.matches);

    function handleChange(event: MediaQueryListEvent) {
      applyFromSystem(event.matches);
    }

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [preference, mounted]);

  function handleClick() {
    const next = nextPreference(preference);
    setPreference(next);
    persistPreference(next);
  }

  if (!mounted) {
    // Stable, theme-agnostic placeholder — identical on the server and on
    // the first client paint, so hydration never sees a mismatch.
    return (
      <button
        aria-label="Theme toggle"
        className={`icon-button neutral-icon-button theme-toggle-button ${className}`.trim()}
        disabled
        type="button"
        suppressHydrationWarning
      >
        <MonitorIcon />
      </button>
    );
  }

  const Icon = preference === "light" ? SunIcon : preference === "dark" ? MoonIcon : MonitorIcon;

  return (
    <button
      aria-label={labelFor(preference, resolved)}
      className={`icon-button neutral-icon-button theme-toggle-button ${className}`.trim()}
      onClick={handleClick}
      type="button"
    >
      <Icon />
    </button>
  );
}
