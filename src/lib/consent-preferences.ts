/**
 * Browser-side switch for the one optional processing activity: client-side error
 * diagnostics (Sentry browser SDK + masked session replay). Off unless the user opted in.
 * The account-level record lives on users/{uid}.consent.diagnostics; this flag is the
 * per-device switch the SDK reads at start-up, because Sentry initialises before login.
 */
export const DIAGNOSTICS_STORAGE_KEY = "fitsplit-diagnostics-consent";

export function readDiagnosticsConsent(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(DIAGNOSTICS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();

/** For useSyncExternalStore: re-render when the switch changes (this tab or another). */
export function subscribeDiagnosticsConsent(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function writeDiagnosticsConsent(granted: boolean) {
  try {
    window.localStorage.setItem(DIAGNOSTICS_STORAGE_KEY, granted ? "1" : "0");
  } catch {
    /* storage unavailable: stays off */
  }
  listeners.forEach((l) => l());
}
