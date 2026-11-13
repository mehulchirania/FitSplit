/**
 * Firestore layout (single-tenant per user):
 *
 *   users/{uid}                       profile document
 *   users/{uid}/<userCollections>/*   everything the user owns (active plan, logs, ...)
 */
export const collectionPaths = {
  users: "users"
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
