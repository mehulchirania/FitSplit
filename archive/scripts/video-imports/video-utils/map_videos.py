import json
import os
import urllib.parse

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
workouts_path = os.path.join(repo_root, "lib", "workouts.json")

with open(workouts_path, 'r') as f:
    workouts = json.load(f)

for category, exercises in workouts['exercise_catalog'].items():
    for ex in exercises:
        query = f'Deltabolic {ex["name"]} short'
        # Fallback to search query URL if exact short ID is unknown
        ex['video_url'] = "https://www.youtube.com/results?search_query=" + urllib.parse.quote(query)

with open(workouts_path, 'w') as f:
    json.dump(workouts, f, indent=2)

print("Mapping complete!")
