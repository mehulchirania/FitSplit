import type { Exercise, MuscleGroup, MuscleTargetId } from "@/types/domain";

export type MuscleTargetDefinition = {
  id: MuscleTargetId;
  label: string;
  group: MuscleGroup;
  anatomy: string;
  description: string;
  aliases: string[];
};

export const MUSCLE_TARGETS: MuscleTargetDefinition[] = [
  { id: "chest.upper", label: "Upper chest", group: "Chest", anatomy: "Pectoralis major clavicular head", description: "Upper-chest fibers used heavily in incline pressing.", aliases: ["clavicular pec", "upper pec"] },
  { id: "chest.mid", label: "Mid chest", group: "Chest", anatomy: "Pectoralis major sternal fibers", description: "Main chest fibers used in flat pressing and fly variations.", aliases: ["sternal pec", "middle chest"] },
  { id: "chest.lower", label: "Lower chest", group: "Chest", anatomy: "Pectoralis major costal fibers", description: "Lower chest fibers emphasized by decline pressing and dips.", aliases: ["costal pec"] },
  { id: "chest.pec_minor", label: "Pec minor", group: "Chest", anatomy: "Pectoralis minor", description: "Small chest stabilizer involved in scapular control.", aliases: ["pectoralis minor"] },
  { id: "chest.serratus", label: "Serratus", group: "Chest", anatomy: "Serratus anterior", description: "Rib-cage and scapular-control muscle used in push-up and pullover patterns.", aliases: ["serratus anterior"] },

  { id: "back.lats", label: "Lats", group: "Back", anatomy: "Latissimus dorsi", description: "Main back-width muscle used in vertical pulls and pulldowns.", aliases: ["latissimus dorsi"] },
  { id: "back.teres_major", label: "Teres major", group: "Back", anatomy: "Teres major", description: "Upper-lat assistance muscle used in rows and pulldowns.", aliases: ["teres"] },
  { id: "back.rhomboids", label: "Rhomboids", group: "Back", anatomy: "Rhomboids", description: "Mid-back scapular retraction muscles used in rowing.", aliases: ["mid back"] },
  { id: "back.mid_traps", label: "Mid traps", group: "Back", anatomy: "Middle trapezius", description: "Mid-back trap fibers used for scapular retraction.", aliases: ["middle traps"] },
  { id: "back.lower_traps", label: "Lower traps", group: "Back", anatomy: "Lower trapezius", description: "Scapular depression and upward-rotation support.", aliases: ["low traps"] },
  { id: "back.upper_traps", label: "Upper traps", group: "Back", anatomy: "Upper trapezius", description: "Trap fibers emphasized by shrugs and upright pulling.", aliases: ["traps"] },
  { id: "back.rear_delt", label: "Rear delt", group: "Back", anatomy: "Posterior deltoid", description: "Rear shoulder muscle often trained with upper-back pulling.", aliases: ["posterior delt"] },
  { id: "back.spinal_erectors", label: "Spinal erectors", group: "Back", anatomy: "Erector spinae", description: "Lower-back/posterior-chain muscles used in hinges and extensions.", aliases: ["erectors", "lower back"] },
  { id: "back.scapular_stabilizers", label: "Scapular stabilizers", group: "Back", anatomy: "Scapular stabilizers", description: "Support muscles that keep shoulder blades controlled during pulls.", aliases: ["scapula"] },

  { id: "shoulders.front_delt", label: "Front delt", group: "Shoulders", anatomy: "Anterior deltoid", description: "Front shoulder fibers used in pressing and front raises.", aliases: ["anterior delt"] },
  { id: "shoulders.side_delt", label: "Side delt", group: "Shoulders", anatomy: "Lateral deltoid", description: "Side shoulder fibers used for shoulder width.", aliases: ["lateral delt"] },
  { id: "shoulders.rear_delt", label: "Rear delt", group: "Shoulders", anatomy: "Posterior deltoid", description: "Rear shoulder fibers used in reverse fly and face-pull patterns.", aliases: ["posterior delt"] },
  { id: "shoulders.rotator_cuff", label: "Rotator cuff", group: "Shoulders", anatomy: "Rotator cuff group", description: "Deep shoulder stabilizers used for joint control.", aliases: ["cuff"] },
  { id: "shoulders.supraspinatus", label: "Supraspinatus", group: "Shoulders", anatomy: "Supraspinatus", description: "Rotator-cuff muscle that assists shoulder abduction.", aliases: [] },
  { id: "shoulders.infraspinatus", label: "Infraspinatus", group: "Shoulders", anatomy: "Infraspinatus", description: "Rotator-cuff muscle for external rotation.", aliases: [] },
  { id: "shoulders.teres_minor", label: "Teres minor", group: "Shoulders", anatomy: "Teres minor", description: "Rotator-cuff muscle for external rotation and stability.", aliases: [] },
  { id: "shoulders.subscapularis", label: "Subscapularis", group: "Shoulders", anatomy: "Subscapularis", description: "Rotator-cuff muscle for internal rotation.", aliases: [] },

  { id: "biceps.long_head", label: "Biceps long head", group: "Biceps", anatomy: "Biceps brachii long head", description: "Outer biceps head biased by stretched curl positions.", aliases: ["long head"] },
  { id: "biceps.short_head", label: "Biceps short head", group: "Biceps", anatomy: "Biceps brachii short head", description: "Inner biceps head biased by preacher and concentration-style curls.", aliases: ["short head"] },
  { id: "biceps.brachialis", label: "Brachialis", group: "Biceps", anatomy: "Brachialis", description: "Elbow flexor beneath the biceps, emphasized by neutral-grip curls.", aliases: [] },
  { id: "biceps.brachioradialis", label: "Brachioradialis", group: "Biceps", anatomy: "Brachioradialis", description: "Forearm-side elbow flexor used in hammer and reverse curls.", aliases: [] },
  { id: "forearms.flexors", label: "Forearm flexors", group: "Forearms", anatomy: "Wrist/finger flexors", description: "Forearm muscles used for wrist flexion and gripping.", aliases: ["wrist flexors"] },
  { id: "forearms.extensors", label: "Forearm extensors", group: "Forearms", anatomy: "Wrist/finger extensors", description: "Forearm muscles used for wrist extension and reverse-grip control.", aliases: ["wrist extensors"] },
  { id: "forearms.grip", label: "Grip", group: "Forearms", anatomy: "Grip musculature", description: "Finger and hand muscles used to hold implements.", aliases: ["grip strength"] },

  { id: "triceps.long_head", label: "Triceps long head", group: "Triceps", anatomy: "Triceps brachii long head", description: "Triceps head biased by overhead and stretched-arm extension work.", aliases: ["long head"] },
  { id: "triceps.lateral_head", label: "Triceps lateral head", group: "Triceps", anatomy: "Triceps brachii lateral head", description: "Outer triceps head emphasized by pushdowns and lockout work.", aliases: ["lateral head"] },
  { id: "triceps.medial_head", label: "Triceps medial head", group: "Triceps", anatomy: "Triceps brachii medial head", description: "Deep triceps head active across most elbow extension work.", aliases: ["medial head"] },
  { id: "triceps.full", label: "Full triceps", group: "Triceps", anatomy: "All triceps heads", description: "Long, lateral, and medial triceps heads trained together.", aliases: ["all triceps"] },

  { id: "legs.quads_rectus_femoris", label: "Rectus femoris", group: "Legs", anatomy: "Rectus femoris", description: "Quad muscle crossing the hip and knee, active in knee extension.", aliases: [] },
  { id: "legs.quads_vastus_lateralis", label: "Vastus lateralis", group: "Legs", anatomy: "Vastus lateralis", description: "Outer quad muscle used in squats, presses, and extensions.", aliases: ["outer quad"] },
  { id: "legs.quads_vastus_medialis", label: "Vastus medialis", group: "Legs", anatomy: "Vastus medialis / VMO", description: "Inner quad muscle important for knee extension and tracking.", aliases: ["vmo", "inner quad"] },
  { id: "legs.quads_vastus_intermedius", label: "Vastus intermedius", group: "Legs", anatomy: "Vastus intermedius", description: "Deep quad muscle used in knee extension.", aliases: [] },
  { id: "legs.hamstrings_biceps_femoris", label: "Biceps femoris", group: "Legs", anatomy: "Biceps femoris", description: "Hamstring muscle emphasized by hinges and leg curls.", aliases: [] },
  { id: "legs.hamstrings_semitendinosus", label: "Semitendinosus", group: "Legs", anatomy: "Semitendinosus", description: "Medial hamstring muscle used in hinges and curls.", aliases: [] },
  { id: "legs.hamstrings_semimembranosus", label: "Semimembranosus", group: "Legs", anatomy: "Semimembranosus", description: "Medial hamstring muscle used in knee flexion and hip extension.", aliases: [] },
  { id: "legs.glute_max", label: "Glute max", group: "Legs", anatomy: "Gluteus maximus", description: "Primary hip-extension muscle used in squats, lunges, hinges, and thrusts.", aliases: ["glutes"] },
  { id: "legs.glute_med", label: "Glute med", group: "Legs", anatomy: "Gluteus medius", description: "Hip-stability and abduction muscle.", aliases: ["glute medius"] },
  { id: "legs.glute_min", label: "Glute min", group: "Legs", anatomy: "Gluteus minimus", description: "Deep hip-stability and abduction muscle.", aliases: ["glute minimus"] },
  { id: "legs.adductors", label: "Adductors", group: "Legs", anatomy: "Hip adductors", description: "Inner-thigh muscles used in squats and wide-stance work.", aliases: ["inner thigh"] },
  { id: "legs.abductors", label: "Abductors", group: "Legs", anatomy: "Hip abductors", description: "Outer-hip muscles used for hip stability.", aliases: ["outer hip"] },
  { id: "legs.hip_flexors", label: "Hip flexors", group: "Legs", anatomy: "Iliopsoas, rectus femoris, sartorius, TFL", description: "Muscles that lift the thigh and stabilize the hip.", aliases: [] },
  { id: "legs.calves_gastrocnemius", label: "Gastrocnemius", group: "Legs", anatomy: "Gastrocnemius", description: "Main visible calf muscle emphasized by standing calf raises.", aliases: ["gastroc"] },
  { id: "legs.calves_soleus", label: "Soleus", group: "Legs", anatomy: "Soleus", description: "Deep calf muscle emphasized by bent-knee calf raises.", aliases: [] },

  { id: "core.rectus_abdominis", label: "Rectus abdominis", group: "Core", anatomy: "Rectus abdominis", description: "Front abdominal muscle used in crunching patterns.", aliases: ["abs"] },
  { id: "core.transverse_abdominis", label: "Transverse abdominis", group: "Core", anatomy: "Transverse abdominis", description: "Deep bracing muscle used in planks and anti-movement work.", aliases: ["deep core"] },
  { id: "core.external_obliques", label: "External obliques", group: "Core", anatomy: "External obliques", description: "Side-ab muscle used for rotation and anti-rotation.", aliases: ["obliques"] },
  { id: "core.internal_obliques", label: "Internal obliques", group: "Core", anatomy: "Internal obliques", description: "Deep side-ab muscle used for rotation and trunk control.", aliases: [] },
  { id: "core.spinal_erectors", label: "Spinal erectors", group: "Core", anatomy: "Erector spinae", description: "Posterior core muscle used in back extension and bracing.", aliases: ["lower back"] },
  { id: "core.multifidus", label: "Multifidus", group: "Core", anatomy: "Multifidus", description: "Small deep spinal stabilizers.", aliases: [] },
  { id: "core.ql", label: "Quadratus lumborum", group: "Core", anatomy: "Quadratus lumborum", description: "Side lower-back stabilizer used in carries and side planks.", aliases: ["ql"] },

  { id: "cardio.steady_state", label: "Steady-state cardio", group: "Cardio", anatomy: "Cardiorespiratory system", description: "Sustained moderate effort for endurance and calorie output.", aliases: [] },
  { id: "cardio.incline_walk", label: "Incline walk", group: "Cardio", anatomy: "Cardiorespiratory system and posterior chain", description: "Low-impact conditioning with glutes and calves involved.", aliases: [] },
  { id: "cardio.hiit", label: "HIIT", group: "Cardio", anatomy: "High-intensity conditioning", description: "Short hard intervals for conditioning.", aliases: ["intervals"] },
  { id: "cardio.cycling", label: "Cycling", group: "Cardio", anatomy: "Cardiorespiratory system and legs", description: "Bike-based conditioning with quad and glute involvement.", aliases: [] },
  { id: "cardio.rowing", label: "Rowing", group: "Cardio", anatomy: "Cardiorespiratory system and posterior chain", description: "Full-body conditioning with back, legs, and grip involvement.", aliases: [] },
  { id: "cardio.sled", label: "Sled work", group: "Cardio", anatomy: "Cardiorespiratory system and legs", description: "Loaded conditioning with legs and trunk bracing.", aliases: [] },
  { id: "cardio.full_body_conditioning", label: "Full-body conditioning", group: "Cardio", anatomy: "Whole-body conditioning", description: "Circuit-style conditioning using multiple regions.", aliases: ["conditioning"] }
];

