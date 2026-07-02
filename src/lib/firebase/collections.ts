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
  ptLiftLogs: "ptLiftLogs",
  macroLogs: "macroLogs",
  activityLogs: "activityLogs",
  // Sparse index for atomic username uniqueness. Doc ID = normalized username.
  usernames: "usernames",
  // Sparse index for atomic phone uniqueness within a gym. Doc ID = gymId:normalizedPhone.
  phones: "phones",
  // Cross-gym admin aggregate. Single doc: platformSummaries/main.
  platformSummaries: "platformSummaries"
} as const;

export const gymScopedCollectionPaths = {
  members: "members",
  staff: "staff",
  exerciseCatalog: "exerciseCatalog",
  exerciseRequests: "exerciseRequests",
  workoutPrograms: "workoutPrograms",
  notifications: "notifications",
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
  ptLiftLogs: "ptLiftLogs",
  macroLogs: "macroLogs",
  activityLogs: "activityLogs",
  // Membership package definitions set by the gym owner.
  packages: "packages",
  // Per-member membership records (one per active/past period).
  memberships: "memberships",
  // Payment requests raised by members for package renewals/purchases.
  paymentRequests: "paymentRequests",
  // Pre-computed summary docs. Single doc: summaries/dashboard.
  summaries: "summaries"
} as const;

export type GymScopedCollectionKey = keyof typeof gymScopedCollectionPaths;

export const PRIMARY_GYM_ID = "shg";
export const PRIMARY_OWNER_ID = "santosh-shg";

function gymPath(gymId: string) {
  return `${collectionPaths.gyms}/${gymId}`;
}

export function gymCollectionPath(gymId: string, collection: GymScopedCollectionKey) {
  return `${gymPath(gymId)}/${gymScopedCollectionPaths[collection]}`;
}

export function gymProfileCollectionKey(role?: string) {
  return role === "member" ? "members" : "staff";
}
