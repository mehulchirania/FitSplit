import workoutsData from "./workouts.json";
import type {
  Exercise,
  GymWorkspace,
  Member,
  Membership,
  MuscleGroup,
  Notification,
  ProgramAssignment,
  WorkoutExercise,
  WorkoutProgram
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
    ownerUserId: "owner-titan",
    status: "pilot",
    expiryWarningDays: 7,
    memberCount: 4
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
    id: "owner-titan",
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
  }
];

const muscleThumbnails: Record<string, string> = {
  Chest:
    "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=80",
  Back:
    "https://images.unsplash.com/photo-1571019613914-85f342c6a11e?auto=format&fit=crop&w=900&q=80",
  Legs:
    "https://images.unsplash.com/photo-1534368959876-26bf04f2c947?auto=format&fit=crop&w=900&q=80",
  Shoulders:
    "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?auto=format&fit=crop&w=900&q=80",
  Biceps:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  Triceps:
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80"
};

export const exercises: Exercise[] = Object.entries(workoutSource.exercise_catalog)
  .flatMap(([muscleGroup, catalogExercises]) =>
    catalogExercises.map((catalogExercise) => ({
      id: catalogExercise.id,
      name: catalogExercise.name,
      muscleGroup: muscleGroup as MuscleGroup,
      equipment: catalogExercise.mechanic,
      instructions: `${catalogExercise.mechanic} ${muscleGroup.toLowerCase()} movement. Add the final coaching notes and demo video from the owner catalog.`,
      videoSource: "none" as const,
      videoUrl: "",
      thumbnailUrl:
        muscleThumbnails[muscleGroup] ??
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
      ownerOnly: true
    }))
  );

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
    recipientId: "owner-titan",
    type: "membership_expiring_soon",
    title: "Membership expiring soon",
    body: "Meera Iyer's membership ends on 09 May 2026.",
    createdAt: "2026-05-03T07:00:00+05:30"
  },
  {
    id: "notification-kabir-expired",
    recipientRole: "owner",
    recipientId: "owner-titan",
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
