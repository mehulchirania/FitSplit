import workoutsData from "./workouts.json";
import type {
  AttendanceRecord,
  Exercise,
  GymWorkspace,
  Member,
  Membership,
  MuscleGroup,
  Notification,
  ProgramAssignment,
  WorkoutExercise,
  WorkoutProgram,
  WorkoutSession
} from "@/types/domain";

type CatalogExercise = {
  id: string;
  name: string;
  mechanic: string;
};

type RawSplit = {
  split_id: string;
  name: string;
  description: string;
  is_custom: boolean;
  schedule: Array<{
    day: number;
    title: string;
    workouts: Array<{
      exercise_id: string;
      sets: number;
      reps: string;
    }>;
  }>;
};

type WorkoutsJson = {
  exercise_catalog: Record<string, CatalogExercise[]>;
  training_splits: RawSplit[];
};

const workoutSource = workoutsData as WorkoutsJson;

export const gyms: GymWorkspace[] = [
  {
    id: "gym-titan-v2",
    name: "Titan V2 Fitness",
    slug: "titan-v2-fitness",
    ownerName: "Titan Owner",
    ownerUserId: "titan-owner-1",
    status: "pilot",
    expiryWarningDays: 7,
    memberCount: 4
  },
  {
    id: "dummy-gym",
    name: "Dummy-Gym",
    slug: "dummy-gym",
    ownerName: "Dummy Gym Owner",
    ownerUserId: "dummy-gym-owner-1",
    status: "pilot",
    expiryWarningDays: 7,
    memberCount: 0
  }
];

export const gym = gyms[0];
export const currentWorkspace = gym;

export const roles = {
  admin: {
    id: "admin-fitsplit",
    name: "FitSplit Admin",
    role: "admin",
    access: "All workspaces"
  },
  owner: {
    id: "titan-owner-1",
    name: "Titan V2 Owner",
    role: "owner",
    access: "Titan V2 Fitness"
  }
};

export const muscleGroups = Object.keys(
  workoutSource.exercise_catalog
) as MuscleGroup[];

export const members: Member[] = [
  {
    id: "member-aarav",
    fullName: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "+91 98765 43210",
    joinedAt: "2026-02-01",
    avatarInitials: "AS",
    goal: "Build lean muscle"
  },
  {
    id: "member-meera",
    fullName: "Meera Iyer",
    email: "meera@example.com",
    phone: "+91 98765 42109",
    joinedAt: "2026-01-15",
    avatarInitials: "MI",
    goal: "Improve strength"
  },
  {
    id: "member-kabir",
    fullName: "Kabir Khan",
    email: "kabir@example.com",
    phone: "+91 98765 41098",
    joinedAt: "2025-12-10",
    avatarInitials: "KK",
    goal: "Fat loss and conditioning"
  },
  {
    id: "member-nisha",
    fullName: "Nisha Rao",
    email: "nisha@example.com",
    phone: "+91 98765 40987",
    joinedAt: "2026-03-02",
    avatarInitials: "NR",
    goal: "Beginner fitness"
  },
  {
    id: "member-mehul",
    fullName: "Mehul Chirania",
    email: "mehul@example.com",
    phone: "+91 9688227039",
    joinedAt: "2026-05-01",
    avatarInitials: "MC",
    goal: "Improve strength and mobility",
    age: 28,
    heightCm: 180,
    weightKg: 78
  }
];

export const memberships: Membership[] = [
  {
    id: "membership-aarav",
    memberId: "member-aarav",
    planName: "3 Month Strength",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    durationMonths: 3,
    paymentReference: "UPI-1038"
  },
  {
    id: "membership-meera",
    memberId: "member-meera",
    planName: "1 Month Renewal",
    startDate: "2026-04-10",
    endDate: "2026-05-09",
    durationMonths: 1,
    paymentReference: "CASH-887"
  },
  {
    id: "membership-kabir",
    memberId: "member-kabir",
    planName: "1 Month Conditioning",
    startDate: "2026-03-25",
    endDate: "2026-04-24",
    durationMonths: 1,
    paymentReference: "UPI-0991"
  },
  {
    id: "membership-nisha",
    memberId: "member-nisha",
    planName: "6 Month Starter",
    startDate: "2026-03-05",
    endDate: "2026-09-04",
    durationMonths: 6,
    paymentReference: "UPI-1116"
  },
  {
    id: "membership-mehul",
    memberId: "member-mehul",
    planName: "12 Month Elite",
    startDate: "2026-05-01",
    endDate: "2027-04-30",
    durationMonths: 12,
    paymentReference: "UPI-9999"
  }
];

const muscleThumbnails: Record<string, string> = {
  Chest:
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80",
  Back:
    "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?auto=format&fit=crop&w=900&q=80",
  Legs:
    "https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=900&q=80",
  Shoulders:
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80",
  Biceps:
    "https://images.unsplash.com/photo-1581009137042-c552e485697a?auto=format&fit=crop&w=900&q=80",
  Triceps:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80"
};

