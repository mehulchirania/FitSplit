export type MembershipStatus = "active" | "expiring_soon" | "expired";

export type Role = "admin" | "owner" | "trainer" | "member";

/**
 * Controls which members a trainer can see inside a gym.
 * Set on the gym doc (`trainerMemberVisibility`) and enforced in both
 * Firestore rules and server-side queries.
 *   assigned_only   — only PT members where `assignedTrainerId === trainer UID`
 *   all_pt_members  — all members with `isPT === true` in the same gym
 *   all_members     — every member in the same gym (maximum visibility)
 */
export type TrainerMemberVisibility = "assigned_only" | "all_pt_members" | "all_members";

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
  /**
   * UID of the single owner. Enforced by Cloud Function transaction.
   * Denormalised here so queries can filter by owner without a join.
   */
  ownerId?: string;
  status: "active" | "paused" | "inactive";
  /**
   * Governs which members trainers of this gym can see/query.
   * Defaults to "assigned_only" when not set.
   */
  trainerMemberVisibility?: TrainerMemberVisibility;
  expiryWarningDays: number;
  memberCount: number;
  logoUrl?: string;
  logoPath?: string;
  location?: string;
  /** Google Maps or similar URL for the gym's physical location */
  locationUrl?: string;
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

/**
 * Canonical record for a gym member.
 *
 * Combines the old list-view fields (formerly `Member`) with the extended
 * profile/training context fields (formerly `ProfileMetrics`) into a single
 * source of truth.  The two narrower aliases below preserve backward compat
 * so existing code that typed props as `Member` or `ProfileMetrics` continues
 * to compile without any changes.
 */
export type MemberProfile = {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  joinedAt: string;
  avatarInitials: string;
  /** Short fitness goal shown on member cards (e.g. "Build muscle"). */
  goal: string;
  isActive: boolean;
  username?: string;
  staffType?: "owner" | "trainer" | "staff";

  // ── Body metrics ──────────────────────────────────────────────────────────
  age?: number;
  weightKg?: number;
  heightCm?: number;

  // ── Extended profile / training context ───────────────────────────────────
  gender?: string;
  dob?: string;
  /** Long-form fitness goals from the profile form (distinct from the short `goal` field). */
  fitnessGoals?: string;
  medicalNotes?: string;
  primarySlot?: "A" | "B" | "C" | "D";
  secondarySlot?: "A" | "B" | "C" | "D";
  injuryNotes?: string;
  /** Display name of the assigned trainer (free-text, denormalised). */
  assignedTrainer?: string;
  /**
   * UID of the trainer staff record this member is assigned to.
   * Used for trainer-visibility queries and PT session filtering.
   */
  assignedTrainerId?: string;
  /** True when this member has an active personal-training arrangement. */
  isPT?: boolean;
  /**
   * Computed membership status — denormalised from the latest Membership doc
   * so member lists can be filtered/sorted without joining memberships.
   */
  membershipStatus?: MembershipStatus;
  /** ISO date (YYYY-MM-DD) of current membership expiry. */
  membershipEndDate?: string;
  /** Display name of the active package, e.g. "Monthly PT Pack". */
  currentPackageName?: string;
  macroNutritionTarget?: MacroNutritionTarget;
  coachNote?: string;
  coachNoteUpdatedAt?: string;
  coachNoteUpdatedByName?: string;
};

/**
 * List-view alias — only the fields needed to render a member card or table row.
 * Structurally identical to the old standalone `Member` type.
 */
export type Member = Pick<
  MemberProfile,
  | "id"
  | "fullName"
  | "email"
  | "phone"
  | "joinedAt"
  | "avatarInitials"
  | "goal"
  | "isActive"
  | "username"
  | "staffType"
  | "age"
  | "weightKg"
  | "heightCm"
  // PT / trainer-assignment fields for list-view filtering
  | "isPT"
  | "assignedTrainerId"
  | "membershipStatus"
  | "membershipEndDate"
  | "currentPackageName"
  // C4: Coach note preview shown on member cards via Radix Popover.
  | "coachNote"
  | "coachNoteUpdatedAt"
  | "coachNoteUpdatedByName"
>;

/**
 * A membership package definition — set by the gym owner.
 * Lives at: gyms/{gymId}/packages/{packageId}
 */
