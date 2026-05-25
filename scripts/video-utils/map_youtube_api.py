import os
import urllib.request
import urllib.parse
import json
import difflib
import codecs
import sys

# Load .env.local from the repo root if present (simple key=value parser, no dependencies required)
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
env_path = os.path.join(repo_root, ".env.local")
if os.path.exists(env_path):
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

# Ensure stdout supports utf-8
sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
PLAYLIST_ID = "UUerweoBkwQOb_zwx3NfUD1g"

if not API_KEY:
    print("Error: YOUTUBE_API_KEY is not set. Add it to .env.local or the environment.")
    sys.exit(1)

def get_all_videos():
    videos = {}
    next_page_token = ""
    while True:
        url = f"https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId={PLAYLIST_ID}&maxResults=50&key={API_KEY}"
        if next_page_token:
            url += f"&pageToken={next_page_token}"
            
        req = urllib.request.Request(url)
        try:
            response = urllib.request.urlopen(req).read().decode('utf-8')
            data = json.loads(response)
            
            for item in data.get('items', []):
                title = item['snippet']['title']
                video_id = item['snippet']['resourceId']['videoId']
                videos[video_id] = title
                
            next_page_token = data.get('nextPageToken')
            if not next_page_token:
                break
        except Exception as e:
            print(f"Error fetching videos: {e}")
            break
            
    return videos

all_videos = get_all_videos()

workouts_path = os.path.join(repo_root, "lib", "workouts.json")
unmapped_path = os.path.join(os.path.dirname(__file__), "unmapped_videos.md")

with open(workouts_path, 'r', encoding='utf-8') as f:
    workouts = json.load(f)

# Collect all exercises
exercises = []
for cat, ex_list in workouts['exercise_catalog'].items():
    exercises.extend(ex_list)

mapped_videos = set()
unmapped_exercises = []

for ex in exercises:
    ex_name = ex['name']
    best_match = None
    best_score = 0
    
    for vid, title in all_videos.items():
        score = difflib.SequenceMatcher(None, ex_name.lower(), title.lower()).ratio()
        if ex_name.lower() in title.lower():
            score += 0.5
            
        if score > best_score:
            best_score = score
            best_match = vid
            
    if best_match and best_score > 0.4:
        ex['video_url'] = f"https://www.youtube.com/shorts/{best_match}"
        mapped_videos.add(best_match)
    else:
        ex.pop('video_url', None)
        unmapped_exercises.append(ex_name)

# Identify unmapped videos
unmapped_videos = []
for vid, title in all_videos.items():
    if vid not in mapped_videos:
        unmapped_videos.append(f"- [{title}](https://www.youtube.com/shorts/{vid})")

with open(workouts_path, 'w', encoding='utf-8') as f:
    json.dump(workouts, f, indent=2)

with open(unmapped_path, 'w', encoding='utf-8') as f:
    f.write("# Unmapped Exercises\n")
    for e in unmapped_exercises:
        f.write(f"- {e}\n")
    f.write("\n# Unmapped Videos\n")
    f.write("\n".join(unmapped_videos))

print(f"Mapped successfully. See {unmapped_path} for the {len(unmapped_videos)} extra videos.")
