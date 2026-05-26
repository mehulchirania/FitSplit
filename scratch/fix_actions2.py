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

    lines = content.split('\n')
    for i in range(len(lines)):
        line = lines[i]
        idx = line.find('return success(')
        if idx != -1:
            # Find the matching closing parenthesis
            start_idx = idx + len('return success(')
            paren_count = 1
            in_string = False
            quote_char = None
            end_idx = -1
            
            for j in range(start_idx, len(line)):
                char = line[j]
                if char in ["'", '"', "`"]:
                    if not in_string:
                        in_string = True
                        quote_char = char
                    elif quote_char == char:
                        in_string = False
                elif not in_string:
                    if char == '(':
                        paren_count += 1
                    elif char == ')':
                        paren_count -= 1
                        if paren_count == 0:
                            end_idx = j
                            break
            
            if end_idx != -1:
                args_str = line[start_idx:end_idx].strip()
                if not args_str.endswith("]"):
                    # count commas outside of strings
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
                        new_args = f'{args_str}, undefined, {tags}'
                    elif commas == 1:
                        new_args = f'{args_str}, {tags}'
                    else:
                        new_args = args_str
                        
                    lines[i] = line[:start_idx] + new_args + line[end_idx:]

    new_content = '\n'.join(lines)
    if new_content != content:
        with open(file, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {os.path.basename(file)}")

print("Done.")
