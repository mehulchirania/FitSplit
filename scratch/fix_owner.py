import os

file_path = r"c:\Users\mehul\Documents\Codex\2026-05-03\FitSplit\app\owner\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'import { Activity, Bell, Calendar, Dumbbell, UsersRound } from "@/components/icons";',
    'import { Bell, UsersRound } from "@/components/icons";'
)
content = content.replace("  getExerciseCatalog,\n", "")
content = content.replace("    { exercises },\n", "")
content = content.replace("    getExerciseCatalog(gymId),\n", "")
content = content.replace(
    """  const assignmentRate = members.length
    ? Math.round(((members.length - unassignedMembers.length) / members.length) * 100)
    : 0;""",
    ""
)
content = content.replace("  const activePTMembers = new Set(currentPTPlans.map((p) => p.memberId)).size;\n", "")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Owner page fixed.")
