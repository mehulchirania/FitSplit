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

export type FnResult<T = Record<string, unknown>> = {
  status: "success";
  message: string;
  data?: T;
} & T;

// ── createMemberAccount ──────────────────────────────────────────────────────

export type CreateMemberInput = {
  gymId?: string;
  fullName: string;
  email?: string;
  phone: string;
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
  email?: string;
  phone: string;
  staffType?: "owner" | "trainer" | "staff";
};

export type CreateStaffResult = FnResult<{ staffId: string; message: string }>;

export function callCreateStaffAccount(input: CreateStaffInput) {
  return httpsCallable<CreateStaffInput, CreateStaffResult>(
    fns(),
    "createStaffAccount"
  )(input);
}

// ── gym admin ──────────────────────────────────────────────────────────────

export type CreateGymWorkspaceInput = {
  name: string;
  slug?: string;
  location?: string;
  locationUrl?: string;
  status?: "active" | "paused" | "inactive";
  phone?: string;
  email?: string;
};

export type CreateGymWorkspaceResult = FnResult<{ gymId: string }>;

export function callCreateGymWorkspace(input: CreateGymWorkspaceInput) {
  return httpsCallable<CreateGymWorkspaceInput, CreateGymWorkspaceResult>(
    fns(),
    "createGymWorkspace"
  )(input);
}

export type UpdateGymDetailsInput = {
  gymId: string;
  name: string;
  location?: string;
  locationUrl?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  expiryWarningDays?: number;
  radiusMeters?: number;
  latitude?: number;
  longitude?: number;
  trainerMemberVisibility?: "assigned_only" | "all_pt_members" | "all_members";
};

export type UpdateGymDetailsResult = FnResult;

export function callUpdateGymDetails(input: UpdateGymDetailsInput) {
  return httpsCallable<UpdateGymDetailsInput, UpdateGymDetailsResult>(
    fns(),
    "updateGymDetails"
  )(input);
}

export type UpdateGymLogoInput = {
  gymId: string;
  logoDataUrl: string;
};

export type UpdateGymLogoResult = FnResult<{
  logoPath: string;
  logoUrl: string;
}>;

export function callUpdateGymLogo(input: UpdateGymLogoInput) {
  return httpsCallable<UpdateGymLogoInput, UpdateGymLogoResult>(
    fns(),
    "updateGymLogo"
  )(input);
}

export type SetGymAccessStatusInput = {
  gymId: string;
  status: "active" | "paused" | "inactive";
};

export type SetGymAccessStatusResult = FnResult;

export function callSetGymAccessStatus(input: SetGymAccessStatusInput) {
  return httpsCallable<SetGymAccessStatusInput, SetGymAccessStatusResult>(
    fns(),
    "setGymAccessStatus"
  )(input);
}

export type ArchiveStaffInput = {
  gymId: string;
  userId: string;
};

export type ArchiveStaffResult = FnResult;

export function callArchiveStaffAccount(input: ArchiveStaffInput) {
  return httpsCallable<ArchiveStaffInput, ArchiveStaffResult>(
    fns(),
    "archiveStaffAccount"
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

// ── bulkToggleMemberAccess ────────────────────────────────────────────────

export type BulkToggleAccessInput = {
  gymId?: string;
  memberIds: string[];
  isActive: boolean;
};

export type BulkActionFailure = { memberId: string; message: string };
export type BulkToggleAccessResult = FnResult<{
  updated: number;
  failed: BulkActionFailure[];
}>;

export function callBulkToggleMemberAccess(input: BulkToggleAccessInput) {
  return httpsCallable<BulkToggleAccessInput, BulkToggleAccessResult>(
    fns(),
    "bulkToggleMemberAccess"
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

// ── bulkAssignProgram ─────────────────────────────────────────────────────

export type BulkAssignProgramInput = {
  gymId?: string;
  memberIds: string[];
  programId: string;
  programTitle?: string;
};

export type BulkAssignProgramResult = FnResult<{
  updated: number;
  failed: BulkActionFailure[];
}>;

export function callBulkAssignProgram(input: BulkAssignProgramInput) {
  return httpsCallable<BulkAssignProgramInput, BulkAssignProgramResult>(
    fns(),
    "bulkAssignProgram"
  )(input);
}

// ── assignPTPlan ──────────────────────────────────────────────────────────

export type AssignPTPlanInput = {
  gymId?: string;
  memberId: string;
  memberName?: string;
  trainerId: string;
  trainerName?: string;
  planStartDate: string;
  planDurationDays: number;
  plannedExercises: Array<{
    exerciseId: string;
    sets?: number;
    reps?: string;
    notes?: string;
  }>;
  notes?: string;
};

export type AssignPTPlanResult = FnResult<{
  ptPlanId: string;
  planEndDate: string;
}>;

export function callAssignPTPlan(input: AssignPTPlanInput) {
  return httpsCallable<AssignPTPlanInput, AssignPTPlanResult>(
    fns(),
    "assignPTPlan"
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

// ── Phase 2: Trainer / Package / Payment functions ────────────────────────────

export type AssignTrainerInput = { gymId: string; memberId: string; trainerId: string };
export function callAssignTrainerToPTMember(input: AssignTrainerInput) {
  return httpsCallable<AssignTrainerInput, FnResult>(fns(), "assignTrainerToPTMember")(input);
}

export type TrainerVisibilityInput = { gymId: string; visibility: "assigned_only" | "all_pt_members" | "all_members" };
export function callUpdateTrainerVisibility(input: TrainerVisibilityInput) {
  return httpsCallable<TrainerVisibilityInput, FnResult>(fns(), "updateTrainerVisibility")(input);
}

export type PackageInput = {
  gymId: string; packageId?: string; name: string; description?: string;
  durationMonths: number; price: number; currency?: string;
  includesPT?: boolean; ptSessionsIncluded?: number; isActive?: boolean;
};
export function callCreateOrUpdatePackage(input: PackageInput) {
  return httpsCallable<PackageInput, FnResult<{ packageId: string }>>(fns(), "createOrUpdatePackage")(input);
}

export type PaymentRequestInput = { gymId: string; packageId: string; method: string; memberId?: string };
export function callSubmitPaymentRequest(input: PaymentRequestInput) {
  return httpsCallable<PaymentRequestInput, FnResult<{ requestId: string }>>(fns(), "submitPaymentRequest")(input);
}

export type ResolvePaymentInput = { gymId: string; requestId: string; reason?: string };
export function callApprovePaymentRequest(input: ResolvePaymentInput) {
  return httpsCallable<ResolvePaymentInput, FnResult<{ membershipId: string }>>(fns(), "approvePaymentRequest")(input);
}
export function callRejectPaymentRequest(input: ResolvePaymentInput) {
  return httpsCallable<ResolvePaymentInput, FnResult>(fns(), "rejectPaymentRequest")(input);
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
