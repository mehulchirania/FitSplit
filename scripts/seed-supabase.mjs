import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import workoutsData from "../lib/workouts.json" with { type: "json" };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerId = "00000000-0000-0000-0000-000000000001";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function upsertOwner() {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", ownerId)
    .maybeSingle();

  if (data?.id) {
    return;
  }

  const { error } = await supabase.from("profiles").insert({
    id: ownerId,
    full_name: "Titan V2 Owner",
    email: "owner@titanv2.local",
    role: "owner",
    is_active: true
  });

  if (error) {
    throw error;
  }
}

async function upsertGym() {
  const { data: existingGym } = await supabase
    .from("gyms")
    .select("id")
    .eq("slug", "titan-v2-fitness")
    .maybeSingle();

  if (existingGym?.id) {
    return existingGym.id;
  }

  const { data, error } = await supabase
    .from("gyms")
    .insert({
      name: "Titan V2 Fitness",
      slug: "titan-v2-fitness",
      owner_user_id: ownerId,
      expiry_warning_days: 7
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  await supabase.from("profiles").update({ default_gym_id: data.id }).eq("id", ownerId);
  return data.id;
}

async function getOrCreateExercise(gymId, muscleGroup, exercise) {
  const { data: existingExercise } = await supabase
    .from("exercise_library")
    .select("id")
    .eq("gym_id", gymId)
    .eq("name", exercise.name)
    .maybeSingle();

  if (existingExercise?.id) {
    return existingExercise.id;
  }

  const { data, error } = await supabase
    .from("exercise_library")
    .insert({
      gym_id: gymId,
      name: exercise.name,
      muscle_group: muscleGroup,
      equipment: exercise.mechanic,
      instructions: `${exercise.mechanic} ${muscleGroup.toLowerCase()} movement. Add final coaching notes and demo video later.`,
      video_source: "none",
      owner_only: true,
      is_active: true,
      created_by: ownerId
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function seedExercises(gymId) {
  const idMap = new Map();

  for (const [muscleGroup, exercises] of Object.entries(workoutsData.exercise_catalog)) {
    for (const exercise of exercises) {
      const databaseId = await getOrCreateExercise(gymId, muscleGroup, exercise);
      idMap.set(exercise.id, databaseId);
    }
  }

  return idMap;
}

function splitTypeFor(split) {
  if (split.is_custom) return "custom";
  if (split.split_id === "split_01") return "ppl_x2";
  if (split.split_id === "split_02") return "ppl_upper_lower";
  if (split.split_id === "split_03") return "bro_split";
  return "combo_x2";
}

async function seedSplitTemplates(gymId, exerciseIdMap) {
  for (const split of workoutsData.training_splits) {
    const { data: existingProgram } = await supabase
      .from("workout_programs")
      .select("id")
      .eq("gym_id", gymId)
      .eq("title", split.name)
      .maybeSingle();

    if (existingProgram?.id) {
      continue;
    }

    const activeDays = split.schedule.filter((day) => day.workouts.length > 0);
    const { data: program, error: programError } = await supabase
      .from("workout_programs")
      .insert({
        gym_id: gymId,
        title: split.name,
        description: split.description,
        goal: split.is_custom ? "Owner-selected custom routine" : "Structured hypertrophy training",
        difficulty: split.split_id === "split_04" ? "advanced" : "intermediate",
        days_per_week: activeDays.length,
        split_type: splitTypeFor(split),
        is_active: true,
        created_by: ownerId
      })
      .select("id")
      .single();

    if (programError) {
      throw programError;
    }

    for (const day of split.schedule) {
      const { data: workoutDay, error: dayError } = await supabase
        .from("workout_days")
        .insert({
          gym_id: gymId,
          program_id: program.id,
          title: day.title,
          day_number: day.day,
          notes: day.workouts.length ? day.title : "Rest and recovery"
        })
        .select("id")
        .single();

      if (dayError) {
        throw dayError;
      }

      const workoutExercises = day.workouts
        .filter((workout) => workout.exercise_id && exerciseIdMap.has(workout.exercise_id))
        .map((workout, index) => ({
          gym_id: gymId,
          workout_day_id: workoutDay.id,
          exercise_id: exerciseIdMap.get(workout.exercise_id),
          sort_order: index + 1,
          sets: workout.sets || null,
          reps: workout.reps || null,
          rest_seconds: 75
        }));

      if (workoutExercises.length) {
        const { error: exerciseError } = await supabase
          .from("workout_exercises")
          .insert(workoutExercises);

        if (exerciseError) {
          throw exerciseError;
        }
      }
    }

    const { error: templateError } = await supabase.from("workout_split_templates").insert({
      id: randomUUID(),
      gym_id: gymId,
      name: split.name,
      split_type: splitTypeFor(split),
      description: split.description,
      days_per_week: activeDays.length,
      template_data: split,
      created_by: ownerId,
      is_system_template: true
    });

    if (templateError) {
      throw templateError;
    }
  }
}

await upsertOwner();
const gymId = await upsertGym();
const exerciseIdMap = await seedExercises(gymId);
await seedSplitTemplates(gymId, exerciseIdMap);

console.log("Supabase seed complete for Titan V2 Fitness.");
