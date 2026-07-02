# 15 - Unused Code CI Guardrail

`Added: 2026-07-02`

## Purpose

`docs/14_PRODUCT_REFINEMENT_AUDIT_2026-07-02.md` recommends promoting unused
files and unused dependencies to CI failures so redesign debris is harder to miss.

## Implemented Guardrail

Added `.github/workflows/unused-code.yml`.

The workflow runs on pushes and pull requests targeting `main`, installs the root
dependencies with `npm ci`, then runs:

```bash
npm run knip -- --include files,dependencies --reporter github-actions
```

This keeps the check focused on unused files and unused package dependencies. It
does not currently block on unused exports.

## Local Verification

Local command run from the repository root:

```bash
npm run knip -- --include files,dependencies --reporter compact
```

Behavior before cleanup on 2026-07-02: command exited with code `1` because the
audit debris was still present.

Follow-up cleanup removed the abandoned shadcn/Tailwind files and unused packages.
After cleanup, the command exits `0` for unused files and dependencies. Unused
exports remain outside the CI gate for now.
