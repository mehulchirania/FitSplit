import { describe, expect, it } from "vitest";
import { LOCK_MS, lockMessage, lockRemainingMs, MAX_FAILED_ATTEMPTS, registerFailure } from "@/lib/pin-lockout";
import type { AttemptState } from "@/lib/pin-lockout";

describe("pin lockout", () => {
  it("counts failures and locks on the 5th", () => {
    let state: AttemptState | undefined;
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
      state = registerFailure(state, 0);
      expect(state).toEqual({ failures: i });
      expect(lockRemainingMs(state, 0)).toBe(0);
    }
    state = registerFailure(state, 1000);
    expect(state.lockedUntil).toBe(1000 + LOCK_MS);
    expect(lockRemainingMs(state, 1000)).toBe(LOCK_MS);
  });

  it("stays locked until the window ends, then starts a fresh count", () => {
    const locked: AttemptState = { failures: 0, lockedUntil: LOCK_MS };
    expect(lockRemainingMs(locked, LOCK_MS - 1)).toBe(1);
    expect(lockRemainingMs(locked, LOCK_MS)).toBe(0);
    expect(registerFailure(locked, LOCK_MS + 5)).toEqual({ failures: 1 });
  });

  it("words the wait in whole minutes", () => {
    expect(lockMessage(LOCK_MS)).toBe("Too many wrong PINs. Try again in 15 minutes.");
    expect(lockMessage(30_000)).toBe("Too many wrong PINs. Try again in 1 minute.");
  });
});
