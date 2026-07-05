/* eslint-disable @typescript-eslint/no-unused-vars */
import { readFileSync, writeFileSync } from 'node:fs';
import { readFileSync as rf } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
try {
  const envContent = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch { /* no .env.local */ }

const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'));
initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) });
const db = getFirestore();

// Curated SHG exercise → video ID mapping (null = no SHG video available)
const mapping = {
  // Chest
  'Barbell Bench Press':              'vzcLmuYaCJ4',  // Barbell flat chest press
  'Incline Dumbbell Press':           'leZzdhGKPkE',  // Dumbell incline chest press
  'Pec Deck Fly':                     'VpLWl99Xkw4',  // Chest flys in Butterfly machine
  'Cable Crossover':                  'jp1niNDa4RQ',  // High cable chest flys
  'Decline Barbell Press':            'I99DHQpDj8Q',  // Dumbell decline chest press
  'Machine Chest Press':              'Cw1XmuS_12g',  // Plate Loaded Chest Press
  'Dumbbell Pullover':                'lpqtOhGn5VI',  // Dumbell pull over
  'Push-Ups':                         'PvVAVM81eKc',  // Pushups
  'Machine Chest Fly':                'h2cW4F4pknI',  // Plate Loaded Chest flys
  'One-Arm Pushup':                   null,
  // Back
  'Pull-Ups':                         'lofkU30wYjM',  // Pull ups
  'Barbell Row':                      '75-PAqMAGsA',  // Bent over barbell rowing
  'Lat Pulldown':                     'ZVCr4crm2w0',  // Lat pull-down front wide grip
  'Seated Cable Row':                 'GBi39WvymnE',  // Seated rowing
  'T-Bar Row':                        'x4ewNvTCaPg',  // Incline T bar rowing
  'Single Arm Dumbbell Row':          '6ngDqCas0ek',  // Single arm dumbell rowing
  'Straight Arm Pulldown':            'JsgwZYDjrbU',  // Standing cable lat push down
  'Chin-Ups':                         'lofkU30wYjM',  // Pull ups
  'Landmine Row':                     null,
  'Chest Supported Row':              '7pQTJUpyoJE',  // Incline Chest Supported Rowing Plate Loaded
  // Legs
  'Barbell Squat':                    'Zfo3lY-1qAA',  // Barbell squats
  'Romanian Deadlift':                'BdK5HX7yr7s',  // Dumbell romanian deadlift
  'Leg Press':                        'OrGEtlV7naA',  // Leg press
  'Leg Extension':                    'ZntBQBw45LI',  // Leg extension
  'Standing Calf Raises':             'Ap3mSmYqHPE',  // Standing calf raises
  'Walking Lunges':                   'oQWXG9IW2FA',  // Walking leg lunges
  'Bulgarian Split Squats':           null,
  'Lying Hamstring Curls':            '1aTtclbaqNw',  // Lying leg curls
  'Seated Calf Raises':               'FR-yAiIO89g',  // Seated calf raises
  'Hack Squat':                       'vbiSRCRucZU',  // Hack Squat in Front Squat machine
  'Goblet Squat':                     '_gCz4WsKq6w',  // Goblet squats
  'Front Squat':                      'HYRoHNjufrM',  // Front Squats
  // Shoulders
  'Overhead Press':                   'eCeNYf52lB0',  // Standing barbell Shoulder press
  'Dumbbell Lateral Raise':           'pY-GDd_irmA',  // Standing Dumbell side lateral raise
  'Reverse Pec Deck':                 'RcygDDdTXVE',  // Rear delt flys in Butterfly machine
  'Arnold Press':                     'Riu65hV-d44',  // Seated Dumbell Arnold press
  'Dumbbell Front Raise':             'ddL-ZdSLXCE',  // Standing Dumbell front raise
  'Barbell Upright Row':              'ABL1gdBP0fE',  // Barbell upright row
  'Barbell Shrugs':                   'W3BJy2DrC3M',  // Barbell shrugs
  'Cable Lateral Raise':              'V1CjJOCRbyQ',  // Cable side lateral raise
  'Face Pull':                        'Zr0GzFNjtdU',  // Face pull
  'Smith Machine Shoulder Press':     'Xbv2zSSPoyo',  // Smith Machine Seated Shoulder Press
  // Biceps
  'Barbell Curl':                     'Hsx_2cBAs-8',  // Barbell biceps curl
  'Incline Dumbbell Curl':            'tipdoo70BMc',  // Seated Incline Dumbbell Biceps Curl
  'Hammer Curl':                      'jPYMihpFXww',  // Standing Dumbell hammer curl
  'EZ Bar Preacher Curl':             '-i1MQ9t3xaw',  // Barbell preacher curl
  'Concentration Curl':               'rBZu85eJkMk',  // Dumbell concentration curl
  'Cable Bicep Curl':                 'u6uJryWpjBo',  // Cable biceps curl
  'Reverse Barbell Curl':             'knPTS8FziY4',  // Barbell reverse curl
  'High Cable Curls':                 'rdNfF1aIkj4',  // High cable biceps curl
  'Bayesian Curl':                    'eq0MqxxXV84',  // Bayesian curls
  'Machine Preacher Curl':            'AfbWXcmq4hY',  // Machine preacher curl
  // Triceps
  'Tricep Pushdown (Straight Bar)':   'pR70W4eLDMM',  // Triceps bar push down
  'Overhead Tricep Extension':        'Z_52vmRB8H0',  // Seated dumbbell triceps overhead extension
  'Skull Crushers':                   'BavILqYu-ds',  // Barbell skull crushers
  'Close Grip Bench Press':           null,
  'Tricep Dips':                      'pUibsG6kejs',  // Triceps back dips
  'Rope Pushdown':                    'xjzJHmoThuU',  // Triceps rope push down
  'Dumbbell Kickbacks':               'FcX7frCpmmc',  // Dumbell triceps kick back
  'JM Press':                         null,
  'Triceps Kickback':                 'FcX7frCpmmc',  // Dumbell triceps kick back
  'Cable Overhead Triceps Extension': 'N0hjEM2v8V0',  // Cable triceps overhead extension
  // Core
  'Cable Crunch':                     '_lTk22o7LBk',  // Cable crunches
  'Hyperextensions':                  null,
  // Forearms
  'Barbell Wrist Curl':               'rehyT57ZBC8',  // Wrist curl
  'Cable Wrist Curl':                 null,
};

