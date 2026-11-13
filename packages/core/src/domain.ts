


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











/**
 * A FitSplit user's profile: identity, body metrics and training context.
 * Lives at `users/{uid}`.
 */
export type UserProfile = {
  id: string;
  fullName: string;
  email?: string;
  joinedAt: string;
  avatarInitials: string;
  /** Public download URL of the uploaded avatar photo, if any. */
  avatarUrl?: string;
  /** Storage path of the uploaded avatar (for overwrite/delete). */
  avatarPath?: string;
  /** Short fitness goal (e.g. "Build muscle"). */
  goal: string;
  isActive: boolean;

  age?: number;
  weightKg?: number;
  heightCm?: number;

  gender?: string;
  dob?: string;
  /** Long-form fitness goals from the profile form (distinct from the short `goal` field). */
  fitnessGoals?: string;
  medicalNotes?: string;
  injuryNotes?: string;
  macroNutritionTarget?: MacroNutritionTarget;
};

/** Contact info + training context used by profile/edit forms. */
export type ProfileMetrics = Pick<
  UserProfile,
  | "fullName"
  | "email"
  | "avatarUrl"
  | "age"
  | "gender"
  | "dob"
  | "heightCm"
  | "weightKg"
  | "fitnessGoals"
  | "medicalNotes"
  | "injuryNotes"
  | "macroNutritionTarget"
>;

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
  /** "predefined" = FitSplit default catalog; "custom" = user-created */
  source?: "predefined" | "custom";
  /**
   * Visibility of the tutorial video button.
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
  source?: "predefined" | "custom";
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
    notes: string;
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
  weightKg: number;
  bodyFatPct?: number;
  notes?: string;
  loggedAt: string;
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
 * Lives at: users/{uid}/macroLogs/{id}
 */
export type MacroLog = {
  id: string;
  memberId: string;
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
 * Lives at: users/{uid}/mealLogs/{id}
 */
export type MealLog = {
  id: string;
  memberId: string;
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
 * Lives at: users/{uid}/activityLogs/{id}
 */
export type ActivityLog = {
  id: string;
  memberId: string;
  type: "stretch" | "cardio";
  name: string;
  /** Duration in minutes */
  duration?: number;
  /** Distance in km (cardio only) */
  distance?: number;
  notes?: string;
  loggedAt: string;
  sessionId?: string;
};

export type WorkoutSession = {
  id: string;
  memberId: string;
  startedAt: string;
  endedAt?: string;
  status: "active" | "completed";
  /** Links the session to a specific program day for calendar display */
  programDayId?: string;
  programId?: string;
  dayTitle?: string;
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
