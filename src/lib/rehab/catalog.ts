/**
 * Rehab & mobility catalogue: static, typed, text-only.
 *
 * Exercises are defined once and conditions refer to them by id, so an exercise that suits
 * several conditions (glute bridge, child's pose...) is one entity and combining routines
 * can dedupe by id. Everything here is conservative, standard physio-style material meant
 * as general guidance, not treatment. Dosages are starting points, never targets to push.
 */

/** Firestore field on users/{uid} holding the ids of the conditions the user opted into. */
export const REHAB_FIELD = "rehabConditions";

/** Condition id used by the seed script for the demo user: `rehabConditions: [LOWER_BACK_PAIN_ID]`. */
export const LOWER_BACK_PAIN_ID = "lower-back-pain";

export type Dosage =
  | { kind: "hold"; seconds: number; sets: number; perSide?: boolean }
  | { kind: "reps"; reps: number; sets: number; perSide?: boolean; /** Seconds per rep, default 3. */ repSeconds?: number };

export type RehabExercise = {
  id: string;
  name: string;
  /** What it works on, in plain words. */
  target: string;
  dosage: Dosage;
  /** 2 to 4 short cues, in the order you do them. */
  cues: string[];
  /** When to stop this exercise. */
  stopIf: string;
  /** Anything you need besides the floor. */
  equipment?: string;
};

export type RehabCondition = {
  id: string;
  name: string;
  /** One or two sentences: who this routine is for. */
  forWho: string;
  causes: string[];
  /** Ordered exercise ids, 5 to 8, gentle mobility first and strengthening after. */
  routine: string[];
};

const hold = (seconds: number, sets: number, perSide = false): Dosage => ({ kind: "hold", seconds, sets, perSide });
const reps = (n: number, sets: number, perSide = false, repSeconds?: number): Dosage => ({
  kind: "reps",
  reps: n,
  sets,
  perSide,
  ...(repSeconds ? { repSeconds } : {})
});

const PAIN = "pain increases or becomes sharp";

