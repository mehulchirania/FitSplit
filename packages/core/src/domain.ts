type MembershipStatus = "active" | "expiring_soon" | "expired";

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

type VideoSource = "upload" | "youtube" | "vimeo" | "none";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Legs"
  | "Core"
  | "Cardio"
  | "Forearms";

type MuscleTargetId =
  | "chest.upper"
  | "chest.mid"
  | "chest.lower"
  | "chest.pec_minor"
  | "chest.serratus"
  | "back.lats"
  | "back.teres_major"
  | "back.rhomboids"
  | "back.mid_traps"
  | "back.lower_traps"
  | "back.upper_traps"
  | "back.rear_delt"
  | "back.spinal_erectors"
  | "back.scapular_stabilizers"
  | "shoulders.front_delt"
  | "shoulders.side_delt"
  | "shoulders.rear_delt"
  | "shoulders.rotator_cuff"
  | "shoulders.supraspinatus"
  | "shoulders.infraspinatus"
  | "shoulders.teres_minor"
  | "shoulders.subscapularis"
  | "biceps.long_head"
  | "biceps.short_head"
  | "biceps.brachialis"
  | "biceps.brachioradialis"
  | "forearms.flexors"
  | "forearms.extensors"
  | "forearms.grip"
  | "triceps.long_head"
  | "triceps.lateral_head"
  | "triceps.medial_head"
  | "triceps.full"
  | "legs.quads_rectus_femoris"
  | "legs.quads_vastus_lateralis"
  | "legs.quads_vastus_medialis"
  | "legs.quads_vastus_intermedius"
  | "legs.hamstrings_biceps_femoris"
  | "legs.hamstrings_semitendinosus"
  | "legs.hamstrings_semimembranosus"
  | "legs.glute_max"
  | "legs.glute_med"
  | "legs.glute_min"
  | "legs.adductors"
  | "legs.abductors"
  | "legs.hip_flexors"
  | "legs.calves_gastrocnemius"
  | "legs.calves_soleus"
  | "core.rectus_abdominis"
  | "core.transverse_abdominis"
  | "core.external_obliques"
  | "core.internal_obliques"
  | "core.spinal_erectors"
  | "core.multifidus"
  | "core.ql"
  | "cardio.steady_state"
  | "cardio.incline_walk"
  | "cardio.hiit"
  | "cardio.cycling"
  | "cardio.rowing"
  | "cardio.sled"
  | "cardio.full_body_conditioning";

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

/**
 * Whether a workspace is a real gym or a solo consumer's private workspace.
 * See `GymWorkspace.type` — absent always means "business".
 */
export type WorkspaceType = "business" | "personal";

/** Billing plan attached to a consumer account. Always "free" today (no billing exists). */
export type ConsumerPlan = "free" | "pro";

/**
 * One account's membership of one workspace, stored at
 * `authProfiles/{uid}/affiliations/{gymId}`.
 *
 * An account has exactly one affiliation per workspace it belongs to: its own
 * personal workspace, plus one per real gym that has enrolled it. This is what
 * lets a consumer who later joins a gym keep a single identity instead of
 * registering twice.
 */
export type Affiliation = {
  gymId: string;
  gymName: string;
  type: WorkspaceType;
  /** The role this account holds *in this workspace* — it can differ per gym. */
  role: Role;
  /** The account's member/staff doc id inside this workspace. */
  memberId: string;
  /** "left" affiliations are retained so the user keeps their history. */
  status: "active" | "left";
  joinedAt: string;
  leftAt?: string;
};

/** True when a workspace is a solo consumer's, not a real gym. */
export function isPersonalWorkspace(gym: Pick<GymWorkspace, "type"> | null | undefined): boolean {
  return gym?.type === "personal";
}

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
  /**
   * Which kind of workspace this is.
   *   business — a real gym with staff, members, packages, and attendance.
   *   personal — a self-coached consumer's private workspace (`personal-{uid}`),
   *              where the consumer is the sole member and there is no staff doc.
   *
   * Absent means "business": every gym that existed before B2C predates this
   * field, so the undefined case must keep behaving exactly as it always has.
   * Read it through `isPersonalWorkspace()` rather than comparing directly.
   */
  type?: WorkspaceType;
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
  subscription?: {
    tier: string;
    billedUntil?: string;
    stripeCustomerId?: string;
  };
  limits?: {
    maxMembers?: number;
    maxStorage?: number;
  };
  /**
   * Whether this gym is discoverable on the public `/discover` marketplace.
   * Absent/false ⇒ not listed. Owner-controlled toggle in gym settings.
   */
  isPubliclyListed?: boolean;
  /** Present only when `isPubliclyListed` is true. Public-facing marketing copy. */
  publicListing?: PublicListing;
};

