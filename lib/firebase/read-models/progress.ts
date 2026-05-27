import type { ActivityLog, BodyMetricLog, DayLog, LiftLog, MacroLog, MakeupStatus, SkipReason } from "@/types/domain";

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
        const validMakeupStatuses = new Set<string>(["pending", "added", "dismissed"]);
        const rawMakeupStatus = data.makeupStatus ? String(data.makeupStatus) : undefined;
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
          loggedAt: String(data.loggedAt ?? new Date().toISOString()),
          makeupExerciseIds: Array.isArray(data.makeupExerciseIds)
            ? (data.makeupExerciseIds as unknown[]).map(String)
            : undefined,
          makeupStatus: rawMakeupStatus && validMakeupStatuses.has(rawMakeupStatus)
            ? (rawMakeupStatus as MakeupStatus)
            : undefined,
          makeupTargetDayId: data.makeupTargetDayId ? String(data.makeupTargetDayId) : undefined
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

export type WorkoutCalendarDay = {
  date: string; // "YYYY-MM-DD"
  trained: boolean;
  skipped: boolean;
  makeupPending: boolean;
  dayTitle?: string;
  skipReason?: SkipReason;
};

/**
 * Build a calendar data map for the given member from their lift logs and day logs.
 * Returns a record keyed by "YYYY-MM-DD" date strings for the last `daysBack` days.
 * This is computed server-side from data we already have — no extra Firestore queries.
 */
export async function getMemberCalendarData(
  memberId: string,
  gymId?: string,
  daysBack = 90
): Promise<{ calendarDays: WorkoutCalendarDay[] }> {
  const [{ liftLogs }, { dayLogs }] = await Promise.all([
    getLiftLogsForMember(memberId, gymId),
    getDayLogsForMember(memberId, gymId)
  ]);

  // Build lookup: date → trained
  const trainedDates = new Set<string>();
  for (const log of liftLogs) {
    if (log.loggedAt) trainedDates.add(log.loggedAt.slice(0, 10));
  }

  // Build lookup: date → DayLog (using loggedAt as the calendar date)
  const skipByDate = new Map<string, DayLog>();
  for (const dl of dayLogs) {
    if (dl.status === "skipped" && dl.loggedAt) {
      const date = dl.loggedAt.slice(0, 10);
      const existing = skipByDate.get(date);
      // Keep most recent log per date
      if (!existing || dl.loggedAt > existing.loggedAt) {
        skipByDate.set(date, dl);
      }
    }
  }

  // Build the date range
  const now = new Date();
  const calendarDays: WorkoutCalendarDay[] = [];
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const skipLog = skipByDate.get(date);
    calendarDays.push({
      date,
      trained: trainedDates.has(date),
      skipped: Boolean(skipLog),
      makeupPending: skipLog?.makeupStatus === "pending",
      skipReason: skipLog?.skipReason
    });
  }

  // Return in chronological order (oldest first)
  calendarDays.reverse();

  return { calendarDays };
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

/**
 * Fetch the last N days of macro logs for a member.
 * Used to render macro history charts and the 7-day summary.
 */
export async function getMacroLogsForMember(
  memberId: string,
  gymId: string,
  days = 7
): Promise<{ macroLogs: MacroLog[] }> {
  if (!hasFirebaseAdminConfig()) return { macroLogs: [] };
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(`gyms/${gymId}/macroLogs`)
      .where("memberId", "==", memberId)
      .orderBy("date", "desc")
      .limit(days)
      .get();
    const macroLogs: MacroLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: String(data.memberId ?? memberId),
        gymId: String(data.gymId ?? gymId),
        date: String(data.date ?? ""),
        protein: Number(data.protein ?? 0),
        carbs: Number(data.carbs ?? 0),
        fat: Number(data.fat ?? 0),
        water: Number(data.water ?? 0),
        loggedAt: String(data.loggedAt ?? data.updatedAt ?? new Date().toISOString())
      };
    });
    return { macroLogs };
  } catch {
    return { macroLogs: [] };
  }
}

/**
 * Fetch recent activity logs (stretch/cardio) for a member.
 */
export async function getActivityLogsForMember(
  memberId: string,
  gymId: string,
  limit = 30
): Promise<{ activityLogs: ActivityLog[] }> {
  if (!hasFirebaseAdminConfig()) return { activityLogs: [] };
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db
      .collection(`gyms/${gymId}/activityLogs`)
      .where("memberId", "==", memberId)
      .orderBy("loggedAt", "desc")
      .limit(limit)
      .get();
    const activityLogs: ActivityLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const type = data.type === "cardio" ? "cardio" : "stretch";
      return {
        id: doc.id,
        memberId: String(data.memberId ?? memberId),
        gymId: String(data.gymId ?? gymId),
        type,
        name: String(data.name ?? ""),
        duration: data.duration != null ? Number(data.duration) : undefined,
        distance: data.distance != null ? Number(data.distance) : undefined,
        notes: data.notes ? String(data.notes) : undefined,
        loggedAt: String(data.loggedAt ?? new Date().toISOString()),
        sessionId: data.sessionId ? String(data.sessionId) : undefined
      };
    });
    return { activityLogs };
  } catch {
    return { activityLogs: [] };
  }
}
