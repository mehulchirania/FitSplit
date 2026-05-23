/**
 * Typed client-side wrappers for every Firebase Cloud Function defined in
 * functions/src/index.ts.  Import these in "use client" components or anywhere
 * the Firebase client SDK is available.
 *
 * All functions require the caller to be signed in — the Firebase SDK attaches
 * the ID token automatically so the function can validate the role.
 */

import { httpsCallable } from "firebase/functions";
import { getFirebaseClientServices } from "./client";

function fns() {
  return getFirebaseClientServices().functions;
}

// ── Shared response ──────────────────────────────────────────────────────────

export type FnResult<T = Record<string, unknown>> = { status: "success" } & T;

// ── createMemberAccount ──────────────────────────────────────────────────────

export type CreateMemberInput = {
  gymId?: string;
  fullName: string;
  email: string;
  phone?: string;
  username: string;
  goal?: string;
};

export type CreateMemberResult = FnResult<{ memberId: string; message: string }>;

export function callCreateMemberAccount(input: CreateMemberInput) {
  return httpsCallable<CreateMemberInput, CreateMemberResult>(
    fns(),
    "createMemberAccount"
  )(input);
}

// ── createStaffAccount ───────────────────────────────────────────────────────

export type CreateStaffInput = {
  gymId: string;
  fullName: string;
  email: string;
  staffType?: "owner" | "trainer" | "staff";
};

export type CreateStaffResult = FnResult<{ staffId: string; message: string }>;

export function callCreateStaffAccount(input: CreateStaffInput) {
  return httpsCallable<CreateStaffInput, CreateStaffResult>(
    fns(),
    "createStaffAccount"
  )(input);
}

// ── toggleMemberAccess ───────────────────────────────────────────────────────

export type ToggleAccessInput = { memberId: string; isActive: boolean };
export type ToggleAccessResult = FnResult<{ message: string }>;

export function callToggleMemberAccess(input: ToggleAccessInput) {
  return httpsCallable<ToggleAccessInput, ToggleAccessResult>(
    fns(),
    "toggleMemberAccess"
  )(input);
}

// ── resetMemberPin ───────────────────────────────────────────────────────────

export type ResetPinInput = { memberId: string; pin?: string };
export type ResetPinResult = FnResult<{ message: string }>;

export function callResetMemberPin(input: ResetPinInput) {
  return httpsCallable<ResetPinInput, ResetPinResult>(
    fns(),
    "resetMemberPin"
  )(input);
}

// ── resetStaffPassword ───────────────────────────────────────────────────────

export type ResetStaffPasswordInput = { userId: string; password?: string };
export type ResetStaffPasswordResult = FnResult<{ message: string }>;

export function callResetStaffPassword(input: ResetStaffPasswordInput) {
  return httpsCallable<ResetStaffPasswordInput, ResetStaffPasswordResult>(
    fns(),
    "resetStaffPassword"
  )(input);
}

// ── assignProgramToMember ────────────────────────────────────────────────────

export type AssignProgramInput = {
  memberId: string;
  programId: string;
  programTitle?: string;
  memberName?: string;
};

export type AssignProgramResult = FnResult<{ assignmentId: string; message: string }>;

export function callAssignProgramToMember(input: AssignProgramInput) {
  return httpsCallable<AssignProgramInput, AssignProgramResult>(
    fns(),
    "assignProgramToMember"
  )(input);
}

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
