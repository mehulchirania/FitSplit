"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { exercises } from "@/lib/mock-data";
import { createServiceSupabaseClient, hasSupabaseServiceConfig } from "./server";

const TITAN_GYM_SLUG = "titan-v2-fitness";
const FALLBACK_OWNER_ID = "00000000-0000-0000-0000-000000000001";

function requireText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function addMonths(dateValue: string, months: number) {
  const date = new Date(`${dateValue}T00:00:00+05:30`);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

async function getTitanGymId() {
  if (!hasSupabaseServiceConfig()) {
    throw new Error("Supabase is not configured. Add .env.local values first.");
  }

  const supabase = createServiceSupabaseClient();
  await ensureOwnerProfile(supabase);
  const { data: existingGym, error: selectError } = await supabase
    .from("gyms")
    .select("id")
    .eq("slug", TITAN_GYM_SLUG)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingGym?.id) {
    return existingGym.id as string;
  }

  const { data: insertedGym, error: insertError } = await supabase
    .from("gyms")
    .insert({
      name: "Titan V2 Fitness",
      slug: TITAN_GYM_SLUG,
      owner_user_id: FALLBACK_OWNER_ID,
      expiry_warning_days: 7
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  await supabase
    .from("profiles")
    .update({ default_gym_id: insertedGym.id })
    .eq("id", FALLBACK_OWNER_ID);

  return insertedGym.id as string;
}

async function ensureOwnerProfile(supabase: ReturnType<typeof createServiceSupabaseClient>) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", FALLBACK_OWNER_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    return;
  }

  const { error: insertError } = await supabase.from("profiles").insert({
    id: FALLBACK_OWNER_ID,
    full_name: "Titan V2 Owner",
    email: "owner@titanv2.local",
    role: "owner",
    is_active: true
  });

  if (insertError) {
    throw insertError;
  }
}

async function resolveExerciseRecordId(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  gymId: string,
  sourceExerciseId: string
) {
  const sourceExercise = exercises.find((exercise) => exercise.id === sourceExerciseId);

  if (!sourceExercise) {
    return sourceExerciseId;
  }

  const { data: existingExercise, error: selectError } = await supabase
    .from("exercise_library")
    .select("id")
    .eq("gym_id", gymId)
    .eq("name", sourceExercise.name)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingExercise?.id) {
    return existingExercise.id as string;
  }

  const { data: insertedExercise, error: insertError } = await supabase
    .from("exercise_library")
    .insert({
      gym_id: gymId,
      name: sourceExercise.name,
      muscle_group: sourceExercise.muscleGroup,
      equipment: sourceExercise.equipment,
      instructions: sourceExercise.instructions,
      video_source: sourceExercise.videoSource,
      video_url: sourceExercise.videoUrl || null,
      thumbnail_url: sourceExercise.thumbnailUrl,
      owner_only: true,
      is_active: true,
      created_by: FALLBACK_OWNER_ID
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  return insertedExercise.id as string;
}

export async function createMemberWithMembership(formData: FormData) {
  const gymId = await getTitanGymId();
  const supabase = createServiceSupabaseClient();
  const memberId = randomUUID();
  const fullName = requireText(formData, "fullName");
  const email = requireText(formData, "email");
  const phone = String(formData.get("phone") ?? "").trim();
  const goal = String(formData.get("goal") ?? "General fitness").trim();
  const startDate = requireText(formData, "startDate");
  const durationMonths = Number(formData.get("durationMonths") ?? 1);
  const endDate = addMonths(startDate, durationMonths);

  const { error: profileError } = await supabase.from("profiles").insert({
    id: memberId,
    full_name: fullName,
    email,
    phone,
    role: "member",
    default_gym_id: gymId,
    is_active: true
  });

  if (profileError) {
    throw profileError;
  }

  const { error: gymMemberError } = await supabase.from("gym_members").insert({
    gym_id: gymId,
    user_id: memberId,
    joined_at: startDate,
    status: "active",
    notes: goal
  });

  if (gymMemberError) {
    throw gymMemberError;
  }

  const { error: membershipError } = await supabase.from("memberships").insert({
    gym_id: gymId,
    member_user_id: memberId,
    start_date: startDate,
    end_date: endDate,
    duration_months: durationMonths,
    payment_reference: String(formData.get("paymentReference") ?? "").trim(),
    created_by: FALLBACK_OWNER_ID
  });

  if (membershipError) {
    throw membershipError;
  }

  revalidatePath("/owner");
  revalidatePath("/owner/members");
}

export async function createCatalogExercise(formData: FormData) {
  const gymId = await getTitanGymId();
  const supabase = createServiceSupabaseClient();
  const videoValue = String(formData.get("videoUrl") ?? "").trim();
  const videoSource = String(formData.get("videoSource") ?? "none");

  const { error } = await supabase.from("exercise_library").insert({
    gym_id: gymId,
    name: requireText(formData, "name"),
    muscle_group: requireText(formData, "muscleGroup"),
    equipment: String(formData.get("equipment") ?? "").trim(),
    instructions: String(formData.get("instructions") ?? "").trim(),
    video_source: videoSource,
    video_url: videoSource === "upload" ? null : videoValue,
    video_storage_path: videoSource === "upload" ? videoValue : null,
    owner_only: true,
    is_active: true,
    created_by: FALLBACK_OWNER_ID
  });

  if (error) {
    throw error;
  }

  revalidatePath("/owner/exercises");
}

export async function createCustomWorkoutProgram(formData: FormData) {
  const gymId = await getTitanGymId();
  const supabase = createServiceSupabaseClient();
  const title = requireText(formData, "title");
  const dayTitle = requireText(formData, "dayTitle");
  const exerciseIds = formData
    .getAll("exerciseIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const { data: program, error: programError } = await supabase
    .from("workout_programs")
    .insert({
      gym_id: gymId,
      title,
      description: String(formData.get("description") ?? "").trim(),
      goal: String(formData.get("goal") ?? "Custom member plan").trim(),
      difficulty: String(formData.get("difficulty") ?? "beginner"),
      days_per_week: Number(formData.get("daysPerWeek") ?? 1),
      split_type: "custom",
      is_active: true,
      created_by: FALLBACK_OWNER_ID
    })
    .select("id")
    .single();

  if (programError) {
    throw programError;
  }

  const { data: day, error: dayError } = await supabase
    .from("workout_days")
    .insert({
      gym_id: gymId,
      program_id: program.id,
      title: dayTitle,
      day_number: 1,
      notes: "Owner-created custom day"
    })
    .select("id")
    .single();

  if (dayError) {
    throw dayError;
  }

  if (exerciseIds.length) {
    const databaseExerciseIds = await Promise.all(
      exerciseIds.map((exerciseId) =>
        resolveExerciseRecordId(supabase, gymId, exerciseId)
      )
    );

    const { error: exerciseError } = await supabase.from("workout_exercises").insert(
      databaseExerciseIds.map((exerciseId, index) => ({
        gym_id: gymId,
        workout_day_id: day.id,
        exercise_id: exerciseId,
        sort_order: index + 1,
        sets: Number(formData.get("sets") ?? 3),
        reps: String(formData.get("reps") ?? "8-12"),
        rest_seconds: Number(formData.get("restSeconds") ?? 75)
      }))
    );

    if (exerciseError) {
      throw exerciseError;
    }
  }

  revalidatePath("/owner/programs");
}