const EXERCISE_LIST: RehabExercise[] = [
  {
    id: "cat-cow",
    name: "Cat-cow",
    target: "Spine mobility",
    dosage: reps(10, 1, false, 4),
    cues: [
      "On hands and knees, hands under shoulders, knees under hips.",
      "Breathe out and round your back toward the ceiling, tucking chin and tailbone.",
      "Breathe in and let your belly sink as you lift chest and tailbone gently.",
      "Move slowly and stay in a comfortable range."
    ],
    stopIf: `Stop if ${PAIN}, or you feel pinching in the wrists or lower back.`
  },
  {
    id: "childs-pose",
    name: "Child's pose",
    target: "Lower back and hips, gentle stretch",
    dosage: hold(30, 2),
    cues: [
      "Kneel, sit back toward your heels and reach your arms forward on the floor.",
      "Let your forehead rest down and your back relax.",
      "Breathe slowly into your lower back."
    ],
    stopIf: "Stop if you feel knee pain or sharp pain in the back."
  },
  {
    id: "supine-hamstring-stretch",
    name: "Lying hamstring stretch",
    target: "Hamstrings",
    dosage: hold(30, 2, true),
    cues: [
      "Lie on your back and loop a strap or towel around one foot.",
      "Raise that leg, keeping a soft bend in the knee if needed.",
      "Keep your head and hips relaxed on the floor and feel the stretch behind the thigh."
    ],
    stopIf: "Stop if you feel tingling or pain running down the leg.",
    equipment: "Strap or towel"
  },
  {
    id: "hip-90-90",
    name: "90/90 hip stretch",
    target: "Hip rotators and glutes",
    dosage: hold(30, 2, true),
    cues: [
      "Sit with the front knee bent at 90 degrees and the back knee bent behind you.",
      "Sit tall, then hinge forward from the hips over the front shin.",
      "Stay relaxed; the stretch is deep in the hip, not the knee."
    ],
    stopIf: "Stop if you feel pain in the knee or a pinch at the front of the hip."
  },
  {
    id: "glute-bridge",
    name: "Glute bridge",
    target: "Glutes and hamstrings",
    dosage: reps(12, 2, false, 4),
    cues: [
      "Lie on your back, knees bent, feet flat hip-width apart.",
      "Press through your heels and lift your hips until your body is a straight line from shoulders to knees.",
      "Squeeze your glutes at the top for a moment, then lower slowly.",
      "Keep your ribs down; do not arch your lower back."
    ],
    stopIf: `Stop if ${PAIN}, or you feel it mainly in the lower back rather than the glutes.`
  },
  {
    id: "clamshell",
    name: "Clamshell",
    target: "Outer hip and glute medius",
    dosage: reps(12, 2, true),
    cues: [
      "Lie on your side, hips and knees bent, feet together.",
      "Keeping your feet touching, lift the top knee like a clamshell opening.",
      "Do not roll your pelvis backward; the movement comes from the hip.",
      "Lower slowly."
    ],
    stopIf: `Stop if ${PAIN}, or you feel pinching at the front of the hip.`
  },
  {
    id: "bird-dog",
    name: "Bird dog",
    target: "Deep core, glutes, back stabilisers",
    dosage: reps(8, 2, true, 6),
    cues: [
      "On hands and knees with a flat back.",
      "Reach one arm forward and the opposite leg back until they are in line with your spine.",
      "Pause for a few seconds without letting your hips twist or your back sag.",
      "Return with control and switch sides."
    ],
    stopIf: `Stop if ${PAIN}, or your back cannot stay still during the reach.`
  },
  {
    id: "dead-bug",
    name: "Dead bug",
    target: "Deep core",
    dosage: reps(8, 2, true, 5),
    cues: [
      "Lie on your back, hips and knees bent at 90 degrees, arms pointing up.",
      "Press your lower back gently into the floor and keep it there.",
      "Slowly lower the opposite arm and leg toward the floor, then return.",
      "Breathe out as you lower."
    ],
    stopIf: "Stop if your lower back lifts off the floor or you feel strain in it; shorten the range."
  },
  {
    id: "side-plank",
    name: "Side plank (knees bent)",
    target: "Side core and hip stabilisers",
    dosage: hold(20, 2, true),
    cues: [
      "Lie on your side with knees bent and your elbow under your shoulder.",
      "Lift your hips so your body forms a straight line from knees to head.",
      "Breathe steadily and keep your hips from dropping."
    ],
    stopIf: "Stop if you feel shoulder pain or sharp pain in the lower back."
  },
  {
    id: "front-plank",
    name: "Forearm plank",
    target: "Core and glutes",
    dosage: hold(20, 2),
    cues: [
      "Place forearms on the floor with elbows under shoulders; knees down if needed.",
      "Make a straight line from head to hips, squeezing glutes and abs.",
      "Breathe normally and stop when your hips start to sag."
    ],
    stopIf: "Stop if your lower back sags or aches; rest and try a shorter hold."
  },
  {
    id: "chin-tuck",
    name: "Chin tuck",
    target: "Deep neck flexors",
    dosage: reps(10, 1, false, 5),
    cues: [
      "Sit or stand tall, looking straight ahead.",
      "Glide your head straight back, as if making a double chin, without tilting it down.",
      "Hold for about 3 seconds, then relax."
    ],
    stopIf: "Stop if you feel dizziness, arm tingling or sharp neck pain."
  },
  {
    id: "scapular-retraction",
    name: "Shoulder blade squeeze",
    target: "Mid traps and rhomboids",
    dosage: reps(12, 2, false, 5),
    cues: [
      "Sit or stand tall with arms by your sides, palms forward.",
      "Draw your shoulder blades back and slightly down, as if tucking them into back pockets.",
      "Hold for 3 to 5 seconds, then release slowly."
    ],
    stopIf: "Stop if you feel pinching at the front of the shoulder or neck strain."
  },
  {
    id: "wall-angel",
    name: "Wall angel",
    target: "Shoulder blade control, chest and upper back mobility",
    dosage: reps(10, 2, false, 5),
    cues: [
      "Stand with your back, head and hips lightly against a wall, feet a step away.",
      "Bring your arms up against the wall, elbows bent like a goalpost.",
      "Slide them up as far as you can while keeping contact, then lower slowly.",
      "Keep your ribs down; do not arch your back."
    ],
    stopIf: "Stop if you feel pinching at the top of the shoulder or tingling in the hands."
  },
  {
    id: "prone-y-raise",
    name: "Prone Y raise",
    target: "Lower traps",
    dosage: reps(10, 2, false, 5),
    cues: [
      "Lie face down with your forehead resting on the floor and arms overhead in a Y, thumbs up.",
      "Gently squeeze your shoulder blades down and lift your arms a few centimetres.",
      "Hold for a moment, then lower slowly. Keep your neck long."
    ],
    stopIf: `Stop if ${PAIN} in the neck, shoulder or lower back.`
  },
  {
    id: "band-pull-apart",
    name: "Band pull-apart",
    target: "Rear shoulders and mid traps",
    dosage: reps(15, 2),
    cues: [
      "Hold a light band in front of you at chest height, arms straight.",
      "Pull the band apart by moving your hands out to the sides, squeezing your shoulder blades.",
      "Return slowly and do not shrug."
    ],
    stopIf: "Stop if you feel shoulder pinching or the band pulls your ribs forward.",
    equipment: "Light resistance band"
  },
  {
    id: "upper-trap-stretch",
    name: "Upper trap stretch",
    target: "Upper trapezius",
    dosage: hold(25, 2, true),
    cues: [
      "Sit tall and hold the edge of the seat with the hand on the side you are stretching.",
      "Tilt your ear toward the opposite shoulder until you feel a gentle stretch.",
      "Keep your shoulder down; do not pull with your hand."
    ],
    stopIf: "Stop if you feel tingling, numbness or pain down the arm."
  },
  {
    id: "levator-stretch",
    name: "Levator scapulae stretch",
    target: "Side and back of the neck",
    dosage: hold(25, 2, true),
    cues: [
      "Sit tall and turn your head about 45 degrees to one side, looking down toward your armpit.",
      "Let the weight of your head deepen the stretch gently.",
      "Keep the shoulder on that side relaxed and down."
    ],
    stopIf: "Stop if you feel dizziness, tingling or sharp pain."
  },
  {
    id: "thoracic-extension-roller",
    name: "Thoracic extension over a roller",
    target: "Upper back mobility",
    dosage: hold(30, 2),
    cues: [
      "Lie with a foam roller across your mid back, knees bent and hands supporting your head.",
      "Let your upper back gently arch over the roller, keeping your ribs down.",
      "Breathe slowly. Move the roller up or down a little to find another stiff spot."
    ],
    stopIf: "Stop if you feel sharp pain, or pressure in the lower back or neck. Keep the roller off your lower back.",
    equipment: "Foam roller"
  },
  {
    id: "open-book",
    name: "Open book rotation",
    target: "Upper back rotation",
    dosage: reps(8, 1, true, 5),
    cues: [
      "Lie on your side, knees bent and stacked, arms straight out in front.",
      "Open the top arm across your body and follow it with your eyes, rotating your upper back.",
      "Keep your knees together, then return slowly."
    ],
    stopIf: `Stop if ${PAIN}, or you feel pinching at the front of the shoulder.`
  },
  {
    id: "doorway-pec-stretch",
    name: "Doorway chest stretch",
    target: "Pecs and front of the shoulder",
    dosage: hold(30, 2, true),
    cues: [
      "Stand in a doorway with one forearm on the frame, elbow at about shoulder height or a bit lower.",
      "Step through gently until you feel a stretch across the chest.",
      "Keep your ribs down and your neck relaxed."
    ],
    stopIf: "Stop if you feel pinching in the shoulder or tingling in the arm."
  },
  {
    id: "band-external-rotation",
    name: "Band external rotation",
    target: "Rotator cuff",
    dosage: reps(12, 2, true),
    cues: [
      "Hold a light band with your elbow bent at 90 degrees, tucked against your side.",
      "Keeping the elbow in, rotate your forearm outward, then return slowly.",
      "Keep the movement small and controlled, with no shrugging."
    ],
    stopIf: "Stop if you feel a sharp pinch in the front or top of the shoulder.",
    equipment: "Light resistance band"
  },
  {
    id: "hip-flexor-stretch",
    name: "Kneeling hip flexor stretch",
    target: "Hip flexors",
    dosage: hold(30, 2, true),
    cues: [
      "Kneel on one knee, with a cushion under it, and the other foot forward.",
      "Squeeze the glute of the back leg and tuck your pelvis slightly under.",
      "Shift forward a little until you feel a stretch at the front of the back hip. Stay upright."
    ],
    stopIf: "Stop if you feel knee pain or a pinch at the front of the hip, or your lower back arches."
  },
  {
    id: "figure-four-stretch",
    name: "Figure-four stretch",
    target: "Glutes and hip rotators",
    dosage: hold(30, 2, true),
    cues: [
      "Lie on your back with knees bent. Cross one ankle over the opposite knee.",
      "Draw the lower thigh toward your chest until you feel a stretch in the outer hip.",
      "Keep your head and shoulders relaxed."
    ],
    stopIf: "Stop if you feel knee pain or pain pinching deep in the hip."
  },
  {
    id: "pelvic-tilt",
    name: "Lying pelvic tilt",
    target: "Lower abs and pelvic control",
    dosage: reps(10, 2, false, 5),
    cues: [
      "Lie on your back, knees bent, feet flat.",
      "Breathe out and gently flatten your lower back toward the floor by tucking your tailbone.",
      "Hold for a few seconds, then ease back to neutral."
    ],
    stopIf: `Stop if ${PAIN}.`
  },
  {
    id: "seated-anterior-tilt",
    name: "Seated pelvic rock",
    target: "Pelvic position and lower back mobility",
    dosage: reps(10, 1, false, 4),
    cues: [
      "Sit tall on the front half of a chair, feet flat.",
      "Roll your pelvis forward so your lower back gently arches and your chest lifts.",
      "Roll back to neutral. Keep the movement small and smooth."
    ],
    stopIf: "Stop if you feel pinching or sharp pain in the lower back."
  },
  {
    id: "hip-hinge",
    name: "Hip hinge",
    target: "Hinging pattern, hamstrings and glutes",
    dosage: reps(10, 2, false, 4),
    cues: [
      "Stand with feet hip-width apart and a soft bend in your knees.",
      "Push your hips straight back as if closing a door with them, keeping your back flat.",
      "Stop when you feel your hamstrings load, then squeeze your glutes to stand tall."
    ],
    stopIf: "Stop if your back rounds, or you feel pain in the lower back or behind the knee."
  },
  {
    id: "standing-march",
    name: "Standing march",
    target: "Hip flexor strength and balance",
    dosage: reps(10, 2, true, 3),
    cues: [
      "Stand tall near a wall or chair for support.",
      "Lift one knee toward hip height without leaning back.",
      "Lower with control and alternate sides."
    ],
    stopIf: "Stop if you feel pinching at the front of the hip or lose your balance."
  },
  {
    id: "quad-stretch",
    name: "Standing quad stretch",
    target: "Front of the thigh",
    dosage: hold(30, 2, true),
    cues: [
      "Stand holding a wall for balance and bend one knee, holding your ankle.",
      "Keep your knees close together and your hips pushed gently forward.",
      "Do not pull hard; keep the stretch comfortable."
    ],
    stopIf: "Stop if you feel pain in the front of the knee itself, rather than a stretch in the thigh."
  },
  {
    id: "calf-stretch",
    name: "Wall calf stretch",
    target: "Calves",
    dosage: hold(30, 2, true),
    cues: [
      "Place your hands on a wall with one leg back, heel flat on the floor.",
      "Keep the back knee straight and lean forward until you feel a stretch in the calf.",
      "Keep both feet pointing straight ahead."
    ],
    stopIf: "Stop if you feel pain behind the knee or in the Achilles tendon."
  },
  {
    id: "straight-leg-raise",
    name: "Straight leg raise",
    target: "Quads, without bending the knee",
    dosage: reps(10, 2, true, 4),
    cues: [
      "Lie on your back with one knee bent and the other leg straight.",
      "Tighten the thigh of the straight leg and lift it to the height of the bent knee.",
      "Hold for a moment, then lower slowly."
    ],
    stopIf: `Stop if ${PAIN} in the knee.`
  },
  {
    id: "mini-wall-sit",
    name: "Shallow wall sit",
    target: "Quads and glutes",
    dosage: hold(20, 2),
    cues: [
      "Stand with your back against a wall, feet a step forward and hip-width apart.",
      "Slide down only a short way, with knees bent less than 45 degrees.",
      "Keep your knees tracking over your second toe and weight in your heels."
    ],
    stopIf: "Stop if the front of the knee hurts. Go shallower, or skip it."
  },
  {
    id: "side-leg-raise",
    name: "Side-lying leg raise",
    target: "Outer hip (gluteus medius)",
    dosage: reps(12, 2, true, 3),
    cues: [
      "Lie on your side with your hips stacked and your bottom knee bent for balance.",
      "Keep the top leg straight and toes pointing forward, then lift it a short way up and slightly back.",
      "Lower slowly without rocking your hips backward."
    ],
    stopIf: `Stop if ${PAIN} in the hip or lower back.`
  },
  {
    id: "band-side-step",
    name: "Banded side step",
    target: "Outer hip, keeping the knees from drifting in",
    dosage: reps(10, 2, true, 3),
    cues: [
      "Place a light band just above your knees and stand with feet hip-width apart, knees slightly bent.",
      "Step sideways, keeping your knees pushed out against the band and toes forward.",
      "Take small steps and keep your hips level."
    ],
    stopIf: `Stop if ${PAIN} in the knee or hip.`,
    equipment: "Light loop band"
  },
  {
    id: "sit-to-stand-knees-out",
    name: "Sit-to-stand, knees out",
    target: "Glutes and thighs with knee control",
    dosage: reps(10, 2, false, 4),
    cues: [
      "Sit on a chair with feet hip-width apart and toes pointing slightly out.",
      "Stand up slowly, pressing your knees out so they track over your second toe.",
      "Sit back down with control; do not let your knees fall inward."
    ],
    stopIf: `Stop if ${PAIN} in the knees.`
  },
  {
    id: "single-leg-balance",
    name: "Single-leg balance",
    target: "Balance and control from foot to hip",
    dosage: hold(30, 2, true),
    cues: [
      "Stand near a wall or chair for support and lift one foot a short way off the floor.",
      "Keep your standing knee soft and pointing over your second toe, with the arch of your foot gently lifted.",
      "Stand tall and keep your hips level."
    ],
    stopIf: "Stop if you lose your balance or feel pain in the foot, knee or hip."
  },
  {
    id: "foot-roll",
    name: "Foot roll",
    target: "Sole of the foot, gentle release",
    dosage: hold(45, 1, true),
    cues: [
      "Sit on a chair and place a tennis ball or similar ball under one foot.",
      "Roll slowly from the heel to the ball of the foot with light pressure.",
      "Pause on any tight spot and breathe; keep the pressure comfortable."
    ],
    stopIf: "Stop if you feel sharp pain, numbness or tingling in the foot.",
    equipment: "Tennis ball"
  },
  {
    id: "short-foot",
    name: "Short foot",
    target: "Small muscles that support the arch",
    dosage: hold(10, 3, true),
    cues: [
      "Sit or stand with your foot flat and your toes relaxed.",
      "Without curling your toes, draw the ball of your foot toward your heel so the arch lifts.",
      "Hold, keeping the big toe and heel pressed down, then relax."
    ],
    stopIf: "Stop if you feel cramping that does not ease, or sharp pain in the foot."
  },
  {
    id: "toe-yoga",
    name: "Toe lift and spread",
    target: "Big toe control and arch",
    dosage: reps(8, 2, true, 4),
    cues: [
      "Sit with your foot flat on the floor.",
      "Lift only your big toe while keeping the other four pressed down, then switch.",
      "Move slowly and keep your heel and ball of foot on the floor."
    ],
    stopIf: "Stop if you feel cramping that does not ease, or pain in the foot."
  },
  {
    id: "towel-scrunch",
    name: "Towel scrunch",
    target: "Foot muscles under the arch",
    dosage: reps(10, 2, true, 4),
    cues: [
      "Sit with your foot flat on a small towel on a smooth floor.",
      "Curl your toes to scrunch the towel toward you.",
      "Relax, smooth the towel out and repeat."
    ],
    stopIf: "Stop if you feel foot cramping that does not ease, or sharp pain.",
    equipment: "Small towel"
  },
  {
    id: "heel-raise",
    name: "Heel raise",
    target: "Calves and the muscles that lift the arch",
    dosage: reps(12, 2, false, 4),
    cues: [
      "Stand holding a wall with feet hip-width apart.",
      "Rise onto the balls of your feet, keeping your weight over your big toes rather than rolling outward.",
      "Lower slowly through the full movement."
    ],
    stopIf: "Stop if you feel pain in the Achilles tendon, heel or arch."
  }
];

