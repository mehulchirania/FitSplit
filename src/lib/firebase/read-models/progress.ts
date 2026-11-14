import type { ActivityLog, BodyMetricLog, DayLog, LiftLog, MacroLog, MakeupStatus, SkipReason } from "@/types/domain";

import { getFirebaseAdminServices, hasFirebaseAdminConfig } from "../admin";
import { userCollection, reportReadModelError } from "./shared";

export async function getBodyMetricLogsForMember(uid: string, limit = 365): Promise<{
  logs: BodyMetricLog[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { logs: [], isPersisted: false };
  }
  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await userCollection(db, uid, "bodyMetricLogs").orderBy("loggedAt", "desc").limit(limit).get();
    const logs: BodyMetricLog[] = scopedSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          memberId: uid,
          weightKg: Number(data.weightKg ?? 0),
          bodyFatPct: data.bodyFatPct != null ? Number(data.bodyFatPct) : undefined,
          notes: data.notes ? String(data.notes) : undefined,
          loggedAt: String(data.loggedAt ?? data.createdAt ?? new Date().toISOString())
        };
      })
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
    return { logs, isPersisted: true };
  } catch (error) {
    reportReadModelError("getBodyMetricLogsForMember", error, { memberId: uid });
    return { logs: [], isPersisted: false };
  }
}

export async function getDayLogsForMember(uid: string, limit = 365): Promise<{
  dayLogs: DayLog[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { dayLogs: [], isPersisted: false };
  }
  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await userCollection(db, uid, "dayLogs").orderBy("loggedAt", "desc").limit(limit).get();
    const validSkipReasons = new Set<string>(["rest", "no_time", "equipment", "sick", "other"]);
    const dayLogs: DayLog[] = scopedSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        const rawReason = data.skipReason ? String(data.skipReason) : undefined;
        const rawStatus = String(data.status ?? "skipped");
        const validMakeupStatuses = new Set<string>(["pending", "added", "dismissed"]);
        const rawMakeupStatus = data.makeupStatus ? String(data.makeupStatus) : undefined;
        return {
          id: doc.id,
          memberId: uid,
          programId: String(data.programId ?? ""),
          dayId: String(data.dayId ?? ""),
          weekStart: String(data.weekStart ?? ""),
          status: rawStatus === "completed" || rawStatus === "modified" ? rawStatus : "skipped",
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
    reportReadModelError("getDayLogsForMember", error, { memberId: uid });
    return { dayLogs: [], isPersisted: false };
  }
}

/**
 * Normalizes a raw LiftLog doc into one-or-more single-set LiftLog entries.
 *
 * Contract: every LiftLog written after the per-set normalization has
 * `sets === 1` — one record per set (see logLiftSet in
 * src/lib/firebase/actions/progress.ts). Some records predate that contract
 * and still store an aggregate `sets: N` with either a single `reps` value
 * (applied uniformly) or a comma-separated per-set string like "8,8,7".
 * Expand those into N synthetic single-set rows here so every consumer
 * downstream (ProgressChart, lift history table, PR/volume calculations) can
 * assume `sets === 1` and never has to special-case legacy data. We never
 * rewrite the underlying Firestore doc — this expansion happens only at read
 * time.
 */
function expandLegacyLiftLog(log: LiftLog): LiftLog[] {
  const rawSets = Math.round(log.sets);
  if (!Number.isFinite(rawSets) || rawSets <= 1) {
    return [{ ...log, sets: 1 }];
  }

  const repsParts = log.reps
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return Array.from({ length: rawSets }, (_, index) => ({
    ...log,
    id: `${log.id}#set${index + 1}`,
    sets: 1,
    reps: repsParts[index] ?? repsParts[repsParts.length - 1] ?? log.reps,
    setIndex: log.setIndex ?? index + 1
  }));
}

export async function getLiftLogsForMember(uid: string, limit = 500): Promise<{
  liftLogs: LiftLog[];
  isPersisted: boolean;
}> {
  if (!hasFirebaseAdminConfig()) {
    return { liftLogs: [], isPersisted: false };
  }

  let snapshot;

  try {
    const { db } = getFirebaseAdminServices();
    const scopedSnapshot = await userCollection(db, uid, "liftLogs").orderBy("loggedAt", "desc").limit(limit).get();
    snapshot = scopedSnapshot;
  } catch (error) {
    reportReadModelError("getLiftLogsForMember", error, { memberId: uid });
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
        memberId: uid,
        exerciseId: String(data.exerciseId ?? ""),
        weight: Number(data.weight ?? 0),
        sets: Number(data.sets ?? 1),
        reps: String(data.reps ?? ""),
        sessionId: String(data.sessionId ?? ""),
        loggedAt: String(data.loggedAt ?? data.createdAt ?? new Date().toISOString()),
        setIndex: data.setIndex != null ? Number(data.setIndex) : undefined
      };
    })
    .flatMap(expandLegacyLiftLog)
    .sort((left, right) => right.loggedAt.localeCompare(left.loggedAt));

  return { liftLogs, isPersisted: true };
}

/**
 * Fetch the last N days of macro logs for a member.
 * Used to render macro history charts and the 7-day summary.
 */
export async function getMacroLogsForMember(
  uid: string,
  days = 7
): Promise<{ macroLogs: MacroLog[] }> {
  if (!hasFirebaseAdminConfig()) return { macroLogs: [] };
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await userCollection(db, uid, "macroLogs")
      .orderBy("date", "desc")
      .limit(days)
      .get();
    const macroLogs: MacroLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: uid,
        date: String(data.date ?? ""),
        protein: Number(data.protein ?? 0),
        carbs: Number(data.carbs ?? 0),
        fat: Number(data.fat ?? 0),
        water: Number(data.water ?? 0),
        loggedAt: String(data.loggedAt ?? data.updatedAt ?? new Date().toISOString())
      };
    });
    return { macroLogs };
  } catch (error) {
    reportReadModelError("getMacroLogsForMember", error, { memberId: uid });
    return { macroLogs: [] };
  }
}

/**
 * Fetch recent activity logs (stretch/cardio) for a member.
 */
export async function getActivityLogsForMember(
  uid: string,
  limit = 30
): Promise<{ activityLogs: ActivityLog[] }> {
  if (!hasFirebaseAdminConfig()) return { activityLogs: [] };
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await userCollection(db, uid, "activityLogs")
      .orderBy("loggedAt", "desc")
      .limit(limit)
      .get();
    const activityLogs: ActivityLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const type = data.type === "cardio" ? "cardio" : "stretch";
      return {
        id: doc.id,
        memberId: uid,
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
  } catch (error) {
    reportReadModelError("getActivityLogsForMember", error, { memberId: uid });
    return { activityLogs: [] };
  }
}
