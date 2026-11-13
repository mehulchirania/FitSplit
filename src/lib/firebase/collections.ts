/**
 * Firestore layout (single-tenant per user):
 *
 *   users/{uid}                       profile document
 *   users/{uid}/<userCollections>/*   everything the user owns (active plan, logs, ...)
 */
export const collectionPaths = {
  users: "users",
  // Server-only sign-in attempt counters (see lib/pin-lockout.ts). Client rules deny it.
  loginAttempts: "loginAttempts"
} as const;

const userCollectionPaths = {
  programAssignments: "programAssignments",
  liftLogs: "liftLogs",
  bodyMetricLogs: "bodyMetricLogs",
  dayLogs: "dayLogs",
  macroLogs: "macroLogs",
  mealLogs: "mealLogs",
  activityLogs: "activityLogs",
  workoutSessions: "workoutSessions",
  // Finished rehab routine runs (history only; never counted toward the streak).
  rehabSessions: "rehabSessions",
  // Plans the user built themselves (doc per plan, days + exercises nested).
  customPrograms: "customPrograms",
  // The user's exercise substitutions for one program day (doc per dayId).
  exerciseSwaps: "exerciseSwaps"
} as const;

export type UserCollectionKey = keyof typeof userCollectionPaths;

function userDocPath(uid: string) {
  return `${collectionPaths.users}/${uid}`;
}

export function userCollectionPath(uid: string, collection: UserCollectionKey) {
  return `${userDocPath(uid)}/${userCollectionPaths[collection]}`;
}