const targetById = new Map(MUSCLE_TARGETS.map((target) => [target.id, target]));
const targetIdSet = new Set(MUSCLE_TARGETS.map((target) => target.id));

export function isMuscleTargetId(value: string): value is MuscleTargetId {
  return targetIdSet.has(value as MuscleTargetId);
}

export function getMuscleTarget(id: string) {
  return targetById.get(id as MuscleTargetId);
}

export function getMuscleTargetLabel(id: string) {
  return getMuscleTarget(id)?.label ?? id;
}

export function getTargetsForMuscleGroup(group: MuscleGroup | string) {
  return MUSCLE_TARGETS.filter((target) => target.group === group);
}

export function normalizeMuscleTargetIds(value: unknown): MuscleTargetId[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? parseTargetString(value)
      : [];

  return Array.from(
    new Set(
      raw
        .map((item) => String(item).trim())
        .filter(isMuscleTargetId)
    )
  );
}

function parseTargetString(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fall through to comma-separated parsing.
  }
  return trimmed.split(",");
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function inferExerciseTargets(exercise: Pick<Exercise, "name" | "muscleGroup">): {
  primaryTargets: MuscleTargetId[];
  secondaryTargets: MuscleTargetId[];
  movementPattern: string;
  muscleTargetDescription: string;
} {
  const name = exercise.name.toLowerCase();
  const group = exercise.muscleGroup;

  if (group === "Chest") {
    if (name.includes("incline")) return buildInference(["chest.upper"], ["shoulders.front_delt", "triceps.full"], "incline_press", "Primarily targets the upper chest, with front delts and triceps assisting.");
    if (includesAny(name, ["decline", "dip"])) return buildInference(["chest.lower"], ["triceps.full", "shoulders.front_delt"], "horizontal_press", "Biases the lower chest, with triceps assisting the lockout.");
    if (includesAny(name, ["fly", "crossover"])) return buildInference(["chest.mid"], ["chest.upper", "chest.lower"], "fly", "Isolates chest adduction with a controlled stretch and squeeze.");
    if (name.includes("pullover")) return buildInference(["chest.serratus"], ["back.lats", "chest.mid"], "pullover", "Targets serratus and chest control with lats assisting the pullover path.");
    return buildInference(["chest.mid"], ["shoulders.front_delt", "triceps.full"], "horizontal_press", "Primarily targets the mid chest, with front delts and triceps assisting the press.");
  }

  if (group === "Back") {
    if (includesAny(name, ["pull-up", "pull ups", "pulldown", "chin-up", "chin ups", "straight arm"])) return buildInference(["back.lats"], ["back.teres_major", "biceps.brachialis"], "vertical_pull", "Targets lat width, with teres major and elbow flexors assisting.");
    if (includesAny(name, ["row"])) return buildInference(["back.rhomboids", "back.mid_traps"], ["back.lats", "back.rear_delt"], "horizontal_pull", "Targets the mid back through scapular retraction, with lats and rear delts assisting.");
    if (includesAny(name, ["deadlift", "hyperextension", "extension"])) return buildInference(["back.spinal_erectors"], ["legs.glute_max", "legs.hamstrings_biceps_femoris"], "hinge", "Targets spinal erectors and posterior-chain bracing.");
    return buildInference(["back.lats"], ["back.rhomboids", "back.mid_traps"], "pull", "Targets lats and mid-back support muscles.");
  }

  if (group === "Shoulders") {
    if (includesAny(name, ["lateral", "upright"])) return buildInference(["shoulders.side_delt"], ["shoulders.front_delt", "back.upper_traps"], "shoulder_abduction", "Biases the side delts for shoulder width.");
    if (includesAny(name, ["reverse", "rear", "face pull"])) return buildInference(["shoulders.rear_delt"], ["back.mid_traps", "shoulders.rotator_cuff"], "rear_delt_pull", "Targets rear delts with upper-back and rotator-cuff support.");
    if (name.includes("front raise")) return buildInference(["shoulders.front_delt"], ["chest.upper"], "shoulder_flexion", "Targets front delts through shoulder flexion.");
    if (name.includes("shrug")) return buildInference(["back.upper_traps"], ["back.scapular_stabilizers"], "shrug", "Targets upper traps with scapular control.");
    return buildInference(["shoulders.front_delt"], ["shoulders.side_delt", "triceps.full"], "vertical_press", "Targets front delts and pressing strength, with side delts and triceps assisting.");
  }

  if (group === "Biceps") {
    if (includesAny(name, ["hammer"])) return buildInference(["biceps.brachialis", "biceps.brachioradialis"], ["biceps.long_head"], "elbow_flexion_neutral", "Emphasizes brachialis and brachioradialis with biceps assisting.");
    if (includesAny(name, ["reverse"])) return buildInference(["biceps.brachioradialis", "forearms.extensors"], ["biceps.brachialis"], "reverse_curl", "Targets brachioradialis and forearm extensors with strict elbow flexion.");
    if (includesAny(name, ["incline", "bayesian"])) return buildInference(["biceps.long_head"], ["forearms.flexors"], "elbow_flexion", "Biases the biceps long head from a stretched shoulder position.");
    if (includesAny(name, ["preacher", "concentration", "machine preacher"])) return buildInference(["biceps.short_head"], ["biceps.brachialis"], "elbow_flexion_supported", "Biases the biceps short head with a strict supported elbow position.");
    if (name.includes("high cable")) return buildInference(["biceps.short_head"], ["biceps.long_head"], "elbow_flexion_cable", "Targets the biceps with a short-head bias from the high-cable angle.");
    return buildInference(["biceps.long_head", "biceps.short_head"], ["biceps.brachialis"], "elbow_flexion", "Targets the biceps long and short heads, with brachialis assisting.");
  }

  if (group === "Triceps") {
    if (name.includes("overhead")) return buildInference(["triceps.long_head"], ["triceps.medial_head"], "elbow_extension_overhead", "Biases the triceps long head from an overhead stretched position.");
    if (includesAny(name, ["pushdown", "pressdown"])) return buildInference(["triceps.lateral_head", "triceps.medial_head"], ["triceps.long_head"], "elbow_extension", "Targets the lateral and medial triceps heads with controlled elbow extension.");
    if (includesAny(name, ["kickback"])) return buildInference(["triceps.lateral_head"], ["triceps.medial_head"], "elbow_extension", "Emphasizes the lateral triceps head near lockout.");
    if (includesAny(name, ["close grip", "dip", "jm press", "skull"])) return buildInference(["triceps.full"], ["chest.mid", "shoulders.front_delt"], "compound_elbow_extension", "Trains all triceps heads, with chest and front delts assisting compound variations.");
    return buildInference(["triceps.full"], ["triceps.long_head", "triceps.lateral_head"], "elbow_extension", "Targets all three triceps heads through elbow extension.");
  }

  if (group === "Legs") {
    if (includesAny(name, ["romanian", "deadlift"])) return buildInference(["legs.hamstrings_biceps_femoris", "legs.glute_max"], ["back.spinal_erectors"], "hinge", "Targets hamstrings and glutes with spinal erectors bracing.");
    if (name.includes("curl")) return buildInference(["legs.hamstrings_biceps_femoris", "legs.hamstrings_semitendinosus"], ["legs.hamstrings_semimembranosus"], "knee_flexion", "Isolates the hamstrings through knee flexion.");
    if (name.includes("extension")) return buildInference(["legs.quads_rectus_femoris", "legs.quads_vastus_medialis"], ["legs.quads_vastus_lateralis"], "knee_extension", "Isolates the quads, especially rectus femoris and the vastus group.");
    if (name.includes("calf") && name.includes("seated")) return buildInference(["legs.calves_soleus"], ["legs.calves_gastrocnemius"], "calf_raise", "Biases the soleus with bent-knee calf work.");
    if (name.includes("calf")) return buildInference(["legs.calves_gastrocnemius"], ["legs.calves_soleus"], "calf_raise", "Targets the gastrocnemius with soleus assisting.");
    if (includesAny(name, ["lunge", "split"])) return buildInference(["legs.glute_max", "legs.quads_vastus_medialis"], ["legs.hamstrings_biceps_femoris", "legs.adductors"], "single_leg_squat", "Targets glutes and quads with hamstrings and adductors stabilizing.");
    if (includesAny(name, ["front squat", "hack", "goblet", "leg press", "squat"])) return buildInference(["legs.quads_vastus_lateralis", "legs.quads_vastus_medialis"], ["legs.glute_max", "legs.adductors"], "squat", "Targets the quads with glutes and adductors assisting the squat pattern.");
    return buildInference(["legs.quads_vastus_lateralis"], ["legs.glute_max", "legs.hamstrings_biceps_femoris"], "lower_body", "Targets lower-body strength across quads, glutes, and hamstrings.");
  }

  if (group === "Core") {
    if (includesAny(name, ["hyperextension", "back extension"])) return buildInference(["core.spinal_erectors"], ["legs.glute_max", "legs.hamstrings_biceps_femoris"], "back_extension", "Targets spinal erectors with glutes and hamstrings assisting.");
    if (includesAny(name, ["twist", "wood", "side"])) return buildInference(["core.external_obliques", "core.internal_obliques"], ["core.transverse_abdominis"], "rotation", "Targets obliques with deep-core bracing.");
    return buildInference(["core.rectus_abdominis"], ["core.transverse_abdominis", "legs.hip_flexors"], "trunk_flexion", "Targets the abs with deep-core and hip-flexor support.");
  }

  if (group === "Forearms") {
    if (name.includes("reverse")) return buildInference(["forearms.extensors"], ["biceps.brachioradialis"], "wrist_extension", "Targets forearm extensors and reverse-grip control.");
    return buildInference(["forearms.flexors"], ["forearms.grip"], "wrist_flexion", "Targets forearm flexors and grip control.");
  }

  return buildInference(["cardio.full_body_conditioning"], ["cardio.steady_state"], "conditioning", "Conditioning work for stamina, heart rate, and total-body work capacity.");
}