/**
 * Public-facing marketing info shown on the `/discover` marketplace for a gym
 * that has opted in via `GymWorkspace.isPubliclyListed`. Distinct from the
 * gym's internal `location`/`logoUrl` fields so owners can curate what
 * strangers see without touching operational data.
 */
export type PublicListing = {
  description: string;
  city: string;
  coverImageUrl?: string;
};

/**
 * A consumer's request to join a real (business) gym found via the
 * marketplace. Lives at `gyms/{gymId}/joinRequests/{requestId}`.
 *
 * Unlike an owner-issued invite, this is initiated by the consumer and must
 * be approved by the gym owner before an `Affiliation` is created — gyms are
 * physical businesses with capacity, so joining is not instant.
 */
export type JoinRequest = {
  id: string;
  gymId: string;
  gymName?: string;
  requesterUid: string;
  requesterName: string;
  requesterPhone?: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  resolvedAt?: string;
  resolvedByName?: string;
};

/**
 * An append-only record of a consumer subscription action (upgrade request,
 * cancellation, etc.). Lives at `authProfiles/{uid}/subscriptionEvents/{id}`.
 *
 * v1 has no real payment gateway — see `src/lib/billing/provider.ts`. Every
 * event here is a `StubBillingProvider` intent record, not a real charge.
 */
export type SubscriptionEvent = {
  id: string;
  uid: string;
  type: "upgrade_requested" | "upgrade_stubbed" | "cancelled";
  plan: ConsumerPlan;
  createdAt: string;
  notes?: string;
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
  /** Public download URL of the member's uploaded avatar photo, if any. */
  avatarUrl?: string;
  /** Storage path of the uploaded avatar (for overwrite/delete). */
  avatarPath?: string;
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
  | "avatarUrl"
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
  primaryTargets?: MuscleTargetId[];
  secondaryTargets?: MuscleTargetId[];
  movementPattern?: string;
  targetNotes?: string;
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
    | "pt_session_rescheduled"
    | "payment_request_pending"
    | "payment_request_rejected"
    | "data_deletion_request";
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
  /**
   * Number of sets this record represents. The contract going forward is that
   * every LiftLog is exactly one set (sets === 1) — see logLiftSet in
   * src/lib/firebase/actions/progress.ts. Values > 1 only occur on legacy
   * records written before this contract; read models expand those into
   * synthetic single-set rows so consumers never have to branch on it.
   */
  sets: number;
  reps: string;
  sessionId: string;
  loggedAt: string;
  /**
   * 1-based position of this set within the exercise submission it came from
   * (e.g. 2nd set of 3). Optional — only populated on records written after
   * the per-set normalization; absent on legacy aggregate records.
   */
  setIndex?: number;
  /** "member" = self-logged (default); "trainer" = logged during a PT session */
  source?: "member" | "trainer";
  /** Present when source is "trainer" — links back to the PT session */
  ptSessionId?: string;
  /** UID of the trainer who logged this set */
  loggedByTrainerId?: string;
  /**
   * Reps In Reserve at time of logging (0 = failure, ≤4 typical working range).
   * Mutually exclusive with `effortRpe` — only one scale stored per set.
   * Absent on sets logged before effort tracking was introduced.
   */
  effortRir?: number;
  /**
   * Session RPE (Rate of Perceived Exertion, 1–10 scale) at time of logging.
   * Mutually exclusive with `effortRir` — only one scale stored per set.
   * Absent on sets logged before effort tracking was introduced.
   */
  effortRpe?: number;
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
 * A single logged meal (quick-add or manual entry) — many per member per day.
 * Logging a meal also increments the day's `MacroLog` protein/carbs/fat totals,
 * so MacroLog stays the source of truth for daily progress bars.
 * Lives at: gyms/{gymId}/mealLogs/{id}
 */
export type MealLog = {
  id: string;
  memberId: string;
  gymId: string;
  /** Calendar date in YYYY-MM-DD format (local timezone) */
  date: string;
  name: string;
  items?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
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
  | "avatarUrl"
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
 * given week. Statuses:
 *   "completed" — member explicitly marked the planned day as done.
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
  status: "completed" | "skipped" | "modified";
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

type PTSessionStatus =
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
