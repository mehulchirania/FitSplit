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

export type GymWorkspace = {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerUserId: string;
  status: "active" | "pilot" | "paused";
  expiryWarningDays: number;
  memberCount: number;
};

export type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  joinedAt: string;
  avatarInitials: string;
  goal: string;
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
    | "program_assigned";
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
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