// 1. Update workouts.json
const workouts = JSON.parse(readFileSync(resolve(__dirname, '../lib/workouts.json'), 'utf-8'));
let jsonCount = 0;
for (const exes of Object.values(workouts.exercise_catalog)) {
  for (const ex of exes) {
    if (ex.name in mapping) {
      const id = mapping[ex.name];
      ex.gym_video_url = id ? `https://www.youtube.com/shorts/${id}` : '';
      jsonCount++;
    }
  }
}
writeFileSync(resolve(__dirname, '../lib/workouts.json'), JSON.stringify(workouts, null, 2));
console.log(`workouts.json: ${jsonCount} exercises updated with gym_video_url`);

// 2. Update Firestore
const snap = await db.collection('exerciseCatalog').where('gymId', '==', 'shg').get();
const now = new Date().toISOString();
const batch = db.batch();
let fsCount = 0;

for (const doc of snap.docs) {
  const name = doc.data().name;
  if (!(name in mapping)) continue;
  const id = mapping[name];
  batch.update(doc.ref, {
    gymVideoUrl: id ? `https://www.youtube.com/shorts/${id}` : '',
    gymVideoSource: id ? 'youtube' : 'none',
    updatedAt: now,
  });
  console.log(`  ${id ? 'mapped' : 'cleared'}: ${name}${id ? ' -> ' + id : ''}`);
  fsCount++;
}

await batch.commit();
console.log(`\nFirestore: ${fsCount} exercises updated`);
