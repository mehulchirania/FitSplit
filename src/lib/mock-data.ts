import workoutsData from "./workouts.json";
import { getExerciseThumbnail } from "./exercise-thumbnails";
import { splitLibraryPrograms } from "./split-library";
import type {
  AttendanceRecord,
  Exercise,
  GymWorkspace,
  Member,
  Membership,
  MuscleGroup,
  Notification,
  ProgramAssignment,
  WorkoutProgram,
  WorkoutSession
} from "@/types/domain";

type CatalogExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  movementPattern: string;
  mechanic: string;
  muscle_target_description?: string;
  video_url?: string;
  gym_video_url?: string;
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
    id: "shg",
    name: "Sri Shakthi Hanuman Gym",
    slug: "shg",
    ownerName: "Santosh SHG",
    ownerUserId: "santosh-shg",
    status: "active",
    expiryWarningDays: 7,
    memberCount: 15,
    logoUrl: "/shg-gym-logo.jpeg",
    notices: [
      {
        id: "shg-notice-1",
        type: "rule",
        title: "Re-rack all weights after every set.",
        body: "Keep the floor clear so everyone trains safely.",
        isActive: true,
        order: 0,
        createdAt: "2026-01-01"
      },
      {
        id: "shg-notice-2",
        type: "tip",
        title: "Warm up for at least 10 minutes before heavy compound lifts.",
        body: "Joint mobility and activation sets reduce injury risk significantly.",
        isActive: true,
        order: 1,
        createdAt: "2026-01-01"
      },
      {
        id: "shg-notice-3",
        type: "reminder",
        title: "Stay hydrated — aim for at least 3 litres of water on training days.",
        isActive: true,
        order: 2,
        createdAt: "2026-01-01"
      },
      {
        id: "shg-notice-4",
        type: "tip",
        title: "Log your sets every session. Progressive overload only works when you track it.",
        isActive: true,
        order: 3,
        createdAt: "2026-01-01"
      },
      {
        id: "shg-notice-5",
        type: "rule",
        title: "Wipe down equipment with the provided cloth after use.",
        isActive: true,
        order: 4,
        createdAt: "2026-01-01"
      }
    ]
  },
  {
    id: "dummy-gym",
    name: "Dummy-Gym",
    slug: "dummy-gym",
    ownerName: "Dummy Gym Owner",
    ownerUserId: "dummy-gym-owner-1",
    status: "active",
    expiryWarningDays: 7,
    memberCount: 0
  },
  {
    id: "titan-gym",
    name: "Titan Fitness Club",
    slug: "titan-gym",
    ownerName: "Titan Owner",
    ownerUserId: "titan-owner-1",
    status: "active",
    expiryWarningDays: 7,
    memberCount: 20,
    notices: [
      {
        id: "titan-notice-1",
        type: "rule",
        title: "No dropping of weights — lower them with control.",
        body: "Protect equipment and fellow members.",
        isActive: true,
        order: 0,
        createdAt: "2026-01-01"
      },
      {
        id: "titan-notice-2",
        type: "tip",
        title: "Protein within 30 minutes of training accelerates recovery.",
        isActive: true,
        order: 1,
        createdAt: "2026-01-01"
      }
    ]
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
    id: "santosh-shg",
    name: "Santosh SHG",
    role: "owner",
    access: "Sri Shakthi Hanuman Gym"
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
    goal: "Build lean muscle",
    isActive: true
  },
  {
    id: "member-meera",
    fullName: "Meera Iyer",
    email: "meera@example.com",
    phone: "+91 98765 42109",
    joinedAt: "2026-01-15",
    avatarInitials: "MI",
    goal: "Improve strength",
    isActive: true
  },
  {
    id: "member-kabir",
    fullName: "Kabir Khan",
    email: "kabir@example.com",
    phone: "+91 98765 41098",
    joinedAt: "2025-12-10",
    avatarInitials: "KK",
    goal: "Fat loss and conditioning",
    isActive: true
  },
  {
    id: "member-nisha",
    fullName: "Nisha Rao",
    email: "nisha@example.com",
    phone: "+91 98765 40987",
    joinedAt: "2026-03-02",
    avatarInitials: "NR",
    goal: "Beginner fitness",
    isActive: true
  },
  {
    id: "member-mehul",
    fullName: "Mehul Chirania",
    email: "mehul@example.com",
    phone: "+91 9688227039",
    joinedAt: "2026-05-01",
    avatarInitials: "MC",
    goal: "Improve strength and mobility",
    isActive: true,
    age: 28,
    heightCm: 180,
    weightKg: 78
  },

  /* ── SHG extra members (scroll testing) ── */
  { id: "shg-rohan",  fullName: "Rohan Verma",    email: "rohan.v@example.com",   phone: "+91 98001 11001", joinedAt: "2026-01-10", avatarInitials: "RV", goal: "Build lean muscle",          isActive: true  },
  { id: "shg-priya",  fullName: "Priya Nair",     email: "priya.n@example.com",   phone: "+91 98001 11002", joinedAt: "2026-02-14", avatarInitials: "PN", goal: "Weight loss",                isActive: true  },
  { id: "shg-arjun",  fullName: "Arjun Patel",    email: "arjun.p@example.com",   phone: "+91 98001 11003", joinedAt: "2026-03-08", avatarInitials: "AP", goal: "Strength training",           isActive: true  },
  { id: "shg-divya",  fullName: "Divya Menon",    email: "divya.m@example.com",   phone: "+91 98001 11004", joinedAt: "2026-01-22", avatarInitials: "DM", goal: "Toning and flexibility",     isActive: true  },
  { id: "shg-vikram", fullName: "Vikram Singh",   email: "vikram.s@example.com",  phone: "+91 98001 11005", joinedAt: "2025-12-05", avatarInitials: "VS", goal: "Athletic performance",        isActive: true  },
  { id: "shg-anjali", fullName: "Anjali Desai",   email: "anjali.d@example.com",  phone: "+91 98001 11006", joinedAt: "2026-04-18", avatarInitials: "AD", goal: "Beginner fitness",            isActive: true  },
  { id: "shg-suresh", fullName: "Suresh Kumar",   email: "suresh.k@example.com",  phone: "+91 98001 11007", joinedAt: "2025-11-20", avatarInitials: "SK", goal: "Fat loss",                    isActive: false },
  { id: "shg-pooja",  fullName: "Pooja Reddy",    email: "pooja.r@example.com",   phone: "+91 98001 11008", joinedAt: "2026-02-28", avatarInitials: "PR", goal: "Build strength",              isActive: true  },
  { id: "shg-rahul",  fullName: "Rahul Gupta",    email: "rahul.g@example.com",   phone: "+91 98001 11009", joinedAt: "2026-03-15", avatarInitials: "RG", goal: "Increase muscle mass",        isActive: true  },
  { id: "shg-sneha",  fullName: "Sneha Joshi",    email: "sneha.j@example.com",   phone: "+91 98001 11010", joinedAt: "2025-10-30", avatarInitials: "SJ", goal: "General fitness",             isActive: false },

  /* ── Titan Fitness Club members ── */
  { id: "titan-ravi",      fullName: "Ravi Shankar",      email: "ravi.s@titan.com",      phone: "+91 97000 20001", joinedAt: "2026-01-05", avatarInitials: "RS", goal: "Powerlifting",                isActive: true  },
  { id: "titan-kavya",     fullName: "Kavya Krishnan",    email: "kavya.k@titan.com",     phone: "+91 97000 20002", joinedAt: "2026-01-12", avatarInitials: "KK", goal: "Endurance training",          isActive: true  },
  { id: "titan-amit",      fullName: "Amit Yadav",        email: "amit.y@titan.com",      phone: "+91 97000 20003", joinedAt: "2026-01-18", avatarInitials: "AY", goal: "Body recomposition",          isActive: true  },
  { id: "titan-sonal",     fullName: "Sonal Mehta",       email: "sonal.m@titan.com",     phone: "+91 97000 20004", joinedAt: "2026-01-25", avatarInitials: "SM", goal: "Weight loss",                 isActive: true  },
  { id: "titan-deepak",    fullName: "Deepak Bose",       email: "deepak.b@titan.com",    phone: "+91 97000 20005", joinedAt: "2026-02-03", avatarInitials: "DB", goal: "Hypertrophy",                 isActive: true  },
  { id: "titan-neha",      fullName: "Neha Kapoor",       email: "neha.k@titan.com",      phone: "+91 97000 20006", joinedAt: "2026-02-10", avatarInitials: "NK", goal: "Functional fitness",          isActive: true  },
  { id: "titan-kiran",     fullName: "Kiran Tiwari",      email: "kiran.t@titan.com",     phone: "+91 97000 20007", joinedAt: "2026-02-17", avatarInitials: "KT", goal: "Athletic conditioning",       isActive: true  },
  { id: "titan-sanjay",    fullName: "Sanjay Bhatt",      email: "sanjay.b@titan.com",    phone: "+91 97000 20008", joinedAt: "2026-02-22", avatarInitials: "SB", goal: "Strength and power",          isActive: false },
  { id: "titan-ananya",    fullName: "Ananya Pillai",     email: "ananya.p@titan.com",    phone: "+91 97000 20009", joinedAt: "2026-03-01", avatarInitials: "AP", goal: "Core strength",               isActive: true  },
  { id: "titan-mohit",     fullName: "Mohit Saxena",      email: "mohit.s@titan.com",     phone: "+91 97000 20010", joinedAt: "2026-03-08", avatarInitials: "MS", goal: "Build muscle",                isActive: true  },
  { id: "titan-ishaan",    fullName: "Ishaan Malhotra",   email: "ishaan.m@titan.com",    phone: "+91 97000 20011", joinedAt: "2026-03-15", avatarInitials: "IM", goal: "Weight loss",                 isActive: true  },
  { id: "titan-tanvi",     fullName: "Tanvi Choudhary",   email: "tanvi.c@titan.com",     phone: "+91 97000 20012", joinedAt: "2026-03-20", avatarInitials: "TC", goal: "Flexibility and strength",    isActive: true  },
  { id: "titan-gaurav",    fullName: "Gaurav Rane",       email: "gaurav.r@titan.com",    phone: "+91 97000 20013", joinedAt: "2026-03-28", avatarInitials: "GR", goal: "Cardio conditioning",         isActive: false },
  { id: "titan-poornima",  fullName: "Poornima Das",      email: "poornima.d@titan.com",  phone: "+91 97000 20014", joinedAt: "2026-04-02", avatarInitials: "PD", goal: "Lean muscle",                 isActive: true  },
  { id: "titan-sachin",    fullName: "Sachin Pandey",     email: "sachin.p@titan.com",    phone: "+91 97000 20015", joinedAt: "2026-04-08", avatarInitials: "SP", goal: "Strength training",           isActive: true  },
  { id: "titan-alisha",    fullName: "Alisha Fernandes",  email: "alisha.f@titan.com",    phone: "+91 97000 20016", joinedAt: "2026-04-12", avatarInitials: "AF", goal: "Toning",                      isActive: true  },
  { id: "titan-varun",     fullName: "Varun Mathur",      email: "varun.m@titan.com",     phone: "+91 97000 20017", joinedAt: "2026-04-20", avatarInitials: "VM", goal: "Fat loss",                    isActive: true  },
  { id: "titan-nandini",   fullName: "Nandini Iyer",      email: "nandini.i@titan.com",   phone: "+91 97000 20018", joinedAt: "2026-04-25", avatarInitials: "NI", goal: "Beginner fitness",            isActive: true  },
  { id: "titan-aryan",     fullName: "Aryan Kapadia",     email: "aryan.k@titan.com",     phone: "+91 97000 20019", joinedAt: "2026-05-01", avatarInitials: "AK", goal: "Muscle building",             isActive: true  },
  { id: "titan-meghna",    fullName: "Meghna Sharma",     email: "meghna.s@titan.com",    phone: "+91 97000 20020", joinedAt: "2026-05-05", avatarInitials: "MS", goal: "General fitness",             isActive: true  }
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
      equipment: catalogExercise.equipment,
      movementPattern: catalogExercise.movementPattern,
      instructions: getCoachingNotes(catalogExercise.name, catalogExercise.mechanic, muscleGroup),
      videoSource: catalogExercise.video_url ? "youtube" as const : "none" as const,
      videoUrl: catalogExercise.video_url ?? "",
      gymVideoUrl: catalogExercise.gym_video_url ?? "",
      gymVideoSource: catalogExercise.gym_video_url ? "youtube" as const : "none" as const,
      thumbnailUrl: getExerciseThumbnail(catalogExercise.name, muscleGroup as MuscleGroup),
      muscleTargetDescription: catalogExercise.muscle_target_description,
      ownerOnly: true
    }))
  ).concat([
    {
      id: "stretch-band-pulls",
      name: "Band Pull-Aparts",
      muscleGroup: "Shoulders",
      equipment: "band",
      movementPattern: "fly",
      instructions: "Hold band at chest height, pull apart, squeezing shoulder blades.",
      muscleTargetDescription: "A mobility move for the rear delts and mid-traps that opens the chest and warms up the shoulders.",
      videoSource: "none",
      videoUrl: "",
      gymVideoUrl: "",
      gymVideoSource: "none",
      thumbnailUrl: muscleThumbnails["Shoulders"],
      ownerOnly: false
    },
    {
      id: "stretch-cat-cow",
      name: "Cat-Cow Stretch",
      muscleGroup: "Back",
      equipment: "bodyweight",
      movementPattern: "spinal_flexion",
      instructions: "On all fours, arch back up, then dip back down slowly.",
      muscleTargetDescription: "A spinal mobility stretch that mobilises the spinal erectors and warms up the back through flexion and extension.",
      videoSource: "none",
      videoUrl: "",
      gymVideoUrl: "",
      gymVideoSource: "none",
      thumbnailUrl: muscleThumbnails["Back"],
      ownerOnly: false
    },
    {
      id: "stretch-quad",
      name: "Standing Quad Stretch",
      muscleGroup: "Legs",
      equipment: "bodyweight",
      movementPattern: "knee_flexion",
      instructions: "Stand on one leg, pull other foot to glutes, keep knees together.",
      muscleTargetDescription: "A static stretch for the quadriceps and hip flexors to improve flexibility after leg training.",
      videoSource: "none",
      videoUrl: "",
      gymVideoUrl: "",
      gymVideoSource: "none",
      thumbnailUrl: muscleThumbnails["Legs"],
      ownerOnly: false
    }
  ]);

