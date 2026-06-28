/**
 * Typed client-side wrappers for Firebase Cloud Functions that have no
 * equivalent Server Action (archive, lookup, stats, activation).
 * All member/staff/gym write operations now use Server Actions instead.
 */

import { httpsCallable } from "firebase/functions";
import { getFirebaseClientServices } from "./client";

function fns() {
  return getFirebaseClientServices().functions;
}

// ── Shared response ──────────────────────────────────────────────────────────

export type FnResult<T = Record<string, unknown>> = {
  status: "success";
  message: string;
  data?: T;
} & T;

// ── archiveMemberAccount ─────────────────────────────────────────────────────

export type ArchiveMemberInput = { memberId: string };
export type ArchiveMemberResult = FnResult<{ message: string }>;

export function callArchiveMemberAccount(input: ArchiveMemberInput) {
  return httpsCallable<ArchiveMemberInput, ArchiveMemberResult>(
    fns(),
    "archiveMemberAccount"
  )(input);
}

// ── archiveCustomProgram ─────────────────────────────────────────────────────

export type ArchiveProgramInput = { programId: string };
export type ArchiveProgramResult = FnResult<{ message: string }>;

export function callArchiveCustomProgram(input: ArchiveProgramInput) {
  return httpsCallable<ArchiveProgramInput, ArchiveProgramResult>(
    fns(),
    "archiveCustomProgram"
  )(input);
}

// ── archiveGymWorkspace ──────────────────────────────────────────────────────

export type ArchiveGymInput = { gymId: string };
export type ArchiveGymResult = FnResult<{ message: string }>;

export function callArchiveGymWorkspace(input: ArchiveGymInput) {
  return httpsCallable<ArchiveGymInput, ArchiveGymResult>(
    fns(),
    "archiveGymWorkspace"
  )(input);
}

// ── lookupLoginEmail ─────────────────────────────────────────────────────────

export type LookupLoginEmailInput = {
  /** Username or personal email address */
  identifier: string;
  /** "member" (default) or "staff" */
  mode?: "member" | "staff";
};

export type LookupLoginEmailResult = FnResult<{
  /** Firebase Auth email to pass to signInWithEmailAndPassword */
  email: string;
}>;

/**
 * Resolve a username / personal email to the Firebase Auth email so the
 * client can call signInWithEmailAndPassword.  Does NOT require the caller to
 * be signed in — this is a public callable used before authentication.
 */
export function callLookupLoginEmail(input: LookupLoginEmailInput) {
  return httpsCallable<LookupLoginEmailInput, LookupLoginEmailResult>(
    fns(),
    "lookupLoginEmail"
  )(input);
}

// ── Trainer / Stats functions ─────────────────────────────────────────────────

export type AssignTrainerInput = { gymId: string; memberId: string; trainerId: string };
export function callAssignTrainerToPTMember(input: AssignTrainerInput) {
  return httpsCallable<AssignTrainerInput, FnResult>(fns(), "assignTrainerToPTMember")(input);
}

export type ActivateMembershipInput = { gymId: string; memberId: string; packageId: string };
export function callActivateOrRenewMembership(input: ActivateMembershipInput) {
  return httpsCallable<ActivateMembershipInput, FnResult<{ membershipId: string }>>(fns(), "activateOrRenewMembership")(input);
}

export type DashboardStatsInput = { gymId: string };
export function callGenerateGymDashboardStats(input: DashboardStatsInput) {
  return httpsCallable<DashboardStatsInput, FnResult>(fns(), "generateGymDashboardStats")(input);
}

export function callGenerateAdminDashboardStats() {
  return httpsCallable<Record<string, never>, FnResult>(fns(), "generateAdminDashboardStats")({});
}
