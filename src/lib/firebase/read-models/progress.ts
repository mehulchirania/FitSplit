import type { ActivityLog, BodyMetricLog, DayLog, LiftLog, MacroLog, MealLog, MakeupStatus, SkipReason } from "@/types/domain";

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
 * Build a calendar data map for the given member from their lift logs and day logs.
 * Returns a record keyed by "YYYY-MM-DD" date strings for the last `daysBack` days.
 * This is computed server-side from data we already have — no extra Firestore queries.
 */
  // Build lookup: date → trained
  // Build lookup: date → DayLog (using loggedAt as the calendar date)
  // Build the date range
export type MacroLogEntry = {
  protein: number;
  carbs: number;
  fat: number;
  water: number;
};

export async function getMacroLogForMember(
  uid: string,
  date: string
): Promise<{ macroLog: MacroLogEntry | null }> {
  if (!hasFirebaseAdminConfig()) return { macroLog: null };
  try {
    const { db } = getFirebaseAdminServices();
    const docId = date;
    const macroDoc = await userCollection(db, uid, "macroLogs").doc(docId)
      .get();
    if (!macroDoc.exists) return { macroLog: null };
    const data = macroDoc.data() ?? {};
    return {
      macroLog: {
        protein: Number(data.protein ?? 0),
        carbs: Number(data.carbs ?? 0),
        fat: Number(data.fat ?? 0),
        water: Number(data.water ?? 0)
      }
    };
  } catch (error) {
    reportReadModelError("getMacroLogForMember", error, { memberId: uid });
    return { macroLog: null };
  }
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

/** Fetch the itemized meal list for one calendar day — the "meal log" feed on the Macros screen. */
export async function getMealLogsForMember(
  uid: string,
  date: string
): Promise<{ mealLogs: MealLog[] }> {
  if (!hasFirebaseAdminConfig()) return { mealLogs: [] };
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await userCollection(db, uid, "mealLogs")
      .where("date", "==", date)
      .get();
    const mealLogs: MealLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: uid,
        date: String(data.date ?? date),
        name: String(data.name ?? "Meal"),
        items: data.items ? String(data.items) : undefined,
        kcal: Number(data.kcal ?? 0),
        protein: Number(data.protein ?? 0),
        carbs: Number(data.carbs ?? 0),
        fat: Number(data.fat ?? 0),
        loggedAt: String(data.loggedAt ?? new Date().toISOString())
      };
    });
    mealLogs.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
    return { mealLogs };
  } catch (error) {
    reportReadModelError("getMealLogsForMember", error, { memberId: uid, date });
    return { mealLogs: [] };
  }
}

/** Fetch the meals logged on the calendar day immediately before `todayDate` — powers "Repeat yesterday". */
export async function getYesterdaysMealsForMember(
  uid: string,
  todayDate: string
): Promise<{ mealLogs: MealLog[] }> {
  const yesterday = new Date(`${todayDate}T00:00:00`);
  if (Number.isNaN(yesterday.getTime())) return { mealLogs: [] };
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10);
  return getMealLogsForMember(uid, yesterdayDate);
}

/** One grouped suggestion for the nutrition Quick Add "Recent" row. */
export type MealSuggestion = {
  name: string;
  items?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** How many times this meal (grouped by trimmed, case-insensitive name) was logged in the lookback window. */
  frequency: number;
  lastLoggedAt: string;
};

/**
 * Groups a member's meals from the last `lookbackDays` days by name and
 * returns the most-frequently-logged ones, most frequent first (ties broken
 * by recency). Powers the personalized "Recent" quick-add row, which ranks
 * ahead of the generic static presets — by day three of real usage, what a
 * member actually eats is a far better default than six hardcoded items.
 */
export async function getRecentMealsForMember(
  uid: string,
  options: { lookbackDays?: number; limit?: number } = {}
): Promise<{ recentMeals: MealSuggestion[] }> {
  const { lookbackDays = 30, limit = 6 } = options;
  if (!hasFirebaseAdminConfig()) return { recentMeals: [] };
  try {
    const { db } = getFirebaseAdminServices();
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    const sinceDate = since.toISOString().slice(0, 10);

    const snapshot = await userCollection(db, uid, "mealLogs")
      .where("date", ">=", sinceDate)
      .orderBy("date", "asc")
      .limit(500)
      .get();

    const byName = new Map<string, MealSuggestion>();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const rawName = String(data.name ?? "").trim();
      if (!rawName) continue;
      const key = rawName.toLowerCase();
      const loggedAt = String(data.loggedAt ?? new Date().toISOString());
      const existing = byName.get(key);
      if (existing) {
        existing.frequency += 1;
        if (loggedAt > existing.lastLoggedAt) {
          existing.lastLoggedAt = loggedAt;
          existing.name = rawName;
          existing.items = data.items ? String(data.items) : existing.items;
          existing.kcal = Number(data.kcal ?? existing.kcal);
          existing.protein = Number(data.protein ?? existing.protein);
          existing.carbs = Number(data.carbs ?? existing.carbs);
          existing.fat = Number(data.fat ?? existing.fat);
        }
      } else {
        byName.set(key, {
          name: rawName,
          items: data.items ? String(data.items) : undefined,
          kcal: Number(data.kcal ?? 0),
          protein: Number(data.protein ?? 0),
          carbs: Number(data.carbs ?? 0),
          fat: Number(data.fat ?? 0),
          frequency: 1,
          lastLoggedAt: loggedAt
        });
      }
    }

    const recentMeals = Array.from(byName.values())
      .sort((a, b) => b.frequency - a.frequency || b.lastLoggedAt.localeCompare(a.lastLoggedAt))
      .slice(0, limit);

    return { recentMeals };
  } catch (error) {
    reportReadModelError("getRecentMealsForMember", error, { memberId: uid });
    return { recentMeals: [] };
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
