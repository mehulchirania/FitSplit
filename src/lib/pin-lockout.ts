import type { Firestore } from "firebase-admin/firestore";
import { collectionPaths } from "@/lib/firebase/collections";

/**
 * Brute-force protection for phone + PIN sign-in. A 4-digit PIN has only 10,000
 * possibilities, so guesses are counted per phone number on the server (Firestore
 * `loginAttempts/{digits}`, written only by the Admin SDK; client rules deny it):
 * after MAX_FAILED_ATTEMPTS wrong PINs the number is locked for LOCK_MS, whether or
 * not the next guess is right. A correct sign-in clears the counter.
 */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60 * 1000;

export type AttemptState = { failures: number; lockedUntil?: number };

/** Milliseconds left on the lock, or 0 when not locked. */
export function lockRemainingMs(state: AttemptState | undefined, now: number): number {
  return state?.lockedUntil && state.lockedUntil > now ? state.lockedUntil - now : 0;
}

/** The state after one more wrong PIN. An expired lock starts a fresh count. */
export function registerFailure(state: AttemptState | undefined, now: number): AttemptState {
  const live = state && !(state.lockedUntil && state.lockedUntil <= now) ? state : undefined;
  const failures = (live?.failures ?? 0) + 1;
  return failures >= MAX_FAILED_ATTEMPTS ? { failures: 0, lockedUntil: now + LOCK_MS } : { failures };
}

export function lockMessage(remainingMs: number): string {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `Too many wrong PINs. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

const ref = (db: Firestore, phone: string) => db.collection(collectionPaths.loginAttempts).doc(phone.replace(/\D/g, ""));

export async function getLockRemaining(db: Firestore, phone: string, now = Date.now()): Promise<number> {
  const snap = await ref(db, phone).get();
  return lockRemainingMs(snap.data() as AttemptState | undefined, now);
}

export async function recordFailure(db: Firestore, phone: string, now = Date.now()): Promise<AttemptState> {
  const doc = ref(db, phone);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(doc);
    const next = registerFailure(snap.data() as AttemptState | undefined, now);
    tx.set(doc, { ...next, updatedAt: new Date(now).toISOString() });
    return next;
  });
}

export async function clearFailures(db: Firestore, phone: string): Promise<void> {
  await ref(db, phone).delete();
}
