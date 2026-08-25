import type { ConsumerPlan, GymWorkspace } from "@/types/domain";

/**
 * Feature entitlements resolved for one account inside one workspace.
 *
 * ── Why this file exists in a product with no billing ──────────────────────
 * Access today is gated by *role* (`requireRole`). Plans cut *across* roles: a
 * member can be Free or Pro, a gym can be on any business tier. Overloading
 * role with billing is the refactor we're avoiding, so the resolver is written
 * now with its real signature and wired nowhere.
 *
 * v1 is free-only (decision D1, docs/06_B2C_IMPLEMENTATION_PLAN.md): every
 * field below resolves `true` for everybody. Do NOT add `if (!ent.x)` branches
 * to any UI yet — turning Pro on later should be a change to this file's
 * return value plus the gates added at that time, not a hunt through the app
 * for gates that were speculatively scattered ahead of the pricing decision.
 */
export type Entitlements = {
  /** Log lifts, sessions, and body metrics. */
  workoutLogging: boolean;
  /** Number of splits selectable from the library. `null` = unlimited. */
  splitLibraryLimit: number | null;
  /** Build a custom program rather than picking a library split. */
  customPrograms: boolean;
  /** Days of workout history readable. `null` = unlimited. */
  historyRetentionDays: number | null;
  /** Trend charts and progressive-overload analytics, vs current-state only. */
  progressAnalytics: boolean;
  /** Macro targets and macro history, vs today's totals only. */
  macroTracking: boolean;
  /** Roster operations: members, packages, payments, attendance, PT delivery. */
  rosterOperations: boolean;
};

/** The account-side inputs the resolver needs. Deliberately not the whole user. */
export type EntitlementAccount = {
  plan?: ConsumerPlan;
  role: string;
};

const EVERYTHING: Entitlements = {
  workoutLogging: true,
  splitLibraryLimit: null,
  customPrograms: true,
  historyRetentionDays: null,
  progressAnalytics: true,
  macroTracking: true,
  rosterOperations: true
};

/**
 * Resolve what an account may do inside a given workspace.
 *
 * The `(account, gym)` signature is the load-bearing part: entitlements depend
 * on both who you are and which workspace you're currently in — an account can
 * be Free in its own personal workspace and fully entitled inside a paying
 * gym, because the gym covers its members. Callers must pass the *active*
 * workspace, not `defaultGymId`.
 */
export function resolveEntitlements(
  account: EntitlementAccount,
  gym: Pick<GymWorkspace, "type"> | null | undefined
): Entitlements {
  // v1: free-only, nothing gated. `account` and `gym` are read by the callers'
  // type contract so the signature is exercised and can't silently rot before
  // the pricing decision lands.
  void account;
  void gym;

  return { ...EVERYTHING };
}

/**
 * Roster operations are the one thing that is genuinely *not* a plan question —
 * a solo consumer has no roster to operate, regardless of what they pay. This
 * stays true when Pro ships, so it is safe to use as a gate today.
 */
export function canRunRosterOperations(gym: Pick<GymWorkspace, "type"> | null | undefined): boolean {
  return gym?.type !== "personal";
}
