import urllib.request
import re
import xml.etree.ElementTree as ET
import json

try:
    # First get the channel ID
    url = "https://www.youtube.com/@DeltaBolic"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read().decode('utf-8')
    
    match = re.search(r'itemprop="url" href="http://www.youtube.com/channel/(UC[^"]+)"', html)
    if not match:
        match = re.search(r'"channelId":"(UC[^"]+)"', html)
        
    if match:
        channel_id = match.group(1)
        print("Channel ID:", channel_id)
        
        rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        req = urllib.request.Request(rss_url, headers={'User-Agent': 'Mozilla/5.0'})
        xml_data = urllib.request.urlopen(req).read()
        
        root = ET.fromstring(xml_data)
        ns = {'ns': 'http://www.w3.org/2005/Atom'}
        videos = {}
        for entry in root.findall('ns:entry', ns):
            title = entry.find('ns:title', ns).text
            video_id = entry.find('ns:id', ns).text.replace('yt:video:', '')
            videos[title] = video_id
            
        print(json.dumps(videos, indent=2))
    else:
        print("Channel ID not found")
except Exception as e:
    print("Error:", e)
