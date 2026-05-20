/**
 * fix-exercise-catalog.mjs
 *
 * Reads every exerciseCatalog document for gymId "shg" from Firestore and:
 *   1. Expands abbreviations (DB → Dumbbell, BB → Barbell, etc.)
 *   2. Resolves all known name variants / typos to a single canonical name.
 *   3. Assigns the correct muscle-group category based on exercise knowledge.
 *   4. Deduplicates — keeps the doc with the most data, deletes the rest.
 *   5. Injects gymVideoUrl from the SHG YouTube channel where a video exists.
 *
 * Run:  node scripts/fix-exercise-catalog.mjs
 */

import { readFileSync } from "node:fs";
import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── .env.local ────────────────────────────────────────────────────────────────
try {
  const env = readFileSync(pathResolve(__dirname, "../.env.local"), "utf-8");
  for (const line of env.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] ??= v;
  }
} catch { /* real env vars */ }

const projectId = process.env.FIREBASE_PROJECT_ID || "fitsplit-29215";
const gymId = "shg";

// ── Firebase ──────────────────────────────────────────────────────────────────
let credential;
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credsPath) {
  const sa = JSON.parse(readFileSync(credsPath, "utf-8"));
  credential = cert({ projectId: sa.project_id || projectId, clientEmail: sa.client_email, privateKey: sa.private_key });
} else {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    console.error("Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.");
    process.exit(1);
  }
  credential = cert({ projectId, clientEmail, privateKey });
}
initializeApp({ credential });
const db = getFirestore();

// ─────────────────────────────────────────────────────────────────────────────
// 1. CANONICAL EXERCISE TABLE
//
// Each entry: { name, category, videoId? }
//   name     — the single official display name
//   category — one of the 8 valid muscle groups
//   videoId  — YouTube Shorts ID from the SHG gym channel (null = no video)
//
// ALIASES lists every raw string (lower-cased) that maps to this exercise.
// ─────────────────────────────────────────────────────────────────────────────