export const REHAB_EXERCISES: Record<string, RehabExercise> = Object.fromEntries(EXERCISE_LIST.map((e) => [e.id, e]));

export const REHAB_CONDITIONS: RehabCondition[] = [
  {
    id: LOWER_BACK_PAIN_ID,
    name: "Lower back pain",
    forWho: "Aching or stiff lower back, often after sitting or lifting, linked to weak glutes and tight hamstrings.",
    causes: ["Weak glutes and deep core", "Tight hamstrings and hips", "Long periods of sitting", "Sudden changes in training load"],
    routine: [
      "cat-cow",
      "childs-pose",
      "supine-hamstring-stretch",
      "glute-bridge",
      "clamshell",
      "bird-dog",
      "dead-bug",
      "side-plank"
    ]
  },
  {
    id: "upper-back-neck-pain",
    name: "Upper back and neck pain",
    forWho: "Tension between the shoulder blades or in the neck, usually with weak lower and mid traps.",
    causes: ["Weak lower and mid trapezius", "Long hours at a desk or phone", "Tight upper traps and chest", "Stiff mid back"],
    routine: [
      "chin-tuck",
      "upper-trap-stretch",
      "thoracic-extension-roller",
      "scapular-retraction",
      "prone-y-raise",
      "band-pull-apart",
      "wall-angel"
    ]
  },
  {
    id: "rounded-upper-back",
    name: "Rounded upper back",
    forWho: "A stooped, rounded upper back (kyphosis posture) where the mid back feels stiff and the chest tight.",
    causes: ["Stiff thoracic spine", "Tight chest muscles", "Weak upper back muscles", "Habitual slouching"],
    routine: [
      "cat-cow",
      "thoracic-extension-roller",
      "open-book",
      "doorway-pec-stretch",
      "scapular-retraction",
      "prone-y-raise",
      "wall-angel"
    ]
  },
  {
    id: "tech-neck",
    name: "Tech neck",
    forWho: "Neck and upper back strain from looking down at phones and laptops, with the head sitting forward.",
    causes: ["Head carried forward of the shoulders", "Weak deep neck flexors", "Tight upper traps and levator scapulae", "Rounded shoulders"],
    routine: [
      "chin-tuck",
      "upper-trap-stretch",
      "levator-stretch",
      "doorway-pec-stretch",
      "scapular-retraction",
      "thoracic-extension-roller",
      "wall-angel"
    ]
  },
  {
    id: "anterior-pelvic-tilt",
    name: "Anterior pelvic tilt",
    forWho: "A pelvis that tips forward, creating a hollow lower back and a belly that pushes out.",
    causes: ["Tight hip flexors", "Weak glutes and abs", "Prolonged sitting", "Tight lower back muscles"],
    routine: ["hip-flexor-stretch", "childs-pose", "pelvic-tilt", "glute-bridge", "dead-bug", "front-plank"]
  },
  {
    id: "posterior-pelvic-tilt",
    name: "Posterior pelvic tilt",
    forWho: "A pelvis that tucks under, flattening the lower back, often with tight hamstrings and a stiff, sunk sitting posture.",
    causes: ["Tight hamstrings", "Weak hip flexors and spinal extensors", "Slumped sitting posture", "Over-tucking the pelvis in training"],
    routine: ["cat-cow", "supine-hamstring-stretch", "seated-anterior-tilt", "hip-hinge", "standing-march", "bird-dog"]
  },
  {
    id: "tight-hip-flexors",
    name: "Tight hip flexors",
    forWho: "A tight front of the hips after long hours of sitting, sometimes with a stiff lower back.",
    causes: ["Long periods of sitting", "Weak glutes", "Limited hip extension", "Lots of running or cycling"],
    routine: ["hip-flexor-stretch", "hip-90-90", "figure-four-stretch", "glute-bridge", "dead-bug", "standing-march"]
  },
  {
    id: "rounded-shoulders",
    name: "Rounded shoulders and impingement",
    forWho: "Shoulders that sit forward, sometimes with a pinching feeling when lifting your arm overhead.",
    causes: ["Tight chest and front shoulder", "Weak mid and lower traps and rotator cuff", "Desk and phone posture", "Pressing-heavy training"],
    routine: [
      "doorway-pec-stretch",
      "scapular-retraction",
      "band-external-rotation",
      "band-pull-apart",
      "prone-y-raise",
      "wall-angel"
    ]
  },
  {
    id: "knee-pain",
    name: "Knee pain (patellofemoral)",
    forWho: "A dull ache around or behind the kneecap, worse on stairs, squatting or after sitting.",
    causes: ["Weak glutes and quads", "Tight quads and calves", "Sudden jumps in activity", "Poor hip control"],
    routine: [
      "quad-stretch",
      "calf-stretch",
      "supine-hamstring-stretch",
      "straight-leg-raise",
      "clamshell",
      "glute-bridge",
      "mini-wall-sit"
    ]
  },
  {
    id: "knock-knees",
    name: "Knocked knees",
    forWho: "Knees that drift inward when you stand, squat or walk, sometimes with knee or hip aches. Common and often improves with hip and foot strength.",
    causes: ["Weak outer hip and glutes", "Tight inner thighs and calves", "Flat or rolling-in feet", "Poor knee control in squats and landings"],
    routine: [
      "calf-stretch",
      "clamshell",
      "side-leg-raise",
      "glute-bridge",
      "band-side-step",
      "sit-to-stand-knees-out",
      "single-leg-balance"
    ]
  },
  {
    id: "flat-feet",
    name: "Flat feet",
    forWho: "Low or collapsing arches, sometimes with tired feet, shin or knee aches. This builds foot and calf strength; it will not change bone structure.",
    causes: ["Weak small muscles in the foot", "Tight calves", "Weak hips that let the knees roll in", "Long hours on hard surfaces"],
    routine: ["foot-roll", "calf-stretch", "short-foot", "toe-yoga", "towel-scrunch", "heel-raise", "single-leg-balance"]
  }
];
