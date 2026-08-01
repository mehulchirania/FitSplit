import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

/**
 * Typed wrappers around the mobile-write Cloud Functions (functions/src/index.ts).
 * Screens call these — never `httpsCallable` directly — so every server write
 * goes through one place. These callables do more than a rules-compliant
 * Firestore write (extra collection writes / increments), which is why they
 * exist as functions instead of client-SDK writes (docs/20_EXPO_MIGRATION_PLAN.md §3).
 */

export type LogLiftSetPayload = {
  memberId: string;
  exerciseId: string;
  reps: string;
  weightKg?: number;
  sets?: number;
  sessionId?: string;
};

type LogLiftSetResult = {
  status: "success";
  message: string;
  data?: { liftLogId: string; gymId: string; sessionId: string };
};

const logLiftSetCallable = httpsCallable<LogLiftSetPayload, LogLiftSetResult>(functions, "logLiftSetMobile");

/** logLiftSetMobile — writes the lift log and upserts the day's workout session + attendance record. */
export async function logLiftSet(payload: LogLiftSetPayload) {
  const { data } = await logLiftSetCallable(payload);
  return data;
}

export type LogMealPayload = {
  memberId: string;
  date: string;
  name: string;
  items?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

type LogMealResult = {
  status: "success";
  message: string;
  data?: { gymId: string; mealId: string };
};

const logMealCallable = httpsCallable<LogMealPayload, LogMealResult>(functions, "logMealMobile");

/** logMealMobile — writes the meal log and increments the day's macroLogs totals. */
export async function logMeal(payload: LogMealPayload) {
  const { data } = await logMealCallable(payload);
  return data;
}

export type LogBodyWeightPayload = {
  weightKg: number;
  bodyFatPct?: number;
  notes?: string;
  memberId?: string;
};

type LogBodyWeightResult = {
  status: "success";
  message: string;
  data?: { gymId: string };
};

const logBodyWeightCallable = httpsCallable<LogBodyWeightPayload, LogBodyWeightResult>(functions, "logBodyWeightMobile");

/** logBodyWeightMobile — writes a bodyMetricLogs entry and mirrors the weight onto the member profile. */
export async function logBodyWeight(payload: LogBodyWeightPayload) {
  const { data } = await logBodyWeightCallable(payload);
  return data;
}
