export const collectionPaths = {
  gyms: "gyms",
  // Temporary global auth/profile index. Keep this until Firebase Auth custom
  // claims + authProfiles are the only login lookup path.
  profiles: "profiles",
  authProfiles: "profiles",
  memberships: "memberships",
  exerciseCatalog: "exerciseCatalog",
  exerciseRequests: "exerciseRequests",
  workoutPrograms: "workoutPrograms",
  notifications: "notifications",
  workoutSplitTemplates: "workoutSplitTemplates",
  liftLogs: "liftLogs",
  programAssignments: "programAssignments",
  activityEvents: "activityEvents",
  workoutSessions: "workoutSessions",
  contactMessages: "contactMessages",
  siteLinks: "siteLinks",
  attendanceRecords: "attendanceRecords",
  bodyMetricLogs: "bodyMetricLogs",
  dayLogs: "dayLogs",
  archives: "archives"
} as const;

export const gymScopedCollectionPaths = {
  members: "members",
  staff: "staff",
  exerciseCatalog: "exerciseCatalog",
  exerciseRequests: "exerciseRequests",
  workoutPrograms: "workoutPrograms",
  notifications: "notifications",
  workoutSplitTemplates: "workoutSplitTemplates",
  liftLogs: "liftLogs",
  programAssignments: "programAssignments",
  activityEvents: "activityEvents",
  workoutSessions: "workoutSessions",
  contactMessages: "contactMessages",
  siteLinks: "siteLinks",
  attendanceRecords: "attendanceRecords",
  bodyMetricLogs: "bodyMetricLogs",
  dayLogs: "dayLogs"
} as const;

export type GymScopedCollectionKey = keyof typeof gymScopedCollectionPaths;

export const PRIMARY_GYM_ID = "shg";
export const PRIMARY_OWNER_ID = "santosh-shg";

export function gymPath(gymId: string) {
  return `${collectionPaths.gyms}/${gymId}`;
}

export function gymCollectionPath(gymId: string, collection: GymScopedCollectionKey) {
  return `${gymPath(gymId)}/${gymScopedCollectionPaths[collection]}`;
}

export function gymDocPath(gymId: string, collection: GymScopedCollectionKey, docId: string) {
  return `${gymCollectionPath(gymId, collection)}/${docId}`;
}

export function gymProfileCollectionKey(role?: string) {
  return role === "member" ? "members" : "staff";
}