function getCoachingNotes(name: string, mechanic: string, muscleGroup: string): string {
  const n = name.toLowerCase();
  if (n.includes("squat")) return "Keep chest up, drive through the heels, and maintain a neutral spine. Control the descent.";
  if (n.includes("deadlift")) return "Hinge at the hips, keep the bar close to your shins, and squeeze glutes at the top. Do not round your back.";
  if (n.includes("bench press")) return "Plant feet firmly, maintain a slight arch in your lower back, and lower the bar to your mid-chest.";
  if (n.includes("pull-up") || n.includes("pulldown")) return "Depress your shoulders first, then pull with your lats. Squeeze at the bottom.";
  if (n.includes("row")) return "Keep your torso stable. Pull your elbows back and squeeze your shoulder blades together.";
  if (n.includes("curl")) return "Keep elbows pinned to your sides. Focus on the squeeze at the top and control the eccentric.";
  if (n.includes("extension") && muscleGroup === "Triceps") return "Keep elbows tucked and stationary. Fully lock out at the bottom.";
  if (n.includes("press") && muscleGroup === "Shoulders") return "Press straight up, keeping your core tight. Don't overarch your lower back.";
  if (n.includes("lateral raise")) return "Lead with your elbows, pouring the pitcher at the top. Don't use momentum.";
  if (n.includes("leg press")) return "Don't lock your knees at the top. Push through your full foot.";
  
  return `Focus on the mind-muscle connection for the ${muscleGroup}. Control the weight on the way down and explode on the way up.`;
}

export const exercises: Exercise[] = Object.entries(workoutSource.exercise_catalog)
  .flatMap(([muscleGroup, catalogExercises]) =>
    catalogExercises.map((catalogExercise) => ({
      id: catalogExercise.id,
      name: catalogExercise.name,
      muscleGroup: muscleGroup as MuscleGroup,
      equipment: catalogExercise.mechanic,
      instructions: getCoachingNotes(catalogExercise.name, catalogExercise.mechanic, muscleGroup),
      videoSource: "none" as const,
      videoUrl: "",
      thumbnailUrl:
        muscleThumbnails[muscleGroup] ??
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
      ownerOnly: true
    }))
  ).concat([
    {
      id: "stretch-band-pulls",
      name: "Band Pull-Aparts",
      muscleGroup: "Shoulders",
      equipment: "band",
      instructions: "Hold band at chest height, pull apart, squeezing shoulder blades.",
      videoSource: "none",
      videoUrl: "",
      thumbnailUrl: muscleThumbnails["Shoulders"],
      ownerOnly: false
    },
    {
      id: "stretch-cat-cow",
      name: "Cat-Cow Stretch",
      muscleGroup: "Back",
      equipment: "bodyweight",
      instructions: "On all fours, arch back up, then dip back down slowly.",
      videoSource: "none",
      videoUrl: "",
      thumbnailUrl: muscleThumbnails["Back"],
      ownerOnly: false
    },
    {
      id: "stretch-quad",
      name: "Standing Quad Stretch",
      muscleGroup: "Legs",
      equipment: "bodyweight",
      instructions: "Stand on one leg, pull other foot to glutes, keep knees together.",
      videoSource: "none",
      videoUrl: "",
      thumbnailUrl: muscleThumbnails["Legs"],
      ownerOnly: false
    }
  ]);

export const exerciseCatalogByMuscle = muscleGroups.map((muscleGroup) => ({
  muscleGroup,
  exercises: exercises.filter((exerciseItem) => exerciseItem.muscleGroup === muscleGroup)
}));

function splitTypeFor(split: RawSplit): WorkoutProgram["splitType"] {
  if (split.is_custom) {
    return "custom";
  }

  if (split.split_id === "split_01") {
    return "ppl_x2";
  }

  if (split.split_id === "split_02") {
    return "ppl_upper_lower";
  }

  if (split.split_id === "split_03") {
    return "bro_split";
  }

  return "combo_x2";
}

function workoutExercise(workout: RawSplit["schedule"][number]["workouts"][number]): WorkoutExercise {
  return {
    exerciseId: workout.exercise_id,
    sets: workout.sets || undefined,
    reps: workout.reps || undefined,
    restSeconds: workout.exercise_id ? 75 : undefined
  };
}

export const programs: WorkoutProgram[] = workoutSource.training_splits.map((split) => {
  const trainingDays = split.schedule.filter((day) => day.workouts.length > 0);

  return {
    id: split.split_id,
    title: split.name,
    description: split.description,
    goal: split.is_custom ? "Owner-selected custom routine" : "Structured hypertrophy training",
    difficulty: split.split_id === "split_04" ? "advanced" : "intermediate",
    daysPerWeek: trainingDays.length,
    splitType: splitTypeFor(split),
    days: split.schedule.map((day) => ({
      id: `${split.split_id}-day-${day.day}`,
      title: day.title,
      dayNumber: day.day,
      focus: day.workouts.length ? day.title : "Rest and recovery",
      exercises: day.workouts
        .filter((workout) => workout.exercise_id)
        .map((workout) => workoutExercise(workout))
    }))
  };
});