export type Package = {
  id: string;
  gymId: string;
  name: string;
  description?: string;
  /** Duration in months (e.g. 1, 3, 6, 12). */
  durationMonths: number;
  price: number;
  currency: string;
  /** Whether this package includes PT sessions. */
  includesPT?: boolean;
  /** Number of PT sessions included, if any. */
  ptSessionsIncluded?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

/**
 * A payment request raised when a member wants to renew/purchase a package.
 * Lives at: gyms/{gymId}/paymentRequests/{requestId}
 *
 * Approval flow:
 *   Cash  — owner approves manually → membership activated
 *   Card/UPI — integration-ready placeholder; does NOT activate without owner confirmation
 */
export type PaymentRequest = {
  id: string;
  gymId: string;
  memberId: string;
  memberName?: string;
  packageId: string;
  packageName?: string;
  amount: number;
  currency: string;
  method: "cash" | "card" | "upi" | "other";
  status: "pending" | "approved" | "rejected" | "cancelled";
  /** ISO datetime when request was raised. */
  requestedAt: string;
  /** ISO datetime when owner approved/rejected. */
  resolvedAt?: string;
  resolvedByName?: string;
  /** ID of the Membership doc created on approval. */
  membershipId?: string;
  notes?: string;
};

/**
 * A membership record — one per active or past membership period for a member.
 * Lives at: gyms/{gymId}/memberships/{membershipId}
 *
 * The `Member.membershipStatus`, `membershipEndDate`, and `currentPackageName`
 * fields on the member doc are denormalised snapshots kept in sync on approval.
 */
export type Membership = {
  id: string;
  gymId?: string;
  memberId: string;
  packageId?: string;
  /** Display name of the package at time of activation (survives package edits). */
  planName: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  status?: "active" | "expired" | "cancelled";
  paymentReference?: string;
  paymentRequestId?: string;
  activatedAt?: string;
  renewedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
};

/**
 * Pre-computed dashboard summary for a gym.
 * Lives at: gyms/{gymId}/summaries/dashboard (single doc, overwritten on recalc).
 * Avoids expensive full-collection scans on every owner dashboard load.
 */
export type DashboardSummary = {
  gymId: string;
  totalMembers: number;
  activeMembers: number;
  ptMembers: number;
  expiringThisWeek: number;
  expiredCount: number;
  pendingPaymentRequests: number;
  activeTrainers: number;
  totalRevenueMTD: number;
  currency: string;
  lastComputedAt: string;
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
  /** "predefined" = FitSplit default catalog; "custom" = gym-created or gym-overridden */
  source?: "predefined" | "custom";
  /**
   * Owner-controlled visibility of the DeltaBolic/TylerPath tutorial for members.
   * Defaults to true. When false the tutorial button is hidden on the member dashboard.
   */
  showTutorial?: boolean;
  /**
   * Concise anatomical description of what muscles this exercise targets and how.
   * Displayed as an informational pill in the exercise detail view during workouts.
   */
  muscleTargetDescription?: string;
};

export type WorkoutExercise = {
  exerciseId: string;
  sets?: number;
  reps?: string;
  durationSeconds?: number;
  restSeconds?: number;
  notes?: string;
  variationLabel?: string;
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
  bestFor?: string[];
  programStyle?: string;
  selectionHints?: {
    equipmentDemand: "low" | "medium" | "high";
    frequency: string;
    idealFor: string[];
    recoveryDemand: "low" | "medium" | "high";
    trainerNotes: string;
  };
  tags?: string[];
  weeklyVariations?: Array<{
    days: WorkoutDay[];
    title: string;
    week: number;
  }>;
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
    | "exercise_request"
    | "pt_session_booked"
    | "pt_session_started"
    | "pt_session_completed"
    | "pt_session_cancelled"
    | "pt_session_rescheduled";
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  exerciseRequestId?: string;
  /** Deep-link URL for the notification action (e.g. "/owner/members/abc123") */
  actionHref?: string;
  /** Member UID for member-related notifications */
  memberId?: string;
  /** PT session ID for PT-related notifications */
  ptSessionId?: string;
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
  /** "member" = self-logged (default); "trainer" = logged during a PT session */
  source?: "member" | "trainer";
  /** Present when source is "trainer" — links back to the PT session */
  ptSessionId?: string;
  /** UID of the trainer who logged this set */
  loggedByTrainerId?: string;
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

/**
 * Daily macro nutrition log entry — one document per member per calendar day.
 * Document ID: `${memberId}_${date}` — upsert semantics.
 * Lives at: gyms/{gymId}/macroLogs/{id}
 */
export type MacroLog = {
  id: string;
  memberId: string;
  gymId: string;
  /** Calendar date in YYYY-MM-DD format (local timezone) */
  date: string;
  protein: number;
  carbs: number;
  fat: number;
  /** Water in litres */
  water: number;
  loggedAt: string;
};

/**
 * Activity log entry for stretch or cardio sessions.
 * Lives at: gyms/{gymId}/activityLogs/{id}
 */
export type ActivityLog = {
  id: string;
  memberId: string;
  gymId: string;
  type: "stretch" | "cardio";
  name: string;
  /** Duration in minutes */
  duration?: number;
  /** Distance in km (cardio only) */
  distance?: number;
  notes?: string;
  loggedAt: string;
  sessionId?: string;
  /** "member" = self-logged (default); "trainer" = logged during a PT session */
  source?: "member" | "trainer";
  /** UID of the trainer who logged this entry (when source === "trainer") */
  loggedByTrainerId?: string;
  /** PT session ID this activity was logged within (when source === "trainer") */
  ptSessionId?: string;
};

/**
 * Detail-view alias — contact info + training context used by profile/edit forms.
 * Structurally identical to the old standalone `ProfileMetrics` type.
 */
export type ProfileMetrics = Pick<
  MemberProfile,
  | "fullName"
  | "email"
  | "phone"
  | "age"
  | "gender"
  | "dob"
  | "heightCm"
  | "weightKg"
  | "fitnessGoals"
  | "medicalNotes"
  | "primarySlot"
  | "secondarySlot"
  | "injuryNotes"
  | "assignedTrainer"
  | "macroNutritionTarget"
  | "coachNote"
  | "coachNoteUpdatedAt"
  | "coachNoteUpdatedByName"
>;

export type WorkoutSession = {
  id: string;
  memberId: string;
  gymId?: string;
  startedAt: string;
  endedAt?: string;
  status: "active" | "completed";
  /** Links the session to a specific program day for calendar display */
  programDayId?: string;
  programId?: string;
  dayTitle?: string;
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

/** Tracks whether the member has acted on the makeup suggestion for a skipped day */
export type MakeupStatus = "pending" | "added" | "dismissed";

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
  /** Top exercises from the skipped day that should be made up */
  makeupExerciseIds?: string[];
  /** Whether the member has acted on the makeup prompt */
  makeupStatus?: MakeupStatus;
  /** Day ID the member chose to fold the makeup exercises into (optional) */
  makeupTargetDayId?: string;
};

// ─── Personal Training ────────────────────────────────────────────────────────

export type PTSessionStatus =
  | "scheduled"   // booked but not yet started
  | "active"      // trainer tapped "Start session"
  | "completed"   // trainer tapped "End session"
  | "cancelled";  // cancelled before or during

/**
 * A personal-training booking between a trainer (staff) and a member.
 *
 * Lives at both:
 *   gyms/{gymId}/ptSessions/{sessionId}   (gym-scoped)
 *   ptSessions/{sessionId}                (root mirror for admin queries)
 *
 * Any owner or trainer in the gym can read/write any session so that
 * cover-trainer takeover is always possible.
 */
export type PTSession = {
  id: string;
  gymId: string;
  memberId: string;
  memberName?: string;
  /** UID of the assigned trainer (staff record with staffType "trainer") */
  trainerId: string;
  trainerName?: string;
  scheduledAt: string;       // ISO datetime of the booked slot
  durationMinutes: number;   // expected session length, e.g. 60
  planStartDate?: string;    // yyyy-mm-dd for longer PT plans
  planEndDate?: string;      // yyyy-mm-dd, calculated from planStartDate + planDurationDays
  planDurationDays?: number; // default 30 for monthly PT, owner-editable
  status: PTSessionStatus;
  /** ISO datetime when trainer tapped "Start" */
  startedAt?: string;
  /** ISO datetime when trainer tapped "End" */
  endedAt?: string;
  /** Exercises planned for this PT session before the trainer starts logging sets. */
  plannedExercises?: WorkoutExercise[];
  notes?: string;            // pre-session trainer notes / goals
  cancelReason?: string;
  createdAt: string;
  updatedAt?: string;
};

/**
 * A single lift set logged by a trainer during an active PT session.
 *
 * Lives at both:
 *   gyms/{gymId}/ptLiftLogs/{logId}
 *   ptLiftLogs/{logId}
 *
 * Also dual-written to liftLogs with source: "trainer" so the member's
 * workout history automatically includes PT-logged sets.
 */
export type PTLiftLog = {
  id: string;
  gymId: string;
  ptSessionId: string;
  memberId: string;
  trainerId: string;
  exerciseId: string;
  exerciseName?: string;
  weight: number;
  sets: number;
  reps: string;
  notes?: string;
  loggedAt: string;
};
