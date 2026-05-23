export const collectionPaths = {
  gyms: "gyms",
  // Legacy root profile collection. Full profile source-of-truth is now
  // gyms/{gymId}/members and gyms/{gymId}/staff; keep only for migration fallback.
  profiles: "profiles",
  // Root auth lookup index only. Do not store member metrics, medical notes,
  // program context, or other gym-owned profile data here.
  authProfiles: "authProfiles",
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
  archives: "archives",
  ptSessions: "ptSessions",
  ptLiftLogs: "ptLiftLogs"
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
  dayLogs: "dayLogs",
  ptSessions: "ptSessions",
  ptLiftLogs: "ptLiftLogs"
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
