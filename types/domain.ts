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
  status: "active" | "pilot" | "paused" | "inactive";
  expiryWarningDays: number;
  memberCount: number;
  location?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
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
    | "program_assigned"
    | "contact_message"
    | "password_reset_request"
    | "member_access_toggled"
    | "member_created"
    | "access_suspended"
    | "access_restored";
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
};

export type WorkoutSession = {
  id: string;
  memberId: string;
  startedAt: string;
  endedAt?: string;
  status: "active" | "completed";
};

export type AttendanceRecord = {
  id: string;
  memberId: string;
  checkInAt: string;
  checkOutAt?: string;
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
