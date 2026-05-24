import { unstable_cache } from "next/cache";
import type { PTLiftLog, PTSession } from "@/types/domain";

import { collectionPaths } from "../collections";
import { getFirebaseAdminServices } from "../admin";
import { gymCollection, gymTag } from "./shared";

function mapPTSession(docId: string, data: Record<string, unknown>): PTSession {
  const plannedExercises = Array.isArray(data.plannedExercises)
    ? data.plannedExercises
        .map((item) => {
          const entry = item as Record<string, unknown>;
          const exerciseId = String(entry.exerciseId ?? "").trim();
          if (!exerciseId) return null;
          return {
            exerciseId,
            sets: Number(entry.sets ?? 3),
            reps: String(entry.reps ?? "8-12"),
            notes: entry.notes ? String(entry.notes) : undefined
          };
        })
        .filter(Boolean) as PTSession["plannedExercises"]
    : undefined;

  return {
    id: String(data.id ?? docId),
    gymId: String(data.gymId ?? ""),
    memberId: String(data.memberId ?? ""),
    memberName: data.memberName ? String(data.memberName) : undefined,
    trainerId: String(data.trainerId ?? ""),
    trainerName: data.trainerName ? String(data.trainerName) : undefined,
    scheduledAt: String(data.scheduledAt ?? ""),
    durationMinutes: Number(data.durationMinutes ?? 60),
    planStartDate: data.planStartDate ? String(data.planStartDate) : undefined,
    planEndDate: data.planEndDate ? String(data.planEndDate) : undefined,
    planDurationDays: data.planDurationDays ? Number(data.planDurationDays) : undefined,
    status: (data.status ?? "scheduled") as PTSession["status"],
    startedAt: data.startedAt ? String(data.startedAt) : undefined,
    endedAt: data.endedAt ? String(data.endedAt) : undefined,
    plannedExercises,
    notes: data.notes ? String(data.notes) : undefined,
    cancelReason: data.cancelReason ? String(data.cancelReason) : undefined,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined
  };
}

function mapPTLiftLog(docId: string, data: Record<string, unknown>): PTLiftLog {
  return {
    id: String(data.id ?? docId),
    gymId: String(data.gymId ?? ""),
    ptSessionId: String(data.ptSessionId ?? ""),
    memberId: String(data.memberId ?? ""),
    trainerId: String(data.trainerId ?? ""),
    exerciseId: String(data.exerciseId ?? ""),
    exerciseName: data.exerciseName ? String(data.exerciseName) : undefined,
    weight: Number(data.weight ?? 0),
    sets: Number(data.sets ?? 1),
    reps: String(data.reps ?? ""),
    notes: data.notes ? String(data.notes) : undefined,
    loggedAt: String(data.loggedAt ?? "")
  };
}

/**
 * All PT sessions for a gym, ordered by scheduledAt descending.
 * Used by the owner /owner/training hub and by trainers.
 */
async function getAllPTSessionsForGymUncached(gymId: string): Promise<PTSession[]> {
  const { db } = getFirebaseAdminServices();
  const snap = await gymCollection(db, gymId, "ptSessions")
    .orderBy("scheduledAt", "desc")
    .get();
  return snap.docs.map((d) => mapPTSession(d.id, d.data() as Record<string, unknown>));
}

export async function getAllPTSessionsForGym(gymId: string): Promise<PTSession[]> {
  return unstable_cache(
    getAllPTSessionsForGymUncached,
    ["read:getAllPTSessionsForGym", gymId],
    { tags: ["pt-sessions", gymTag(gymId)], revalidate: 30 }
  )(gymId);
}

/**
 * All PT sessions where trainerId === the given trainer UID.
 * Trainers see their own schedule here; owners see this per trainer.
 */
async function getPTSessionsForTrainerUncached(gymId: string, trainerId: string): Promise<PTSession[]> {
  const { db } = getFirebaseAdminServices();
  const snap = await gymCollection(db, gymId, "ptSessions")
    .where("trainerId", "==", trainerId)
    .orderBy("scheduledAt", "desc")
    .get();
  return snap.docs.map((d) => mapPTSession(d.id, d.data() as Record<string, unknown>));
}

export async function getPTSessionsForTrainer(gymId: string, trainerId: string): Promise<PTSession[]> {
  return unstable_cache(
    getPTSessionsForTrainerUncached,
    ["read:getPTSessionsForTrainer", gymId, trainerId],
    { tags: ["pt-sessions", gymTag(gymId)], revalidate: 30 }
  )(gymId, trainerId);
}

/**
 * All PT sessions for a specific member (their history + upcoming).
 */
async function getPTSessionsForMemberUncached(gymId: string, memberId: string): Promise<PTSession[]> {
  const { db } = getFirebaseAdminServices();
  const snap = await gymCollection(db, gymId, "ptSessions")
    .where("memberId", "==", memberId)
    .orderBy("scheduledAt", "desc")
    .get();
  return snap.docs.map((d) => mapPTSession(d.id, d.data() as Record<string, unknown>));
}

export async function getPTSessionsForMember(gymId: string, memberId: string): Promise<PTSession[]> {
  return unstable_cache(
    getPTSessionsForMemberUncached,
    ["read:getPTSessionsForMember", gymId, memberId],
    { tags: ["pt-sessions", gymTag(gymId)], revalidate: 30 }
  )(gymId, memberId);
}

/**
 * Fetch a single PT session by ID (reads from root collection for speed).
 */
async function getPTSessionDetailUncached(ptSessionId: string): Promise<PTSession | null> {
  const { db } = getFirebaseAdminServices();
  const snap = await db.collection(collectionPaths.ptSessions).doc(ptSessionId).get();
  if (!snap.exists) return null;
  return mapPTSession(snap.id, snap.data() as Record<string, unknown>);
}

export async function getPTSessionDetail(ptSessionId: string): Promise<PTSession | null> {
  return unstable_cache(
    getPTSessionDetailUncached,
    ["read:getPTSessionDetail", ptSessionId],
    { tags: ["pt-sessions"], revalidate: 15 }
  )(ptSessionId);
}

/**
 * All PT lift logs for a session, ordered by loggedAt ascending.
 */
async function getPTLiftLogsForSessionUncached(gymId: string, ptSessionId: string): Promise<PTLiftLog[]> {
  const { db } = getFirebaseAdminServices();
  const snap = await gymCollection(db, gymId, "ptLiftLogs")
    .where("ptSessionId", "==", ptSessionId)
    .orderBy("loggedAt", "asc")
    .get();
  return snap.docs.map((d) => mapPTLiftLog(d.id, d.data() as Record<string, unknown>));
}

export async function getPTLiftLogsForSession(gymId: string, ptSessionId: string): Promise<PTLiftLog[]> {
  return unstable_cache(
    getPTLiftLogsForSessionUncached,
    ["read:getPTLiftLogsForSession", gymId, ptSessionId],
    { tags: ["pt-lift-logs", gymTag(gymId)], revalidate: 15 }
  )(gymId, ptSessionId);
}
