import os
import re
import glob

actions_dir = r"c:\Users\mehul\Documents\Codex\2026-05-03\FitSplit\lib\firebase\actions"
files = glob.glob(os.path.join(actions_dir, "*.ts"))

def get_tags_for_file(filename):
    base = os.path.basename(filename)
    if base == "contact.ts": return '["contact", "notifications"]'
    if base == "exercises.ts": return '["exercises"]'
    if base == "gyms.ts": return '["gyms"]'
    if base == "members.ts": return '["members"]'
    if base == "notifications.ts": return '["notifications"]'
    if base == "programs.ts": return '["programs"]'
    if base == "progress.ts": return '["day-logs", "lift-logs", "activity", "body-metrics"]'
    if base == "pt.ts": return '["pt-sessions", "pt-lift-logs"]'
    if base == "staff.ts": return '["staff"]'
    return None

for file in files:
    if os.path.basename(file) in ["shared.ts", "validation.ts"]:
        continue
    
    tags = get_tags_for_file(file)
    if not tags: continue

    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace catch (error: any) with catch (error: unknown)
    content = re.sub(r'catch\s*\(\s*(\w+)\s*:\s*any\s*\)', r'catch (\1: unknown)', content)

    # Function to replace success calls
    def replacer(match):
        # match.group(1) is the arguments string inside success(...)
        args_str = match.group(1).strip()
        
        # If it already has an array at the end, skip
        if args_str.endswith("]"):
            return match.group(0)

        # Count arguments (naive approach by counting commas not in quotes)
        # It's easier: if there's no comma, it's 1 arg.
        # If there's 1 comma, it's 2 args.
        # If there's 2 commas, it's 3 args.
        
        in_string = False
        quote_char = None
        commas = 0
        for char in args_str:
            if char in ["'", '"', "`"]:
                if not in_string:
                    in_string = True
                    quote_char = char
                elif quote_char == char:
                    in_string = False
            elif char == ',' and not in_string:
                commas += 1
                
        if commas == 0:
            return f'success({args_str}, undefined, {tags})'
        elif commas == 1:
            return f'success({args_str}, {tags})'
        else:
            # Already 3 args or more
            return match.group(0)

    # Use regex to find success(...)
    # We look for return success(...)
    new_content = re.sub(r'success\((.*?)\)', replacer, content)

    if new_content != content:
        with open(file, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {os.path.basename(file)}")

print("Done.")