export const assignments: ProgramAssignment[] = [
  {
    id: "assignment-aarav",
    memberId: "member-aarav",
    programId: "split_02",
    assignedAt: "2026-04-25T10:00:00+05:30",
    status: "active"
  },
  {
    id: "assignment-meera",
    memberId: "member-meera",
    programId: "split_custom_template",
    assignedAt: "2026-04-20T16:00:00+05:30",
    status: "active"
  }
];

export const notifications: Notification[] = [
  {
    id: "notification-meera-expiring",
    recipientRole: "owner",
    recipientId: "titan-owner-1",
    type: "membership_expiring_soon",
    title: "Membership expiring soon",
    body: "Meera Iyer's membership ends on 09 May 2026.",
    createdAt: "2026-05-03T07:00:00+05:30"
  },
  {
    id: "notification-kabir-expired",
    recipientRole: "owner",
    recipientId: "titan-owner-1",
    type: "membership_expired",
    title: "Membership expired",
    body: "Kabir Khan's membership expired on 24 Apr 2026.",
    createdAt: "2026-05-03T07:00:00+05:30"
  },
  {
    id: "notification-aarav-program",
    recipientRole: "member",
    recipientId: "member-aarav",
    type: "program_assigned",
    title: "New workout assigned",
    body: "PPL + Upper/Lower is ready in your workout tab.",
    createdAt: "2026-04-25T10:05:00+05:30",
    readAt: "2026-04-25T10:20:00+05:30"
  }
];

export const attendanceRecords: AttendanceRecord[] = [
  { id: "att-1", memberId: "member-aarav", checkInAt: "2026-04-01T08:00:00+05:30", checkOutAt: "2026-04-01T09:30:00+05:30" },
  { id: "att-2", memberId: "member-aarav", checkInAt: "2026-04-03T08:15:00+05:30", checkOutAt: "2026-04-03T09:45:00+05:30" },
  { id: "att-3", memberId: "member-aarav", checkInAt: "2026-04-05T08:05:00+05:30", checkOutAt: "2026-04-05T09:35:00+05:30" },
  { id: "att-4", memberId: "member-aarav", checkInAt: "2026-04-08T08:10:00+05:30", checkOutAt: "2026-04-08T09:40:00+05:30" },
  { id: "att-5", memberId: "member-aarav", checkInAt: "2026-04-10T08:00:00+05:30", checkOutAt: "2026-04-10T09:30:00+05:30" },
  { id: "att-6", memberId: "member-aarav", checkInAt: "2026-04-12T08:20:00+05:30", checkOutAt: "2026-04-12T09:50:00+05:30" },
  { id: "att-7", memberId: "member-aarav", checkInAt: "2026-04-15T08:00:00+05:30", checkOutAt: "2026-04-15T09:30:00+05:30" },
  { id: "att-8", memberId: "member-aarav", checkInAt: "2026-04-17T08:15:00+05:30", checkOutAt: "2026-04-17T09:45:00+05:30" },
  { id: "att-9", memberId: "member-aarav", checkInAt: "2026-04-19T08:05:00+05:30", checkOutAt: "2026-04-19T09:35:00+05:30" },
  { id: "att-10", memberId: "member-aarav", checkInAt: "2026-04-22T08:10:00+05:30", checkOutAt: "2026-04-22T09:40:00+05:30" },
  { id: "att-11", memberId: "member-aarav", checkInAt: "2026-04-24T08:00:00+05:30", checkOutAt: "2026-04-24T09:30:00+05:30" },
  { id: "att-12", memberId: "member-aarav", checkInAt: "2026-04-26T08:20:00+05:30", checkOutAt: "2026-04-26T09:50:00+05:30" },
  { id: "att-13", memberId: "member-aarav", checkInAt: "2026-04-29T08:00:00+05:30", checkOutAt: "2026-04-29T09:30:00+05:30" },
  { id: "att-14", memberId: "member-aarav", checkInAt: "2026-05-01T08:15:00+05:30", checkOutAt: "2026-05-01T09:45:00+05:30" },
  { id: "att-15", memberId: "member-aarav", checkInAt: "2026-05-03T08:05:00+05:30", checkOutAt: "2026-05-03T09:35:00+05:30" },
  
  { id: "att-m1", memberId: "member-mehul", checkInAt: "2026-05-01T18:00:00+05:30", checkOutAt: "2026-05-01T19:30:00+05:30" },
  { id: "att-m2", memberId: "member-mehul", checkInAt: "2026-05-02T18:15:00+05:30", checkOutAt: "2026-05-02T19:45:00+05:30" },
  { id: "att-m3", memberId: "member-mehul", checkInAt: "2026-05-03T18:05:00+05:30", checkOutAt: "2026-05-03T19:35:00+05:30" },
  { id: "att-m4", memberId: "member-mehul", checkInAt: "2026-05-04T18:10:00+05:30", checkOutAt: "2026-05-04T19:40:00+05:30" }
];

export const workoutSessions: WorkoutSession[] = attendanceRecords.map(att => ({
  id: `session-${att.id}`,
  memberId: att.memberId,
  startedAt: att.checkInAt,
  endedAt: att.checkOutAt,
  status: "completed"
}));
