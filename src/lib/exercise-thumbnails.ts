/**
 * Exercise name -> wger.de picture (CC-BY-SA). Matching is deliberately strict: a picture is
 * returned only when every keyword is a whole word of the name AND the name has no other
 * meaningful word (so "Romanian Deadlift" never shows a plain deadlift, "Reverse Pec Deck"
 * never shows the pec deck). No match returns "" so the UI shows a neutral placeholder
 * instead of a different exercise. Every URL below was checked to return HTTP 200.
 */
const WGER = "https://wger.de/media/exercise-images";

const keywordThumbnails: Array<{ keywords: string[]; url: string }> = [
  { keywords: ["incline", "dumbbell", "press"], url: `${WGER}/16/Incline-press-1.png` },
  { keywords: ["incline", "barbell", "press"], url: `${WGER}/41/Incline-bench-press-1.png` },
  { keywords: ["decline", "bench", "press"], url: `${WGER}/100/Decline-bench-press-1.png` },
  { keywords: ["decline", "chest", "press"], url: `${WGER}/1831/2d9d509f-707b-4132-961e-91a2459ca198.jpg` },
  { keywords: ["bench", "press"], url: `${WGER}/192/Bench-press-1.png` },
  { keywords: ["flat", "chest", "press"], url: `${WGER}/192/Bench-press-1.png` },
  { keywords: ["dumbbell", "bench"], url: `${WGER}/97/Dumbbell-bench-press-1.png` },
  { keywords: ["pec", "deck", "fly"], url: `${WGER}/98/Butterfly-machine-1.png` },
  { keywords: ["pec", "deck"], url: `${WGER}/98/Butterfly-machine-1.png` },
  { keywords: ["butterfly"], url: `${WGER}/98/Butterfly-machine-1.png` },
  { keywords: ["chest", "fly"], url: `${WGER}/1922/eb750ee5-3220-4128-aef1-5e2f1ccff40a.webp` },
  { keywords: ["cable", "crossover"], url: `${WGER}/122/Incline-cable-flyes-1.png` },
  { keywords: ["cable", "fly"], url: `${WGER}/122/Incline-cable-flyes-1.png` },
  { keywords: ["dumbbell", "fly"], url: `${WGER}/238/2fc242d3-5bdd-4f97-99bd-678adb8c96fc.png` },
  { keywords: ["push", "up"], url: `${WGER}/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png` },
  { keywords: ["pullover"], url: `${WGER}/1634/9a4704d3-1b25-43e3-b244-3885f4d3db87.png` },

  { keywords: ["lat", "pulldown"], url: `${WGER}/158/02e8a7c3-dc67-434e-a4bc-77fdecf84b49.webp` },
  { keywords: ["pulldown"], url: `${WGER}/158/02e8a7c3-dc67-434e-a4bc-77fdecf84b49.webp` },
  { keywords: ["pull", "up"], url: `${WGER}/475/b0554016-16fd-4dbe-be47-a2a17d16ae0e.jpg` },
  { keywords: ["t", "bar", "row"], url: `${WGER}/106/T-bar-row-1.png` },
  { keywords: ["seated", "cable", "row"], url: `${WGER}/1117/e74255c0-67a0-4309-b78d-2d79e6ff8c11.png` },
  { keywords: ["cable", "row"], url: `${WGER}/1117/e74255c0-67a0-4309-b78d-2d79e6ff8c11.png` },
  { keywords: ["single", "arm", "row"], url: `${WGER}/1637/a1fbe83a-a3e5-49f6-a2c2-5d5b533c2be8.png` },
  { keywords: ["dumbbell", "row"], url: `${WGER}/81/a751a438-ae2d-4751-8d61-cef0e9292174.png` },
  { keywords: ["deadlift"], url: `${WGER}/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg` },
  { keywords: ["hyperextension"], url: `${WGER}/128/Hyperextensions-1.png` },

  { keywords: ["shoulder", "press", "dumbbell"], url: `${WGER}/123/dumbbell-shoulder-press-large-1.png` },
  { keywords: ["dumbbell", "shoulder", "press"], url: `${WGER}/123/dumbbell-shoulder-press-large-1.png` },
  { keywords: ["barbell", "shoulder", "press"], url: `${WGER}/119/seated-barbell-shoulder-press-large-1.png` },
  { keywords: ["overhead", "press"], url: `${WGER}/1893/7dbad19e-0616-41fd-9d7d-3e21649c0eea.png` },
  { keywords: ["lateral", "raise"], url: `${WGER}/148/lateral-dumbbell-raises-large-1.png` },
  { keywords: ["cable", "lateral", "raise"], url: `${WGER}/1378/7c1fcf34-fb7e-45e7-a0c1-51f296235315.jpg` },
  { keywords: ["dumbbell", "rear", "delt"], url: `${WGER}/1227/57415c3c-2963-4130-9f6f-79f6a96113b6.gif` },
  { keywords: ["face", "pull"], url: `${WGER}/1732/d13b9adb-968e-4f73-95e6-b16690bcf616.jpg` },
  { keywords: ["upright", "row"], url: `${WGER}/694/119e6823-6960-4341-a9e1-aaf78d7fb57c.png` },
  { keywords: ["barbell", "shrug"], url: `${WGER}/150/Barbell-shrugs-1.png` },
  { keywords: ["dumbbell", "shrug"], url: `${WGER}/151/Dumbbell-shrugs-1.png` },

  { keywords: ["barbell", "curl"], url: `${WGER}/74/Bicep-curls-1.png` },
  { keywords: ["dumbbell", "curl"], url: `${WGER}/1225/39a0b7e7-9780-425d-84f5-56d10d1690ac.gif` },
  { keywords: ["hammer", "curl"], url: `${WGER}/86/Bicep-hammer-curl-1.png` },
  { keywords: ["preacher", "curl"], url: `${WGER}/193/Preacher-curl-3-1.png` },
  { keywords: ["concentration", "curl"], url: `${WGER}/1109/00b0a0bf-c14a-4f13-bb14-62c09030a1aa.png` },
  { keywords: ["cable", "curl"], url: `${WGER}/129/Standing-biceps-curl-1.png` },
  { keywords: ["wrist", "curl"], url: `${WGER}/51/f1730f56-7aca-4566-8338-3e42b1bee6e1.webp` },

  { keywords: ["triceps", "pushdown"], url: `${WGER}/805/7a437824-e2cc-46e1-804a-674f0ea31d25.png` },
  { keywords: ["triceps", "push", "down"], url: `${WGER}/805/7a437824-e2cc-46e1-804a-674f0ea31d25.png` },
  { keywords: ["rope", "pushdown"], url: `${WGER}/1900/a8243245-8f8f-4e2b-93ca-694d416cb11d.png` },
  { keywords: ["skull", "crusher"], url: `${WGER}/84/Lying-close-grip-triceps-press-to-chin-1.png` },
  { keywords: ["overhead", "triceps", "extension"], url: `${WGER}/1519/fab7f641-27d4-40b5-8edd-1a0a137bfd94.gif` },
  { keywords: ["triceps", "extension"], url: `${WGER}/659/a60452f1-e2ea-43fe-baa6-c1a2208d060c.png` },
  { keywords: ["bench", "dips"], url: `${WGER}/83/Bench-dips-1.png` },
  { keywords: ["dips"], url: `${WGER}/194/34600351-8b0b-4cb0-8daa-583537be15b0.png` },

  { keywords: ["leg", "press"], url: `${WGER}/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp` },
  { keywords: ["hack", "squat"], url: `${WGER}/130/Narrow-stance-hack-squats-1-1024x721.png` },
  { keywords: ["bulgarian", "split", "squat"], url: `${WGER}/1706/0c5243cc-2539-4005-aee0-d3a8c5d3a32c.jfif` },
  { keywords: ["split", "squat"], url: `${WGER}/1593/9815fcd6-cf40-4ddd-9b38-2eac25973de1.gif` },
  { keywords: ["front", "squat"], url: `${WGER}/191/Front-squat-1-857x1024.png` },
  { keywords: ["barbell", "squat"], url: `${WGER}/1801/60043328-1cfb-4289-9865-aaf64d5aaa28.jpg` },
  { keywords: ["goblet", "squat"], url: `${WGER}/203/300a44ac-4368-48e2-8b18-beea32ab915d.gif` },
  { keywords: ["sumo", "squat"], url: `${WGER}/977/3124c091-6395-4377-96c5-56048b627ceb.png` },
  { keywords: ["leg", "extension"], url: `${WGER}/369/78c915d1-e46d-4d30-8124-65d68664c3ef.png` },
  { keywords: ["lying", "hamstring", "curl"], url: `${WGER}/154/lying-leg-curl-machine-large-1.png` },
  { keywords: ["lying", "leg", "curl"], url: `${WGER}/154/lying-leg-curl-machine-large-1.png` },
  { keywords: ["seated", "leg", "curl"], url: `${WGER}/117/seated-leg-curl-large-1.png` },
  { keywords: ["leg", "curl"], url: `${WGER}/364/b318dde9-f5f2-489f-940a-cd864affb9e3.png` },
  { keywords: ["walking", "lunge"], url: `${WGER}/113/Walking-lunges-1.png` },
  { keywords: ["hip", "thrust"], url: `${WGER}/1642/a81ad922-caf5-47f8-99b4-640cb0717436.webp` },
  { keywords: ["calf", "press"], url: `${WGER}/146/8b284904-d072-4381-a256-4c81d8fd9c1f.png` },
  { keywords: ["calf", "raise"], url: `${WGER}/622/9a429bd0-afd3-4ad0-8043-e9beec901c81.jpeg` },

  { keywords: ["leg", "raise"], url: `${WGER}/125/Leg-raises-1.png` },
  { keywords: ["hanging", "leg"], url: `${WGER}/979/27097a3a-5749-428d-b94c-6082afe390f6.png` },
  { keywords: ["russian", "twist"], url: `${WGER}/1377/12e7a231-d36a-4992-bf57-ff7bfe0f3ae4.jpg` },
  { keywords: ["crunch"], url: `${WGER}/91/Crunches-1.png` },
  { keywords: ["plank"], url: `${WGER}/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png` },
  { keywords: ["ab", "wheel"], url: `${WGER}/1573/a9ab402b-61ef-4d60-b91a-df52bf7f41a9.jpg` },
  { keywords: ["mountain", "climber"], url: `${WGER}/1091/50c8912d-54ef-46c9-99d1-633b6196aa1e.jpg` },
];

/** Words that do not change which exercise it is. */
const NEUTRAL = new Set(["barbell", "dumbbell", "bar", "ez", "bicep", "tricep", "straight", "standing", "the", "a", "with", "of", "and"]);

/** Lowercase whole words with a trailing plural "s" stripped ("Raises" -> "raise"). */
function exerciseWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length > 2 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

/** The picture for exactly this exercise, or undefined when there is no genuine match. */
export function findExerciseThumbnail(name: string): string | undefined {
  const words = exerciseWords(name);
  const match = keywordThumbnails.find((entry) => {
    const keys = exerciseWords(entry.keywords.join(" "));
    if (!keys.every((k) => words.includes(k))) return false;
    return words.every((w) => keys.includes(w) || NEUTRAL.has(w));
  });
  return match?.url;
}

/** Like findExerciseThumbnail, but "" (no picture) for callers that store a string. */
export function getExerciseThumbnail(name: string): string {
  return findExerciseThumbnail(name) ?? "";
}

/** Every URL this module can return, for tests. */
export const EXERCISE_THUMBNAIL_URLS: string[] = [...new Set(keywordThumbnails.map((e) => e.url))];
