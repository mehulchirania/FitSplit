import os

base_dir = r"c:\Users\mehul\Documents\Codex\2026-05-03\FitSplit"

sentry_config = """
# Sentry Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
"""

for file_name in [".env.example", ".env.local"]:
    path = os.path.join(base_dir, file_name)
    with open(path, "a", encoding="utf-8") as f:
        f.write(sentry_config)

print("Sentry config added.")
