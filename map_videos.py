import json
import urllib.parse

with open('lib/workouts.json', 'r') as f:
    workouts = json.load(f)

for category, exercises in workouts['exercise_catalog'].items():
    for ex in exercises:
        query = f'Deltabolic {ex["name"]} short'
        # Fallback to search query URL if exact short ID is unknown
        ex['video_url'] = "https://www.youtube.com/results?search_query=" + urllib.parse.quote(query)

with open('lib/workouts.json', 'w') as f:
    json.dump(workouts, f, indent=2)

print("Mapping complete!")
