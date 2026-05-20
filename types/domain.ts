export type MembershipStatus = "active" | "expiring_soon" | "expired";

export type Role = "admin" | "owner" | "member";

export type VideoSource = "upload" | "youtube" | "vimeo" | "none";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Legs"
  | "Core"
  | "Cardio";

export type GymNoticeType = "rule" | "tip" | "reminder" | "announcement";

export type GymNotice = {
  id: string;
  type: GymNoticeType;
  title: string;
  body?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
};

export type GymWorkspace = {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerUserId: string;
  status: "active" | "paused" | "inactive";
  expiryWarningDays: number;
  memberCount: number;
  logoUrl?: string;
  logoPath?: string;
  location?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  notices?: GymNotice[];
};

export type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  joinedAt: string;
  avatarInitials: string;
  goal: string;
  isActive: boolean;
  username?: string;
  staffType?: "owner" | "trainer" | "staff";
  age?: number;
  weightKg?: number;
  heightCm?: number;
};

export type Membership = {
  id: string;
  memberId: string;
  planName: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  paymentReference?: string;
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  instructions: string;
  videoSource: VideoSource;
  videoUrl: string;
  gymVideoUrl: string;
  gymVideoSource: VideoSource;
  thumbnailUrl: string;
  ownerOnly: boolean;
};

export type WorkoutExercise = {
  exerciseId: string;
  sets?: number;
  reps?: string;
  durationSeconds?: number;
  restSeconds?: number;
  notes?: string;
};

export type WorkoutDay = {
  id: string;
  title: string;
  dayNumber: number;
  focus: string;
  exercises: WorkoutExercise[];
};

export type WorkoutProgram = {
  id: string;
  title: string;
  description: string;
  goal: string;
  difficulty: Difficulty;
  daysPerWeek: number;
  source?: "predefined" | "gym";
  splitType:
    | "ppl_x2"
    | "ppl_upper_lower"
    | "bro_split"
    | "combo_x2"
    | "custom";
  days: WorkoutDay[];
};

export type ProgramAssignment = {
  id: string;
  memberId: string;
  programId: string;
  assignedAt: string;
  status: "active" | "completed" | "cancelled";
};

export type Notification = {
  id: string;
  recipientRole: Role;
  recipientId: string;
  type:
    | "membership_expiring_soon"
    | "membership_expired"
    | "membership_renewed"
    | "program_assigned"
    | "contact_message"
    | "password_reset_request"
    | "member_access_toggled"
    | "member_created"
    | "access_suspended"
    | "access_restored"
    | "exercise_request";
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  exerciseRequestId?: string;
};

export type ExerciseRequest = {
  id: string;
  gymId: string;
  gymName?: string;
  requestedBy: string;
  name: string;
  muscleGroup: string;
  equipment?: string;
  instructions?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
};

export type LiftLog = {
  id: string;
  memberId: string;
  exerciseId: string;
  weight: number;
  sets: number;
  reps: string;
  sessionId: string;
  loggedAt: string;
};

export type BodyMetricLog = {
  id: string;
  memberId: string;
  gymId?: string;
  weightKg: number;
  bodyFatPct?: number;
  notes?: string;
  loggedAt: string;
};

export type ActivityEvent = {
  id: string;
  audience: "owner" | "member";
  memberId?: string;
  title: string;
  detail: string;
  icon: "activity" | "bell" | "dumbbell" | "users";
  createdAt: string;
};

export type SiteLink = {
  id: string;
  label: string;
  href: string;
};

export type MacroNutritionTarget = {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  waterLiters?: number;
  notes?: string;
};

export type ProfileMetrics = {
  fullName: string;
  email: string;
  phone: string;
  age?: number;
  gender?: string;
  dob?: string;
  heightCm?: number;
  weightKg?: number;
  fitnessGoals?: string;
  medicalNotes?: string;
  primarySlot?: "A" | "B" | "C" | "D";
  secondarySlot?: "A" | "B" | "C" | "D";
  injuryNotes?: string;
  assignedTrainer?: string;
  macroNutritionTarget?: MacroNutritionTarget;
  coachNote?: string;
  coachNoteUpdatedAt?: string;
  coachNoteUpdatedByName?: string;
};

export type WorkoutSession = {
  id: string;
  memberId: string;
  gymId?: string;
  startedAt: string;
  endedAt?: string;
  status: "active" | "completed";
};

export type AttendanceRecord = {
  id: string;
  memberId: string;
  gymId?: string;
  sessionId?: string;
  checkInAt: string;
  checkOutAt?: string;
  latitude?: number | null;
  longitude?: number | null;
  deviceInfo?: string;
  distanceMeters?: number | null;
  geofenceStatus?: "inside" | "not_configured" | "location_not_provided";
  radiusMeters?: number;
};

export type ContactMessage = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  body: string;
  status: "unread" | "read";
  createdAt: string;
  updatedAt: string;
};

export type SkipReason = "rest" | "no_time" | "equipment" | "sick" | "other";

/**
 * Records when a member intentionally deviates from their planned day for a
 * given week. Two statuses:
 *   "skipped"  — member did not train that day (with an optional reason).
 *   "modified" — member did something other than the assigned plan (free-text note).
 *
 * The document ID is deterministic: `${memberId}_${dayId}_${weekStart}` so
 * a second save for the same slot is an upsert, not a duplicate.
 */
export type DayLog = {
  id: string;
  memberId: string;
  gymId?: string;
  programId: string;
  dayId: string;
  /** ISO date string of that week's Monday, e.g. "2026-05-18" */
  weekStart: string;
  status: "skipped" | "modified";
  skipReason?: SkipReason;
  /** Free-text note — what they did instead, or extra context for the skip */
  note?: string;
  loggedAt: string;
};