export const exerciseCatalogByMuscle = muscleGroups.map((muscleGroup) => ({
  muscleGroup,
  exercises: exercises.filter((exerciseItem) => exerciseItem.muscleGroup === muscleGroup)
}));

export const programs: WorkoutProgram[] = splitLibraryPrograms;

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
  },

  /* ── SHG extra assignments (4 of 10 new members) ── */
  { id: "assignment-shg-rohan",  memberId: "shg-rohan",  programId: "split_01", assignedAt: "2026-02-01T09:00:00+05:30", status: "active" },
  { id: "assignment-shg-arjun",  memberId: "shg-arjun",  programId: "split_03", assignedAt: "2026-03-12T10:30:00+05:30", status: "active" },
  { id: "assignment-shg-vikram", memberId: "shg-vikram", programId: "split_02", assignedAt: "2026-01-10T11:00:00+05:30", status: "active" },
  { id: "assignment-shg-pooja",  memberId: "shg-pooja",  programId: "split_04", assignedAt: "2026-03-05T08:00:00+05:30", status: "active" },

  /* ── Titan assignments (8 of 20 members) ── */
  { id: "assignment-titan-ravi",     memberId: "titan-ravi",     programId: "split_02", assignedAt: "2026-01-10T09:00:00+05:30", status: "active" },
  { id: "assignment-titan-kavya",    memberId: "titan-kavya",    programId: "split_01", assignedAt: "2026-01-18T10:00:00+05:30", status: "active" },
  { id: "assignment-titan-amit",     memberId: "titan-amit",     programId: "split_03", assignedAt: "2026-01-22T11:00:00+05:30", status: "active" },
  { id: "assignment-titan-deepak",   memberId: "titan-deepak",   programId: "split_02", assignedAt: "2026-02-08T09:30:00+05:30", status: "active" },
  { id: "assignment-titan-kiran",    memberId: "titan-kiran",    programId: "split_04", assignedAt: "2026-02-20T08:00:00+05:30", status: "active" },
  { id: "assignment-titan-ananya",   memberId: "titan-ananya",   programId: "split_01", assignedAt: "2026-03-05T10:00:00+05:30", status: "active" },
  { id: "assignment-titan-mohit",    memberId: "titan-mohit",    programId: "split_03", assignedAt: "2026-03-12T11:30:00+05:30", status: "active" },
  { id: "assignment-titan-sachin",   memberId: "titan-sachin",   programId: "split_02", assignedAt: "2026-04-10T09:00:00+05:30", status: "active" }
];

export const notifications: Notification[] = [
  {
    id: "notification-meera-expiring",
    recipientRole: "owner",
    recipientId: "santosh-shg",
    type: "membership_expiring_soon",
    title: "Membership expiring soon",
    body: "Meera Iyer's membership ends on 09 May 2026.",
    createdAt: "2026-05-03T07:00:00+05:30"
  },
  {
    id: "notification-kabir-expired",
    recipientRole: "owner",
    recipientId: "santosh-shg",
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