function buildInference(
  primaryTargets: MuscleTargetId[],
  secondaryTargets: MuscleTargetId[],
  movementPattern: string,
  muscleTargetDescription: string
) {
  return { primaryTargets, secondaryTargets, movementPattern, muscleTargetDescription };
}

export function normalizeExerciseTargetFields(
  source: Partial<Pick<Exercise, "name" | "muscleGroup" | "primaryTargets" | "secondaryTargets" | "movementPattern" | "muscleTargetDescription" | "targetNotes">>,
  fallback?: Partial<Exercise>
) {
  const base = {
    name: String(source.name ?? fallback?.name ?? "Exercise"),
    muscleGroup: (source.muscleGroup ?? fallback?.muscleGroup ?? "Core") as MuscleGroup
  };
  const inferred = inferExerciseTargets(base);
  const primaryTargets = normalizeMuscleTargetIds(source.primaryTargets).length
    ? normalizeMuscleTargetIds(source.primaryTargets)
    : normalizeMuscleTargetIds(fallback?.primaryTargets).length
      ? normalizeMuscleTargetIds(fallback?.primaryTargets)
      : inferred.primaryTargets;
  const secondaryTargets = normalizeMuscleTargetIds(source.secondaryTargets).length
    ? normalizeMuscleTargetIds(source.secondaryTargets)
    : normalizeMuscleTargetIds(fallback?.secondaryTargets).length
      ? normalizeMuscleTargetIds(fallback?.secondaryTargets)
      : inferred.secondaryTargets;
  const muscleTargetDescription = String(
    source.muscleTargetDescription ??
    source.targetNotes ??
    fallback?.muscleTargetDescription ??
    fallback?.targetNotes ??
    inferred.muscleTargetDescription
  ).trim();

  return {
    primaryTargets,
    secondaryTargets,
    movementPattern: String(source.movementPattern ?? fallback?.movementPattern ?? inferred.movementPattern).trim(),
    muscleTargetDescription,
    targetNotes: String(source.targetNotes ?? fallback?.targetNotes ?? muscleTargetDescription).trim()
  };
}

export function getExerciseTargetSummary(exercise: Exercise) {
  return normalizeExerciseTargetFields(exercise);
}