const EXERCISES = [
  // ── CHEST ──────────────────────────────────────────────────────────────────
  {
    name: "Barbell Bench Press", category: "Chest", videoId: "vzcLmuYaCJ4",
    aliases: ["barbell bench press","flat barbell bench press","bench press","bench press (barbell)",
      "flat bench press","bb bench press","barbell flat bench","flat bench","bb bench","bench press barbell",
      "barbell chest press","chest press barbell","chest - barbell bench press"],
  },
  {
    name: "Incline Barbell Press", category: "Chest", videoId: null,
    aliases: ["incline barbell press","incline barbell bench press","incline bb press",
      "incline bench press (barbell)","incline bb bench","incline barbell chest press"],
  },
  {
    name: "Incline Dumbbell Press", category: "Chest", videoId: "leZzdhGKPkE",
    aliases: ["incline dumbbell press","incline dumbell press","incline db press",
      "incline dumbbell bench","incline dumbbell chest press","incline db chest press",
      "dumbbell incline press","db incline press","incline press (dumbbell)","incline press db"],
  },
  {
    name: "Decline Barbell Press", category: "Chest", videoId: "I99DHQpDj8Q",
    aliases: ["decline barbell press","decline bench press","decline press","decline bb press",
      "decline barbell bench press","decline chest press","decline press (barbell)"],
  },
  {
    name: "Decline Dumbbell Press", category: "Chest", videoId: null,
    aliases: ["decline dumbbell press","decline dumbell press","decline db press",
      "decline dumbbell chest press","decline press (dumbbell)","decline press db"],
  },
  {
    name: "Dumbbell Fly", category: "Chest", videoId: null,
    aliases: ["dumbbell fly","db fly","dumbbell flys","dumbbell flyes","dumbbell flies",
      "flat dumbbell fly","dumbell fly","db flies","flat db fly","flat db flyes","flat dumbbell flyes"],
  },
  {
    name: "Incline Dumbbell Fly", category: "Chest", videoId: null,
    aliases: ["incline dumbbell fly","incline db fly","incline dumbbell flys","incline db flyes",
      "incline dumbbell flyes","incline dumbell fly","incline flies","incline dumbbell flies"],
  },
  {
    name: "Pec Deck Fly", category: "Chest", videoId: "VpLWl99Xkw4",
    aliases: ["pec deck fly","pec deck","pec-deck fly","pec-deck","pec deck flys","butterfly machine",
      "chest fly machine","chest fly (machine)","machine fly","butterfly fly","pec fly",
      "butterfly machine fly","machine chest fly","chest flys","chest flyes"],
  },
  {
    name: "Cable Crossover", category: "Chest", videoId: "jp1niNDa4RQ",
    aliases: ["cable crossover","cable cross over","high cable crossover","low cable crossover",
      "cable fly","cable flys","cable flyes","cable flies","cable chest fly","cable chest flys",
      "cable crossovers","high cable fly","low cable fly","cable cross-over"],
  },
  {
    name: "Machine Chest Press", category: "Chest", videoId: "Cw1XmuS_12g",
    aliases: ["machine chest press","chest press (machine)","plate loaded chest press",
      "chest press machine","machine press","hammer strength chest press","seated chest press",
      "chest press - machine","machine bench press"],
  },
  {
    name: "Dumbbell Pullover", category: "Chest", videoId: "lpqtOhGn5VI",
    aliases: ["dumbbell pullover","db pullover","dumbell pullover","dumbbell pull over",
      "dumbbell pullovers","flat dumbbell pullover"],
  },
  {
    name: "Push-Ups", category: "Chest", videoId: "PvVAVM81eKc",
    aliases: ["push-ups","pushups","push ups","push-up","pushup","wide push-ups","wide pushups",
      "standard push-ups","bodyweight push-ups"],
  },
  {
    name: "One-Arm Pushup", category: "Chest", videoId: null,
    aliases: ["one-arm pushup","one arm pushup","single arm pushup","one arm push-up","one-arm push-up"],
  },
  {
    name: "Chest Dips", category: "Chest", videoId: null,
    aliases: ["chest dips","chest dip","dips (chest)","wide dips","lean forward dips"],
  },
  {
    name: "Smith Machine Bench Press", category: "Chest", videoId: null,
    aliases: ["smith machine bench press","smith machine flat press","smith machine chest press",
      "smith bench press","smith flat bench"],
  },
  {
    name: "Incline Smith Machine Press", category: "Chest", videoId: null,
    aliases: ["incline smith machine press","smith machine incline press","incline smith press",
      "smith incline bench press"],
  },

  // ── BACK ───────────────────────────────────────────────────────────────────
  {
    name: "Pull-Ups", category: "Back", videoId: "lofkU30wYjM",
    aliases: ["pull-ups","pullups","pull ups","pull-up","pullup","wide grip pull-ups",
      "wide grip pullups","overhand pull-ups","pronated pull-ups","pull up","chin-ups wide grip"],
  },
  {
    name: "Chin-Ups", category: "Back", videoId: "lofkU30wYjM",
    aliases: ["chin-ups","chinups","chin ups","chin-up","chinup","underhand pull-ups",
      "supinated pull-ups","close grip chin-ups","neutral grip chin-ups"],
  },
  {
    name: "Lat Pulldown", category: "Back", videoId: "ZVCr4crm2w0",
    aliases: ["lat pulldown","lat pull-down","lat pull down","wide grip lat pulldown",
      "lat pull-down (wide grip)","lat pulldown (wide grip)","front lat pulldown",
      "lat pull down front","lat pulldown front","wide lat pulldown","cable lat pulldown",
      "lat pull","latpulldown","lats pulldown"],
  },
  {
    name: "Close Grip Lat Pulldown", category: "Back", videoId: null,
    aliases: ["close grip lat pulldown","close grip pulldown","narrow grip lat pulldown",
      "v-bar lat pulldown","close grip pull down","reverse grip lat pulldown",
      "underhand lat pulldown","supinated lat pulldown","reverse grip pulldown"],
  },
  {
    name: "Barbell Row", category: "Back", videoId: "75-PAqMAGsA",
    aliases: ["barbell row","bent over barbell row","bent-over barbell row","bent over row",
      "bent-over row","barbell bent over row","bb row","barbell rows","overhand barbell row",
      "pronated barbell row","bent over row (barbell)","barbell rowing","bb rowing",
      "back - barbell row"],
  },
  {
    name: "Single Arm Dumbbell Row", category: "Back", videoId: "6ngDqCas0ek",
    aliases: ["single arm dumbbell row","one arm dumbbell row","single arm db row",
      "one arm db row","dumbbell row","db row","dumbell row","one-arm dumbbell row",
      "single-arm dumbbell row","dumbbell rows","one arm row","single arm row",
      "one arm bent over row"],
  },
  {
    name: "Seated Cable Row", category: "Back", videoId: "GBi39WvymnE",
    aliases: ["seated cable row","cable row","seated row","cable rows","seated cable rows",
      "low cable row","seated cable rowing","close grip cable row","v-bar seated row",
      "rowing cable","cable seated row"],
  },
  {
    name: "T-Bar Row", category: "Back", videoId: "x4ewNvTCaPg",
    aliases: ["t-bar row","t bar row","tbar row","t-bar rows","incline t-bar row",
      "landmine t-bar row","t bar rowing","t-bar rowing","t bar bent over row"],
  },
  {
    name: "Chest Supported Row", category: "Back", videoId: "7pQTJUpyoJE",
    aliases: ["chest supported row","incline chest supported row","prone row","incline row",
      "chest-supported row","chest supported dumbbell row","incline dumbbell row",
      "incline db row","prone dumbbell row","plate loaded chest supported row",
      "machine chest supported row"],
  },
  {
    name: "Straight Arm Pulldown", category: "Back", videoId: "JsgwZYDjrbU",
    aliases: ["straight arm pulldown","straight-arm pulldown","straight arm cable pulldown",
      "lat pushdown","cable lat pushdown","standing lat pushdown","straight arm lat pulldown",
      "straight arms lat pulldown","straight arm push down"],
  },
  {
    name: "Deadlift", category: "Back", videoId: null,
    aliases: ["deadlift","conventional deadlift","barbell deadlift","bb deadlift",
      "conventional barbell deadlift","standard deadlift","dead lift"],
  },
  {
    name: "Sumo Deadlift", category: "Back", videoId: null,
    aliases: ["sumo deadlift","sumo deadlifts","sumo dl","sumo style deadlift","wide stance deadlift"],
  },
  {
    name: "Rack Pull", category: "Back", videoId: null,
    aliases: ["rack pull","rack pulls","partial deadlift","rack deadlift","pin pull"],
  },
  {
    name: "Landmine Row", category: "Back", videoId: null,
    aliases: ["landmine row","landmine rows","meadows row","landmine rowing"],
  },
  {
    name: "Cable Pullover", category: "Back", videoId: null,
    aliases: ["cable pullover","cable pull over","straight arm cable pullover",
      "lat cable pullover","cable lat pullover","overhead cable pullover"],
  },

  // ── LEGS ───────────────────────────────────────────────────────────────────
  {
    name: "Barbell Squat", category: "Legs", videoId: "Zfo3lY-1qAA",
    aliases: ["barbell squat","squat","back squat","barbell back squat","bb squat",
      "barbell squats","squats","back squats","high bar squat","low bar squat",
      "legs - barbell squat"],
  },
  {
    name: "Front Squat", category: "Legs", videoId: "HYRoHNjufrM",
    aliases: ["front squat","barbell front squat","front squats","bb front squat",
      "front barbell squat","front squat barbell"],
  },
  {
    name: "Goblet Squat", category: "Legs", videoId: "_gCz4WsKq6w",
    aliases: ["goblet squat","dumbbell goblet squat","goblet squats","db goblet squat",
      "kettlebell goblet squat","dumbell goblet squat"],
  },
  {
    name: "Hack Squat", category: "Legs", videoId: "vbiSRCRucZU",
    aliases: ["hack squat","hack squat (machine)","hack squats","machine hack squat",
      "hack squat machine","plate loaded hack squat","leg press hack squat"],
  },
  {
    name: "Bulgarian Split Squats", category: "Legs", videoId: null,
    aliases: ["bulgarian split squats","bulgarian split squat","split squat","split squats",
      "rear foot elevated split squat","rfess","dumbbell split squat","db split squat",
      "barbell split squat","bb split squat"],
  },
  {
    name: "Leg Press", category: "Legs", videoId: "OrGEtlV7naA",
    aliases: ["leg press","leg press (machine)","leg press machine","45 degree leg press",
      "bilateral leg press","plate loaded leg press","machine leg press","legs press"],
  },
  {
    name: "Romanian Deadlift", category: "Legs", videoId: "BdK5HX7yr7s",
    aliases: ["romanian deadlift","rdl","dumbbell romanian deadlift","db rdl","db romanian deadlift",
      "dumbell romanian deadlift","barbell rdl","barbell romanian deadlift","bb rdl",
      "romanian dl","romanian dead lift","r.d.l","stiff leg deadlift","stiff-leg deadlift",
      "stiff legged deadlift","stiff-legged deadlift","sldl"],
  },
  {
    name: "Lying Hamstring Curls", category: "Legs", videoId: "1aTtclbaqNw",
    aliases: ["lying hamstring curls","lying leg curl","lying leg curls","hamstring curl",
      "hamstring curls","leg curl","leg curls","prone leg curl","prone hamstring curl",
      "machine hamstring curl","lying hamstring curl","hammy curl","ham curl"],
  },
  {
    name: "Seated Leg Curl", category: "Legs", videoId: null,
    aliases: ["seated leg curl","seated hamstring curl","seated leg curls","seated ham curl",
      "seated curl (machine)","machine seated leg curl","seated hamstring curls"],
  },
  {
    name: "Leg Extension", category: "Legs", videoId: "ZntBQBw45LI",
    aliases: ["leg extension","leg extension (machine)","leg extensions","machine leg extension",
      "quad extension","knee extension","leg extension machine","seated leg extension"],
  },
  {
    name: "Standing Calf Raises", category: "Legs", videoId: "Ap3mSmYqHPE",
    aliases: ["standing calf raises","standing calf raise","calf raises","calf raise","calf raises (standing)",
      "barbell calf raise","machine calf raise","standing calf","calf training",
      "smith machine calf raise","donkey calf raise","calves"],
  },
  {
    name: "Seated Calf Raises", category: "Legs", videoId: "FR-yAiIO89g",
    aliases: ["seated calf raises","seated calf raise","calf raise (seated)","machine seated calf raise",
      "seated calf press","seated calves","calf raise seated"],
  },
  {
    name: "Walking Lunges", category: "Legs", videoId: "oQWXG9IW2FA",
    aliases: ["walking lunges","lunges","dumbbell lunges","db lunges","barbell lunges",
      "bb lunges","lunge","walking lunge","forward lunge","alternating lunges","db lunge",
      "dumbbell lunge","reverse lunge","reverse lunges","stationary lunge","stationary lunges"],
  },
  {
    name: "Hip Thrust", category: "Legs", videoId: null,
    aliases: ["hip thrust","barbell hip thrust","hip thrusts","bb hip thrust","glute bridge barbell",
      "weighted hip thrust","smith machine hip thrust","hip bridge","hip thrusting"],
  },
  {
    name: "Glute Bridge", category: "Legs", videoId: null,
    aliases: ["glute bridge","glute bridges","bodyweight glute bridge","floor glute bridge",
      "glute bridge (bodyweight)"],
  },
  {
    name: "Step-Ups", category: "Legs", videoId: null,
    aliases: ["step-ups","step ups","box step-ups","dumbbell step-ups","db step ups",
      "barbell step-ups","weighted step ups","step up","box step ups"],
  },
  {
    name: "Leg Press Calf Raises", category: "Legs", videoId: null,
    aliases: ["leg press calf raises","calf press","calf press on leg press","calf raises on leg press",
      "leg press calf raise","calf raise on leg press machine"],
  },

  // ── SHOULDERS ──────────────────────────────────────────────────────────────
  {
    name: "Overhead Press", category: "Shoulders", videoId: "eCeNYf52lB0",
    aliases: ["overhead press","barbell overhead press","barbell ohp","ohp","military press",
      "standing barbell press","barbell shoulder press","standing ohp","barbell press",
      "bb overhead press","strict press","shoulder press (barbell)","barbell press overhead",
      "standing barbell shoulder press","shoulders - overhead press"],
  },
  {
    name: "Seated Dumbbell Press", category: "Shoulders", videoId: null,
    aliases: ["seated dumbbell press","dumbbell shoulder press","db shoulder press",
      "dumbbell ohp","seated db press","dumbbell press","db press","dumbell shoulder press",
      "seated db shoulder press","shoulder press (dumbbell)","overhead press (dumbbell)",
      "dumbbell overhead press","db overhead press"],
  },
  {
    name: "Arnold Press", category: "Shoulders", videoId: "Riu65hV-d44",
    aliases: ["arnold press","arnold dumbbell press","seated arnold press","arnold db press",
      "arnold press (dumbbell)","db arnold press","arnold's press"],
  },
  {
    name: "Smith Machine Shoulder Press", category: "Shoulders", videoId: "Xbv2zSSPoyo",
    aliases: ["smith machine shoulder press","smith machine overhead press","seated smith machine press",
      "smith machine press","smith ohp","smith shoulder press"],
  },
  {
    name: "Dumbbell Lateral Raise", category: "Shoulders", videoId: "pY-GDd_irmA",
    aliases: ["dumbbell lateral raise","lateral raise","db lateral raise","side lateral raise",
      "standing lateral raise","dumbbell side raise","side raise","lateral raise (dumbbell)",
      "lateral raises","db lateral raises","side raises","standing side raise",
      "standing dumbbell lateral raise","lateral delt raise"],
  },
  {
    name: "Cable Lateral Raise", category: "Shoulders", videoId: "V1CjJOCRbyQ",
    aliases: ["cable lateral raise","cable side raise","cable lateral raises",
      "cable side lateral raise","lateral raise (cable)","one arm cable lateral raise",
      "single arm cable lateral raise"],
  },
  {
    name: "Dumbbell Front Raise", category: "Shoulders", videoId: "ddL-ZdSLXCE",
    aliases: ["dumbbell front raise","front raise","db front raise","front delt raise",
      "alternating front raise","dumbbell front raises","standing front raise",
      "front raise (dumbbell)","front raise db"],
  },
  {
    name: "Barbell Upright Row", category: "Shoulders", videoId: "ABL1gdBP0fE",
    aliases: ["barbell upright row","upright row","upright rows","barbell upright rows",
      "bb upright row","upright barbell row","barbell upright rowing","upright row barbell"],
  },
  {
    name: "Barbell Shrugs", category: "Shoulders", videoId: "W3BJy2DrC3M",
    aliases: ["barbell shrugs","shrugs","barbell shrug","bb shrugs","trap shrugs",
      "barbell trap shrugs","shoulder shrugs","shrug","shrugs (barbell)"],
  },
  {
    name: "Dumbbell Shrugs", category: "Shoulders", videoId: null,
    aliases: ["dumbbell shrugs","dumbbell shrug","db shrugs","db shrug","shrugs (dumbbell)",
      "dumbell shrugs"],
  },
  {
    name: "Reverse Pec Deck", category: "Shoulders", videoId: "RcygDDdTXVE",
    aliases: ["reverse pec deck","reverse pec-deck","rear delt fly","rear delt flys",
      "rear delt flyes","rear delt machine","rear delt fly machine","rear delt fly (machine)",
      "reverse fly machine","rear fly","rear delt","butterfly reverse","reverse butterfly",
      "pec deck rear delt","rear pec deck","machine rear delt","rear delt flies",
      "rear deltoid fly","posterior delt fly"],
  },
  {
    name: "Face Pull", category: "Shoulders", videoId: "Zr0GzFNjtdU",
    aliases: ["face pull","face pulls","cable face pull","cable face pulls","rope face pull",
      "face pull (cable)","cable rope face pull","face pull cable"],
  },

  // ── BICEPS ─────────────────────────────────────────────────────────────────
  {
    name: "Barbell Curl", category: "Biceps", videoId: "Hsx_2cBAs-8",
    aliases: ["barbell curl","barbell bicep curl","barbell biceps curl","bb curl",
      "standing barbell curl","standing bb curl","straight bar curl","barbell curls",
      "bicep curl (barbell)","barbell arm curl","bb bicep curl","barbell bicep curls"],
  },
  {
    name: "Dumbbell Curl", category: "Biceps", videoId: null,
    aliases: ["dumbbell curl","dumbbell bicep curl","db curl","standing dumbbell curl",
      "alternating dumbbell curl","dumbbell curls","db curls","alternating db curl",
      "standing db curl","bicep curl (dumbbell)","dumbell curl","dumbbell bicep curls"],
  },
  {
    name: "Incline Dumbbell Curl", category: "Biceps", videoId: "tipdoo70BMc",
    aliases: ["incline dumbbell curl","incline db curl","seated incline dumbbell curl",
      "incline curl","incline bicep curl","incline dumbbell bicep curl",
      "seated incline curl","incline bench curl","incline dumbell curl"],
  },
  {
    name: "Hammer Curl", category: "Biceps", videoId: "jPYMihpFXww",
    aliases: ["hammer curl","hammer curls","dumbbell hammer curl","db hammer curl",
      "hammer bicep curl","neutral grip curl","hammer grip curl","hammer curl (dumbbell)",
      "standing hammer curl","alternating hammer curl"],
  },
  {
    name: "EZ Bar Preacher Curl", category: "Biceps", videoId: "-i1MQ9t3xaw",
    aliases: ["ez bar preacher curl","preacher curl","ez curl preacher","barbell preacher curl",
      "preacher curl (ez bar)","ez preacher curl","preacher curl ez bar","ez bar curl preacher",
      "preacher bar curl","preacher curls","ez preacher","barbell preacher curls"],
  },
  {
    name: "Machine Preacher Curl", category: "Biceps", videoId: "AfbWXcmq4hY",
    aliases: ["machine preacher curl","preacher curl (machine)","machine preacher curls",
      "preacher machine curl","seated preacher curl machine"],
  },
  {
    name: "Concentration Curl", category: "Biceps", videoId: "rBZu85eJkMk",
    aliases: ["concentration curl","concentration curls","dumbbell concentration curl",
      "db concentration curl","seated concentration curl","seated dumbbell curl",
      "concentration bicep curl"],
  },
  {
    name: "Cable Bicep Curl", category: "Biceps", videoId: "u6uJryWpjBo",
    aliases: ["cable bicep curl","cable curl","cable biceps curl","low cable curl",
      "cable bar curl","straight bar cable curl","cable curl (bar)","standing cable curl",
      "cable bicep curls","cable curls","cable arm curl"],
  },
  {
    name: "High Cable Curls", category: "Biceps", videoId: "rdNfF1aIkj4",
    aliases: ["high cable curls","high cable curl","overhead cable curl","spider curl cable",
      "high pulley curl","cable overhead curl","overhead cable bicep curl"],
  },
  {
    name: "Bayesian Curl", category: "Biceps", videoId: "eq0MqxxXV84",
    aliases: ["bayesian curl","bayesian curls","cable bayesian curl","bayesian cable curl",
      "standing cable incline curl","prone incline cable curl"],
  },
  {
    name: "Reverse Barbell Curl", category: "Biceps", videoId: "knPTS8FziY4",
    aliases: ["reverse barbell curl","reverse curl","reverse curls","overhand barbell curl",
      "pronated barbell curl","reverse bb curl","reverse bicep curl","barbell reverse curl"],
  },
  {
    name: "Spider Curl", category: "Biceps", videoId: null,
    aliases: ["spider curl","spider curls","incline bench spider curl","lying spider curl",
      "prone incline curl","prone curl"],
  },
  {
    name: "Zottman Curl", category: "Biceps", videoId: null,
    aliases: ["zottman curl","zottman curls","zottman dumbbell curl"],
  },
  {
    name: "Cross Body Hammer Curl", category: "Biceps", videoId: null,
    aliases: ["cross body hammer curl","cross-body hammer curl","across body curl",
      "cross hammer curl","crossbody curl"],
  },

  // ── TRICEPS ────────────────────────────────────────────────────────────────
  {
    name: "Tricep Pushdown (Straight Bar)", category: "Triceps", videoId: "pR70W4eLDMM",
    aliases: ["tricep pushdown (straight bar)","triceps pushdown","tricep pushdown",
      "straight bar pushdown","bar pushdown","cable pushdown","cable bar pushdown",
      "straight bar tricep pushdown","tricep bar pushdown","cable tricep pushdown",
      "tricep push down","push down","triceps bar push down","cable push down",
      "straight bar cable pushdown","tricep extension pushdown"],
  },
  {
    name: "Rope Pushdown", category: "Triceps", videoId: "xjzJHmoThuU",
    aliases: ["rope pushdown","tricep rope pushdown","rope tricep pushdown",
      "cable rope pushdown","rope pushdown (cable)","rope cable pushdown",
      "triceps rope pushdown","rope press down","cable rope tricep extension",
      "tricep rope push down","rope push down"],
  },
  {
    name: "V-Bar Pushdown", category: "Triceps", videoId: null,
    aliases: ["v-bar pushdown","v bar pushdown","v-bar tricep pushdown","cable v-bar pushdown",
      "v bar tricep pushdown","v grip pushdown"],
  },
  {
    name: "Overhead Tricep Extension", category: "Triceps", videoId: "Z_52vmRB8H0",
    aliases: ["overhead tricep extension","overhead triceps extension",
      "dumbbell overhead tricep extension","seated overhead tricep extension",
      "seated dumbbell overhead extension","overhead extension","two hand overhead extension",
      "single arm overhead tricep extension","db overhead tricep extension",
      "dumbbell overhead extension","overhead dumbbell extension","overhead extension (dumbbell)"],
  },
  {
    name: "Cable Overhead Triceps Extension", category: "Triceps", videoId: "N0hjEM2v8V0",
    aliases: ["cable overhead triceps extension","cable overhead tricep extension",
      "overhead cable tricep extension","cable tricep overhead extension",
      "overhead rope tricep extension","rope overhead extension","cable overhead extension"],
  },
  {
    name: "Skull Crushers", category: "Triceps", videoId: "BavILqYu-ds",
    aliases: ["skull crushers","skull crusher","barbell skull crusher","ez bar skull crusher",
      "lying tricep extension","lying barbell extension","skull crushers (barbell)",
      "skull crushers (ez bar)","french press","barbell french press","skullcrusher","skull crush"],
  },
  {
    name: "Close Grip Bench Press", category: "Triceps", videoId: null,
    aliases: ["close grip bench press","close-grip bench press","cgbp","close grip barbell press",
      "close grip press","narrow grip bench press","narrow grip press"],
  },
  {
    name: "Tricep Dips", category: "Triceps", videoId: "pUibsG6kejs",
    aliases: ["tricep dips","triceps dips","bench dips","dips (triceps)","dips","bodyweight dips",
      "parallel bar dips","tricep dip","chest dip (narrow)","weighted dips"],
  },
  {
    name: "Dumbbell Kickbacks", category: "Triceps", videoId: "FcX7frCpmmc",
    aliases: ["dumbbell kickbacks","tricep kickbacks","triceps kickback","triceps kickbacks",
      "db kickback","db kickbacks","dumbbell tricep kickback","dumbbell tricep kickbacks",
      "bent over kickback","tricep kickback","kickbacks (dumbbell)","kickback"],
  },
  {
    name: "JM Press", category: "Triceps", videoId: null,
    aliases: ["jm press","j.m. press","jm press (barbell)","barbell jm press"],
  },

  // ── CORE ───────────────────────────────────────────────────────────────────
  {
    name: "Cable Crunch", category: "Core", videoId: "_lTk22o7LBk",
    aliases: ["cable crunch","cable crunches","kneeling cable crunch","kneeling crunch",
      "cable ab crunch","rope cable crunch","rope crunch","cable crunches (kneeling)"],
  },
  {
    name: "Crunches", category: "Core", videoId: null,
    aliases: ["crunches","crunch","ab crunch","ab crunches","floor crunch","standard crunch",
      "basic crunch","bodyweight crunch"],
  },
  {
    name: "Sit-Ups", category: "Core", videoId: null,
    aliases: ["sit-ups","sit ups","situp","situps","full sit-up","abdominal sit-ups"],
  },
  {
    name: "Plank", category: "Core", videoId: null,
    aliases: ["plank","planks","forearm plank","standard plank","front plank",
      "prone plank","elbow plank","plank hold"],
  },
  {
    name: "Side Plank", category: "Core", videoId: null,
    aliases: ["side plank","side planks","lateral plank","oblique plank","side plank hold"],
  },
  {
    name: "Ab Wheel Rollout", category: "Core", videoId: null,
    aliases: ["ab wheel rollout","ab wheel","ab wheel rollouts","ab roller","ab roller rollout",
      "rollout","wheel rollout"],
  },
  {
    name: "Leg Raises", category: "Core", videoId: null,
    aliases: ["leg raises","leg raise","lying leg raise","lying leg raises","flat leg raise",
      "floor leg raise","flat bench leg raise"],
  },
  {
    name: "Hanging Leg Raises", category: "Core", videoId: null,
    aliases: ["hanging leg raises","hanging leg raise","hanging knee raise","hanging knee raises",
      "bar leg raise","hanging ab raise","toes to bar"],
  },
  {
    name: "Russian Twists", category: "Core", videoId: null,
    aliases: ["russian twist","russian twists","seated russian twist","weighted russian twist",
      "oblique twist","russian rotation"],
  },
  {
    name: "Bicycle Crunches", category: "Core", videoId: null,
    aliases: ["bicycle crunches","bicycle crunch","bike crunch","bike crunches",
      "alternating crunch","elbow to knee crunch"],
  },
  {
    name: "Hyperextensions", category: "Core", videoId: null,
    aliases: ["hyperextensions","hyperextension","back extension","back extensions",
      "back raise","45 degree back extension","roman chair extension","reverse hyperextension",
      "reverse hyper","45 back extension","lower back extension"],
  },
  {
    name: "Dead Bug", category: "Core", videoId: null,
    aliases: ["dead bug","dead bugs","deadbug","dead bug exercise"],
  },

  // ── CARDIO ─────────────────────────────────────────────────────────────────
  {
    name: "Treadmill", category: "Cardio", videoId: null,
    aliases: ["treadmill","treadmill run","treadmill walk","treadmill running","treadmill cardio"],
  },
  {
    name: "Cycling", category: "Cardio", videoId: null,
    aliases: ["cycling","stationary bike","spin bike","exercise bike","bike","bicycle",
      "cycle","stationary cycling"],
  },
  {
    name: "Jump Rope", category: "Cardio", videoId: null,
    aliases: ["jump rope","jumping rope","skipping","skipping rope","rope skipping","skip rope"],
  },
  {
    name: "Rowing Machine", category: "Cardio", videoId: null,
    aliases: ["rowing machine","rowing","ergometer","erg","indoor rowing","concept 2 rowing"],
  },
  {
    name: "Stair Climber", category: "Cardio", videoId: null,
    aliases: ["stair climber","stairmill","step mill","stair master","stairmaster","stairs"],
  },
  {
    name: "Elliptical", category: "Cardio", videoId: null,
    aliases: ["elliptical","cross trainer","elliptical trainer","cross-trainer"],
  },

  // ── FOREARMS (mapped to Back as no Forearms category exists) ───────────────
  {
    name: "Barbell Wrist Curl", category: "Biceps", videoId: "rehyT57ZBC8",
    aliases: ["barbell wrist curl","wrist curl","wrist curls","barbell wrist curls",
      "wrist flexion","forearm curl","wrist curl (barbell)"],
  },
  {
    name: "Reverse Wrist Curl", category: "Biceps", videoId: null,
    aliases: ["reverse wrist curl","wrist extension","reverse wrist curls","wrist extension (barbell)"],
  },
  {
    name: "Cable Wrist Curl", category: "Biceps", videoId: null,
    aliases: ["cable wrist curl","cable wrist curls","wrist curl (cable)","forearm cable curl"],
  },
  {
    name: "Farmer's Walk", category: "Back", videoId: null,
    aliases: ["farmer's walk","farmers walk","farmer walk","farmer carries","loaded carry"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. BUILD LOOKUP STRUCTURES
// ─────────────────────────────────────────────────────────────────────────────

// alias (lower-cased) → exercise entry
const aliasMap = new Map();
for (const ex of EXERCISES) {
  for (const alias of ex.aliases) {
    const key = alias.toLowerCase().trim();
    if (aliasMap.has(key)) {
      console.warn(`⚠  Duplicate alias: "${alias}" in both "${aliasMap.get(key).name}" and "${ex.name}"`);
    } else {
      aliasMap.set(key, ex);
    }
  }
  // Also register the canonical name itself as an alias
  aliasMap.set(ex.name.toLowerCase(), ex);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NAME NORMALISATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Expand common abbreviations BEFORE looking up
function expandAbbreviations(raw) {
  return raw
    .replace(/\bdb\b/gi, "Dumbbell")
    .replace(/\bdb\./gi, "Dumbbell")
    .replace(/\bbb\b/gi, "Barbell")
    .replace(/\bbb\./gi, "Barbell")
    .replace(/\bez\b/gi, "EZ")
    .replace(/\bohp\b/gi, "Overhead Press")
    .replace(/\brdl\b/gi, "Romanian Deadlift")
    .replace(/\bcgbp\b/gi, "Close Grip Bench Press")
    .replace(/\bcsr\b/gi, "Chest Supported Row")
    .replace(/\bsldl\b/gi, "Stiff-Leg Deadlift")
    .replace(/\brfess\b/gi, "Bulgarian Split Squats");
}

// Normalise whitespace and punctuation for lookup
function normaliseForLookup(raw) {
  return expandAbbreviations(raw)
    .toLowerCase()
    .replace(/[_/\\|]+/g, " ")   // underscores, slashes → space
    .replace(/\s+/g, " ")
    .trim();
}

// Generic Title Case for names not in the alias table
const LOWER_WORDS = new Set(["a","an","the","and","or","but","for","nor","on","at","to","by","in","of","up","vs","with"]);
function toTitleCase(str) {
  return str.trim().replace(/\s+/g, " ").split(" ").map((w, i) => {
    const lo = w.toLowerCase();
    return (i > 0 && LOWER_WORDS.has(lo)) ? lo : lo.charAt(0).toUpperCase() + lo.slice(1);
  }).join(" ");
}

// Resolve a raw exercise name to a canonical entry (or null if not found)
function resolve(raw) {
  const key = normaliseForLookup(raw);
  return aliasMap.get(key) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CATEGORY INFERENCE FALLBACK (for names not in alias table)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set(["Chest","Back","Legs","Shoulders","Biceps","Triceps","Core","Cardio"]);

const CATEGORY_PATTERNS = [
  { re: /\b(bench press|chest press|chest fly|pec deck|cable crossover|push.?up|pullover(?! cable)|incline.*press|decline.*press|chest dip)\b/i, cat: "Chest" },
  { re: /\b(pull.?up|pulldown|lat pull|deadlift|barbell row|dumbbell row|cable row|seated row|t.?bar row|chest supported row|straight arm pull|chin.?up|rack pull)\b/i, cat: "Back" },
  { re: /\b(squat|leg press|leg extension|leg curl|lunge|calf raise|romanian|hip thrust|glute bridge|step.?up|hack squat|goblet|hamstring curl)\b/i, cat: "Legs" },
  { re: /\b(overhead press|shoulder press|lateral raise|front raise|upright row|arnold press|shrug|face pull|rear delt|reverse pec|military press)\b/i, cat: "Shoulders" },
  { re: /\b(bicep curl|biceps curl|barbell curl|dumbbell curl|hammer curl|preacher curl|concentration curl|cable curl|bayesian|incline curl|zottman|spider curl|reverse curl)\b/i, cat: "Biceps" },
  { re: /\b(tricep|skull crusher|close grip bench|rope pushdown|triceps dip|bench dip|jm press|overhead.*extension|kickback|v.?bar pushdown|pushdown)\b/i, cat: "Triceps" },
  { re: /\b(crunch|plank|ab wheel|sit.?up|leg raise|russian twist|bicycle|hyperextension|back extension|dead bug)\b/i, cat: "Core" },
  { re: /\b(treadmill|cycling|cardio|jump rope|rowing machine|stair|elliptical|bike|skipping)\b/i, cat: "Cardio" },
];

function inferCategory(name) {
  for (const { re, cat } of CATEGORY_PATTERNS) {
    if (re.test(name)) return cat;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MAIN
// ─────────────────────────────────────────────────────────────────────────────

const snapshot = await db.collection("exerciseCatalog").where("gymId", "==", gymId).get();

if (snapshot.empty) {
  console.log("No exerciseCatalog docs found for gymId:", gymId);
  process.exit(0);
}

console.log(`Found ${snapshot.docs.length} exerciseCatalog docs for "${gymId}"\n`);

// Group docs by canonical name; keep the one with the richest data
const grouped = new Map(); // canonical name → { doc, data, entry }

for (const doc of snapshot.docs) {
  const data = doc.data();
  const rawName = String(data.name ?? "");
  const entry = resolve(rawName);

  const canonicalName = entry ? entry.name : toTitleCase(expandAbbreviations(rawName));
  const score = (data.videoUrl?.length ?? 0) + (data.gymVideoUrl?.length ?? 0) * 2 + Math.min(data.instructions?.length ?? 0, 200);

  const existing = grouped.get(canonicalName);
  if (!existing || score > existing.score) {
    grouped.set(canonicalName, { doc, data, entry, score });
  }
}

const keepIds = new Set([...grouped.values()].map(e => e.doc.id));

const now = new Date().toISOString();
const BATCH_SIZE = 400;
const batches = [];
let cur = db.batch();
let ops = 0;

function op(fn) {
  fn(cur);
  if (++ops >= BATCH_SIZE) { batches.push(cur); cur = db.batch(); ops = 0; }
}

let nUpdated = 0, nDeleted = 0, nUnchanged = 0;

for (const doc of snapshot.docs) {
  if (!keepIds.has(doc.id)) {
    op(b => b.delete(doc.ref));
    console.log(`  🗑  DELETE  (dup) "${doc.data().name}"`);
    nDeleted++;
    continue;
  }

  const rawName = String(doc.data().name ?? "");
  const resolvedEntry = resolve(rawName);
  const canonicalName = resolvedEntry ? resolvedEntry.name : toTitleCase(expandAbbreviations(rawName));

  // Category
  let category = doc.data().muscleGroup;
  if (resolvedEntry) {
    category = resolvedEntry.category;
  } else if (!VALID_CATEGORIES.has(category)) {
    category = inferCategory(canonicalName) ?? "Core";
  } else {
    const inferred = inferCategory(canonicalName);
    if (inferred && inferred !== category) category = inferred;
  }

  // Video
  const videoId = resolvedEntry?.videoId ?? null;
  const gymVideoUrl = videoId
    ? `https://www.youtube.com/shorts/${videoId}`
    : (doc.data().gymVideoUrl ?? "");
  const gymVideoSource = gymVideoUrl ? "youtube" : "none";

  const nameChanged = doc.data().name !== canonicalName;
  const categoryChanged = doc.data().muscleGroup !== category;
  const videoChanged = videoId && doc.data().gymVideoUrl !== gymVideoUrl;

  if (nameChanged || categoryChanged || videoChanged) {
    const changes = [];
    if (nameChanged)     changes.push(`name: "${doc.data().name}" → "${canonicalName}"`);
    if (categoryChanged) changes.push(`category: ${doc.data().muscleGroup} → ${category}`);
    if (videoChanged)    changes.push(`video: ${videoId}`);
    console.log(`  ✏  UPDATE  ${changes.join(" | ")}`);

    op(b => b.update(doc.ref, { name: canonicalName, muscleGroup: category, gymVideoUrl, gymVideoSource, updatedAt: now }));
    nUpdated++;
  } else {
    nUnchanged++;
  }
}

if (ops > 0) batches.push(cur);
for (const b of batches) await b.commit();

console.log(`\n✅  Done.`);
console.log(`   Updated   : ${nUpdated}`);
console.log(`   Deleted   : ${nDeleted} (duplicates removed)`);
console.log(`   Unchanged : ${nUnchanged}`);
console.log(`   Total docs after: ${snapshot.docs.length - nDeleted}`);
