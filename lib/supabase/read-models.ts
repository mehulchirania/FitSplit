import type { Exercise, Member, Membership, MuscleGroup } from "@/types/domain";
import {
  exerciseCatalogByMuscle as mockExerciseCatalogByMuscle,
  exercises as mockExercises,
  memberships as mockMemberships,
  members as mockMembers
} from "@/lib/mock-data";
import { createServiceSupabaseClient, hasSupabaseServiceConfig } from "./server";

const TITAN_GYM_SLUG = "titan-v2-fitness";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function getTitanGymId() {
  if (!hasSupabaseServiceConfig()) {
    return null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("gyms")
    .select("id")
    .eq("slug", TITAN_GYM_SLUG)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data.id as string;
}

export async function getMembersWithMemberships(): Promise<{
  members: Member[];
  memberships: Membership[];
  isPersisted: boolean;
}> {
  const gymId = await getTitanGymId();

  if (!gymId) {
    return {
      members: mockMembers,
      memberships: mockMemberships,
      isPersisted: false
    };
  }

  const supabase = createServiceSupabaseClient();
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone")
    .eq("default_gym_id", gymId)
    .eq("role", "member")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (profileError || !profileRows?.length) {
    return {
      members: mockMembers,
      memberships: mockMemberships,
      isPersisted: Boolean(profileRows?.length)
    };
  }

  const memberIds = profileRows.map((profile) => profile.id as string);
  const { data: membershipRows } = await supabase
    .from("memberships")
    .select("id, member_user_id, start_date, end_date, duration_months, payment_reference")
    .in("member_user_id", memberIds)
    .order("created_at", { ascending: false });

  return {
    members: profileRows.map((profile) => ({
      id: profile.id as string,
      fullName: String(profile.full_name),
      email: String(profile.email),
      phone: String(profile.phone ?? ""),
      joinedAt: String(
        membershipRows?.find((membership) => membership.member_user_id === profile.id)
          ?.start_date ?? new Date().toISOString().slice(0, 10)
      ),
      avatarInitials: initials(String(profile.full_name)),
      goal: "Stored in Supabase"
    })),
    memberships:
      membershipRows?.map((membership) => ({
        id: String(membership.id),
        memberId: String(membership.member_user_id),
        planName: "Stored membership",
        startDate: String(membership.start_date),
        endDate: String(membership.end_date),
        durationMonths: Number(membership.duration_months ?? 1),
        paymentReference: String(membership.payment_reference ?? "")
      })) ?? [],
    isPersisted: true
  };
}

export async function getExerciseCatalog(): Promise<{
  exercises: Exercise[];
  catalog: Array<{ muscleGroup: MuscleGroup; exercises: Exercise[] }>;
  isPersisted: boolean;
}> {
  const gymId = await getTitanGymId();

  if (!gymId) {
    return {
      exercises: mockExercises,
      catalog: mockExerciseCatalogByMuscle,
      isPersisted: false
    };
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("exercise_library")
    .select("id, name, muscle_group, equipment, instructions, video_source, video_url, video_storage_path, thumbnail_url")
    .eq("gym_id", gymId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return {
      exercises: mockExercises,
      catalog: mockExerciseCatalogByMuscle,
      isPersisted: false
    };
  }

  const persistedExercises: Exercise[] = data.map((exercise) => ({
    id: String(exercise.id),
    name: String(exercise.name),
    muscleGroup: String(exercise.muscle_group ?? "Chest") as MuscleGroup,
    equipment: String(exercise.equipment ?? ""),
    instructions: String(exercise.instructions ?? ""),
    videoSource: String(exercise.video_source ?? "none") as Exercise["videoSource"],
    videoUrl: String(exercise.video_url ?? exercise.video_storage_path ?? ""),
    thumbnailUrl: String(
      exercise.thumbnail_url ??
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80"
    ),
    ownerOnly: true
  }));

  const allExercises = [...persistedExercises, ...mockExercises];
  const muscleGroups = Array.from(
    new Set(allExercises.map((exercise) => exercise.muscleGroup))
  );

  return {
    exercises: allExercises,
    catalog: muscleGroups.map((muscleGroup) => ({
      muscleGroup,
      exercises: allExercises.filter((exercise) => exercise.muscleGroup === muscleGroup)
    })),
    isPersisted: true
  };
}
