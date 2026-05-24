import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Difficulty, ProgramAssignment, WorkoutProgram } from "@/types/domain";

import {
  assignments as mockAssignments,
  programs as mockPrograms
} from "@/lib/mock-data";
import { collectionPaths, gymScopedCollectionPaths, PRIMARY_GYM_ID } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollection, gymTag } from "./shared";

export async function getWorkoutProgramsUncached(gymId?: string): Promise<{
  programs: WorkoutProgram[];
  isPersisted: boolean;
}> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;
  const predefinedPrograms: WorkoutProgram[] = mockPrograms
    .filter((program) => program.days.some((day) => day.exercises.length > 0))
    .map((program) => ({
      ...program,
      source: "predefined"
    }));

  if (!hasFirebaseAdminConfig()) {
    return { programs: predefinedPrograms, isPersisted: false };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await gymCollection(db, targetGymId, "workoutPrograms")
      .where("isActive", "==", true)
      .get();
    snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.workoutPrograms)
          .where("gymId", "==", targetGymId)
          .where("isActive", "==", true)
          .get()
      : scopedSnapshot;
  } catch {
    return { programs: predefinedPrograms, isPersisted: false };
  }

  const predefinedProgramIds = new Set(predefinedPrograms.map((program) => program.id));
  const gymPrograms: WorkoutProgram[] = snapshot.docs
    .filter((doc) => {
      const data = doc.data();
      return !(data.mirroredFromRootCollection === true && data.scope !== "custom" && predefinedProgramIds.has(doc.id));
    })
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title ?? "Stored program"),
        description: String(data.description ?? ""),
        goal: String(data.goal ?? "Structured training"),
        difficulty: String(data.difficulty ?? "intermediate") as Difficulty,
        daysPerWeek: Number(data.daysPerWeek ?? 1),
        source: "gym" as const,
        splitType: String(data.splitType ?? "custom") as WorkoutProgram["splitType"],
        days: Array.isArray(data.days) ? data.days : []
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));

  const programsById = new Map<string, WorkoutProgram>();
  predefinedPrograms.forEach((program) => programsById.set(program.id, program));
  gymPrograms.forEach((program) => programsById.set(program.id, program));

  const programs = Array.from(programsById.values()).sort((left, right) => {
    if (left.source !== right.source) {
      return left.source === "predefined" ? -1 : 1;
    }

    return left.title.localeCompare(right.title);
  });

  return { programs, isPersisted: true };
}

export async function getWorkoutPrograms(gymId?: string) {
  return unstable_cache(
    getWorkoutProgramsRequestCached,
    ["read:getWorkoutPrograms", gymId ?? "default"],
    { tags: ["programs", "gym-data", gymTag(gymId)], revalidate: 120 }
  )(gymId);
}

const getWorkoutProgramsRequestCached = cache(getWorkoutProgramsUncached);

export const getProgramAssignmentForMember = cache(async function getProgramAssignmentForMember(memberId: string, gymId?: string): Promise<{
  assignment: ProgramAssignment | null;
  isPersisted: boolean;
}> {
  return getProgramAssignmentForMemberUncached(memberId, gymId);
});

async function getProgramAssignmentForMemberUncached(memberId: string, gymId?: string): Promise<{
  assignment: ProgramAssignment | null;
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return {
      assignment:
        mockAssignments.find(
          (assignment) => assignment.memberId === memberId && assignment.status === "active"
        ) ?? null,
      isPersisted: false
    };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = gymId
      ? await gymCollection(db, gymId, "programAssignments")
          .where("memberId", "==", memberId)
          .where("status", "==", "active")
          .limit(1)
          .get()
      : await db
          .collectionGroup(gymScopedCollectionPaths.programAssignments)
          .where("memberId", "==", memberId)
          .where("status", "==", "active")
          .limit(1)
          .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.programAssignments)
          .where("memberId", "==", memberId)
          .where("status", "==", "active")
          .limit(1)
          .get()
      : scopedSnapshot;

    if (snapshot.empty) {
      return { assignment: null, isPersisted: true };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      assignment: {
        id: doc.id,
        memberId: String(data.memberId ?? ""),
        programId: String(data.programId ?? ""),
        assignedAt: String(data.assignedAt ?? new Date().toISOString()),
        status: String(data.status ?? "active") as ProgramAssignment["status"]
      },
      isPersisted: true
    };
  } catch {
    return {
      assignment:
        mockAssignments.find(
          (assignment) => assignment.memberId === memberId && assignment.status === "active"
        ) ?? null,
      isPersisted: false
    };
  }
}

export const getActiveProgramAssignments = cache(async function getActiveProgramAssignments(gymId?: string): Promise<{
  assignments: ProgramAssignment[];
  isPersisted: boolean;
}> {
  return getActiveProgramAssignmentsUncached(gymId);
});

async function getActiveProgramAssignmentsUncached(gymId?: string): Promise<{
  assignments: ProgramAssignment[];
  isPersisted: boolean;
}> {
  const targetGymId = gymId ?? PRIMARY_GYM_ID;
  const fallback = mockAssignments.filter((assignment) => assignment.status === "active");

  if (!hasFirebaseAdminConfig()) {
    return { assignments: fallback, isPersisted: false };
  }

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await gymCollection(db, targetGymId, "programAssignments")
      .where("status", "==", "active")
      .limit(500)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.programAssignments)
          .where("gymId", "==", targetGymId)
          .where("status", "==", "active")
          .limit(500)
          .get()
      : scopedSnapshot;

    const assignments: ProgramAssignment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: String(data.memberId ?? ""),
        programId: String(data.programId ?? ""),
        assignedAt: String(data.assignedAt ?? new Date().toISOString()),
        status: String(data.status ?? "active") as ProgramAssignment["status"]
      };
    });

    return { assignments, isPersisted: true };
  } catch {
    return { assignments: fallback, isPersisted: false };
  }
}
