import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Difficulty, ProgramAssignment, WorkoutProgram } from "@/types/domain";

import {
  assignments as mockAssignments,
  programs as mockPrograms
} from "@/lib/mock-data";
import { applyCurrentWeeklyVariation } from "@/lib/split-library";
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
      ...applyCurrentWeeklyVariation(program),
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
  const predefinedSplitTypes = new Set(
    predefinedPrograms
      .filter((program) => program.splitType !== "custom")
      .map((program) => program.splitType)
  );
  const predefinedTitles = new Set(predefinedPrograms.map((program) => normalizeProgramTitle(program.title)));
  const gymProgramEntries = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const splitType = String(data.splitType ?? "custom") as WorkoutProgram["splitType"];
      const title = String(data.title ?? "Stored program");
      const scope = String(data.scope ?? "");
      const source = String(data.source ?? "");
      const storedGymId = String(data.gymId ?? "");
      const isPredefinedDoc =
        predefinedProgramIds.has(doc.id) ||
        scope === "default" ||
        source === "predefined" ||
        storedGymId === "global" ||
        (splitType !== "custom" && predefinedSplitTypes.has(splitType)) ||
        predefinedTitles.has(normalizeProgramTitle(title));
      const isCustomDoc =
        scope === "custom" ||
        source === "custom" ||
        source === "gym" ||
        data.isCustom === true ||
        (splitType === "custom" && !isPredefinedDoc);

      if (!isCustomDoc || isPredefinedDoc) {
        return null;
      }

      const program: WorkoutProgram = {
        id: doc.id,
        title,
        description: String(data.description ?? ""),
        goal: String(data.goal ?? "Structured training"),
        difficulty: String(data.difficulty ?? "intermediate") as Difficulty,
        daysPerWeek: Number(data.daysPerWeek ?? 1),
        source: "gym" as const,
        splitType,
        days: Array.isArray(data.days) ? data.days : []
      };

      return {
        migrated: data.mirroredFromRootCollection === true || Boolean(data.migratedFromRootPath),
        program
      };
    })
    .filter((entry): entry is { migrated: boolean; program: WorkoutProgram } => Boolean(entry));

  const gymProgramsBySignature = new Map<string, { migrated: boolean; program: WorkoutProgram }>();
  gymProgramEntries.forEach((entry) => {
    const key = `${normalizeProgramTitle(entry.program.title)}:${entry.program.daysPerWeek}:${entry.program.splitType}:${programDaySignature(entry.program)}`;
    const existing = gymProgramsBySignature.get(key);
    if (!existing || (existing.migrated && !entry.migrated)) {
      gymProgramsBySignature.set(key, entry);
    }
  });

  const gymPrograms: WorkoutProgram[] = Array.from(gymProgramsBySignature.values())
    .map((entry) => entry.program)
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
    { tags: ["programs", gymTag(gymId, "programs")], revalidate: 120 }
  )(gymId);
}

const getWorkoutProgramsRequestCached = cache(getWorkoutProgramsUncached);

function normalizeProgramTitle(title: string) {
  return title.toLowerCase().trim().replace(/\s+/g, " ");
}

function programDaySignature(program: WorkoutProgram) {
  return program.days
    .map((day) => `${normalizeProgramTitle(day.title)}:${day.exercises.map((item) => item.exerciseId).join(",")}`)
    .join("|");
}

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
