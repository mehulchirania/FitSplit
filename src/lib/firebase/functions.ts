/**
 * Typed client-side wrappers for Firebase Cloud Functions that still have no
 * equivalent Server Action.
 */

import { httpsCallable } from "firebase/functions";
import { getFirebaseClientServices } from "./client";

function fns() {
  return getFirebaseClientServices().functions;
}

type FnResult<T = Record<string, unknown>> = {
  status: "success";
  message: string;
  data?: T;
} & T;

export type ArchiveMemberInput = { memberId: string };
export type ArchiveMemberResult = FnResult<{ message: string }>;

export function callArchiveMemberAccount(input: ArchiveMemberInput) {
  return httpsCallable<ArchiveMemberInput, ArchiveMemberResult>(
    fns(),
    "archiveMemberAccount"
  )(input);
}

export type ArchiveProgramInput = { programId: string };
export type ArchiveProgramResult = FnResult<{ message: string }>;

export function callArchiveCustomProgram(input: ArchiveProgramInput) {
  return httpsCallable<ArchiveProgramInput, ArchiveProgramResult>(
    fns(),
    "archiveCustomProgram"
  )(input);
}

export type ArchiveGymInput = { gymId: string };
export type ArchiveGymResult = FnResult<{ message: string }>;

export function callArchiveGymWorkspace(input: ArchiveGymInput) {
  return httpsCallable<ArchiveGymInput, ArchiveGymResult>(
    fns(),
    "archiveGymWorkspace"
  )(input);
}
