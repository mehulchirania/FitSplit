import type { BodyMetricLog, DayLog, LiftLog, SkipReason } from "@/types/domain";

import { collectionPaths, gymScopedCollectionPaths } from "../collections";
import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { gymCollection } from "./shared";

export async function getBodyMetricLogsForMember(memberId: string): Promise<{
  logs: BodyMetricLog[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { logs: [], isPersisted: false };
  }
  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await db
      .collectionGroup(gymScopedCollectionPaths.bodyMetricLogs)
      .where("memberId", "==", memberId)
      .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.bodyMetricLogs)
          .where("memberId", "==", memberId)
          .get()
      : scopedSnapshot;
    const logs: BodyMetricLog[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          memberId: String(data.memberId ?? memberId),
          gymId: data.gymId ? String(data.gymId) : undefined,
          weightKg: Number(data.weightKg ?? 0),
          bodyFatPct: data.bodyFatPct != null ? Number(data.bodyFatPct) : undefined,
          notes: data.notes ? String(data.notes) : undefined,
          loggedAt: String(data.loggedAt ?? data.createdAt ?? new Date().toISOString())
        };
      })
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
    return { logs, isPersisted: true };
  } catch (error) {
    console.warn("getBodyMetricLogsForMember failed:", error);
    return { logs: [], isPersisted: false };
  }
}

export async function getDayLogsForMember(memberId: string, gymId?: string): Promise<{
  dayLogs: DayLog[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { dayLogs: [], isPersisted: false };
  }
  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = gymId
      ? await gymCollection(db, gymId, "dayLogs").where("memberId", "==", memberId).get()
      : await db
          .collectionGroup(gymScopedCollectionPaths.dayLogs)
          .where("memberId", "==", memberId)
          .get();
    const snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.dayLogs)
          .where("memberId", "==", memberId)
          .get()
      : scopedSnapshot;
    const validSkipReasons = new Set<string>(["rest", "no_time", "equipment", "sick", "other"]);
    const dayLogs: DayLog[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const rawReason = data.skipReason ? String(data.skipReason) : undefined;
        return {
          id: doc.id,
          memberId: String(data.memberId ?? memberId),
          gymId: data.gymId ? String(data.gymId) : undefined,
          programId: String(data.programId ?? ""),
          dayId: String(data.dayId ?? ""),
          weekStart: String(data.weekStart ?? ""),
          status: data.status === "modified" ? "modified" : "skipped",
          skipReason: rawReason && validSkipReasons.has(rawReason) ? (rawReason as SkipReason) : undefined,
          note: data.note ? String(data.note) : undefined,
          loggedAt: String(data.loggedAt ?? new Date().toISOString())
        } satisfies DayLog;
      })
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
    return { dayLogs, isPersisted: true };
  } catch (error) {
    console.warn("getDayLogsForMember failed:", error);
    return { dayLogs: [], isPersisted: false };
  }
}

export async function getLiftLogsForMember(memberId: string, gymId?: string): Promise<{
  liftLogs: LiftLog[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { liftLogs: [], isPersisted: false };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = gymId
      ? await gymCollection(db, gymId, "liftLogs").where("memberId", "==", memberId).get()
      : await db
          .collectionGroup(gymScopedCollectionPaths.liftLogs)
          .where("memberId", "==", memberId)
          .get();
    snapshot = scopedSnapshot.empty
      ? await db
          .collection(collectionPaths.liftLogs)
          .where("memberId", "==", memberId)
          .get()
      : scopedSnapshot;
  } catch {
    return { liftLogs: [], isPersisted: false };
  }

  if (snapshot.empty) {
    return { liftLogs: [], isPersisted: true };
  }

  const liftLogs: LiftLog[] = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: String(data.memberId ?? memberId),
        exerciseId: String(data.exerciseId ?? ""),
        weight: Number(data.weight ?? 0),
        sets: Number(data.sets ?? 1),
        reps: String(data.reps ?? ""),
        sessionId: String(data.sessionId ?? ""),
        loggedAt: String(data.loggedAt ?? data.createdAt ?? new Date().toISOString())
      };
    })
    .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));

  return { liftLogs, isPersisted: true };
}

export type MacroLogEntry = {
  protein: number;
  carbs: number;
  fat: number;
  water: number;
};

export async function getMacroLogForMember(
  memberId: string,
  gymId: string,
  date: string
): Promise<{ macroLog: MacroLogEntry | null }> {
  if (!hasFirebaseAdminConfig()) return { macroLog: null };
  try {
    const { db } = getFirebaseAdminServices();
    const docId = `${memberId}_${date}`;
    const gymDoc = await db
      .collection(`gyms/${gymId}/macroLogs`)
      .doc(docId)
      .get();
    if (!gymDoc.exists) return { macroLog: null };
    const data = gymDoc.data() ?? {};
    return {
      macroLog: {
        protein: Number(data.protein ?? 0),
        carbs: Number(data.carbs ?? 0),
        fat: Number(data.fat ?? 0),
        water: Number(data.water ?? 0)
      }
    };
  } catch {
    return { macroLog: null };
  }
}
