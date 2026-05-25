import json
import os

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
file_path = os.path.join(repo_root, "lib", "workouts.json")
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

catalog = data.get('exercise_catalog', {})

new_exercises = {
    'Chest': [
        {"id": "ch_09", "name": "Machine Chest Fly", "mechanic": "Isolation", "video_url": "https://www.youtube.com/shorts/XZg28DIf1oc"},
        {"id": "ch_10", "name": "One-Arm Pushup", "mechanic": "Compound", "video_url": "https://www.youtube.com/shorts/bh9PsSfGZ2o"}
    ],
    'Back': [
        {"id": "bk_09", "name": "Landmine Row", "mechanic": "Compound", "video_url": "https://www.youtube.com/shorts/Sr2q7i-i8X0"},
        {"id": "bk_10", "name": "Chest Supported Row", "mechanic": "Compound", "video_url": "https://www.youtube.com/shorts/G35gTqGcXXA"}
    ],
    'Legs': [
        {"id": "lg_10", "name": "Hack Squat", "mechanic": "Compound", "video_url": "https://www.youtube.com/shorts/cFGgMO-ENiQ"},
        {"id": "lg_11", "name": "Goblet Squat", "mechanic": "Compound", "video_url": "https://www.youtube.com/shorts/ZBAd1g1z6qs"},
        {"id": "lg_12", "name": "Front Squat", "mechanic": "Compound", "video_url": "https://www.youtube.com/shorts/_qv0m3tPd3s"}
    ],
    'Shoulders': [
        {"id": "sh_09", "name": "Face Pull", "mechanic": "Compound", "video_url": "https://www.youtube.com/shorts/ywQsaOTRjzM"},
        {"id": "sh_10", "name": "Smith Machine Shoulder Press", "mechanic": "Compound", "video_url": "https://www.youtube.com/shorts/E7ngsffMPR0"}
    ],
    'Biceps': [
        {"id": "bi_09", "name": "Bayesian Curl", "mechanic": "Isolation", "video_url": "https://www.youtube.com/shorts/oAlhGm6_Qh4"},
        {"id": "bi_10", "name": "Machine Preacher Curl", "mechanic": "Isolation", "video_url": "https://www.youtube.com/shorts/S4dDLfp3e8w"}
    ],
    'Triceps': [
        {"id": "tr_09", "name": "Triceps Kickback", "mechanic": "Isolation", "video_url": "https://www.youtube.com/shorts/WhBxKbe1-NU"},
        {"id": "tr_10", "name": "Cable Overhead Triceps Extension", "mechanic": "Isolation", "video_url": "https://www.youtube.com/shorts/fmgmPDacgKM"}
    ],
    'Core': [
        {"id": "co_01", "name": "Cable Crunch", "mechanic": "Isolation", "video_url": "https://www.youtube.com/shorts/RQjrmGTbxjI"},
        {"id": "co_02", "name": "Hyperextensions", "mechanic": "Compound", "video_url": "https://www.youtube.com/shorts/nGkITCtyMRc"}
    ],
    'Forearms': [
        {"id": "fa_01", "name": "Barbell Wrist Curl", "mechanic": "Isolation", "video_url": "https://www.youtube.com/shorts/DRCSpntjwRw"},
        {"id": "fa_02", "name": "Cable Wrist Curl", "mechanic": "Isolation", "video_url": "https://www.youtube.com/shorts/cocFB-38xgA"}
    ]
}

for group, exercises in new_exercises.items():
    if group not in catalog:
        catalog[group] = []
    catalog[group].extend(exercises)

for group, exercises in catalog.items():
    for ex in exercises:
        if ex['name'] == 'Chin-Ups' and 'video_url' not in ex:
            ex['video_url'] = "https://www.youtube.com/shorts/kLmFCtNDut4"
        elif ex['name'] == 'Walking Lunges' and 'video_url' not in ex:
            ex['video_url'] = "https://www.youtube.com/shorts/f7Aw2yiqmVs"

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Updated workouts.json")
