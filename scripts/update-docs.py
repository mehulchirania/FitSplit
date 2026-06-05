import os
import re
import glob

docs_dir = r"c:\Users\mehul\Documents\Codex\2026-05-03\FitSplit\docs"
pattern = re.compile(r'\b(app|components|lib|types)/')

count = 0
for filepath in glob.glob(os.path.join(docs_dir, "*.md")):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = pattern.sub(r'src/\1/', content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        count += 1
        print(f"Updated: {os.path.basename(filepath)}")

print(f"Total files updated: {count}")
