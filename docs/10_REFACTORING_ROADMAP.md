# 10 · REFACTORING ROADMAP (Tier 2 — point-in-time opinion)

`Generated: 2026-06-05 · Last updated: 2026-07-06`

> ⚠️ **This is dated opinion, not fact.** Unlike Tier-0/1 docs, this file is NOT kept in sync
> with every PR — regenerate on demand. It captures the author's assessment as of the commit
> above. Ratings: Severity (impact), Effort (work), Risk (chance of breaking things).

## Critical issues (do first)

> **R1–R3 RESOLVED (2026-06-05).** See the per-item notes below; kept for history.

### R1 · ~~Trainer role can't establish a session~~ — **RESOLVED**
`toProfile` (`src/lib/auth.ts:306`) and the cookie fallback (`src/lib/auth.ts:893`) now accept
`admin|owner|trainer|member`, so a pure `role:"trainer"` account logs in normally. Demo trainers
remain `role:"owner"`+`staffType:"trainer"` in seed data. (Was [DISCREPANCIES](DISCREPANCIES.md) B1.)

### R2 · ~~Root-level PT collections leak across members~~ — **RESOLVED**
Root `ptSessions`/`ptLiftLogs` rules now restrict members to their own data
(`resource.data.memberId == memberId()`), matching the gym-scoped path. (Was DISCREPANCIES B3.)

### R3 · ~~Lockout key mismatch~~ — **RESOLVED (not a real gap)**
The login flow increments **both** `loginAttempts/{email}` (`auth.ts:813`) and
`loginAttempts/{identifier}` (`auth.ts:814`) on each failure, so the email-keyed doc the blocking
trigger reads is maintained. The two-key design is intentional. (Residual, separate: failed
direct-SDK sign-ins aren't counted — Firebase per-IP throttling is the backstop.)

## Architecture / tech debt

### R4 · ~~Dual-write (root mirror + gym-scoped) is the dominant complexity~~ — **RESOLVED (2026-07-05)**
Almost every collection is written twice (`mirrorGymScopedRecord`/`mirrorProfileToGym`) and every
read-model has a "scoped, else root" fallback. This doubles write cost, invites drift, and forces
defensive read logic everywhere.
**Resolution:** Root writes were systematically removed across `members.ts`, `staff.ts`, `programs.ts`, `pt.ts`, `exercises.ts`, and `contact.ts`. A backfill script was introduced to migrate legacy data, and root fallbacks were removed from read models.

### R5 · ~~Server Action ↔ Cloud Function duplication~~ — **RESOLVED (2026-06-28)**
Member/staff/gym/program/billing operations exist as both a Server Action (used by UI) and a
Cloud Function (often unused; the `allow:false` rules assume it). Two implementations of the same
invariant drift.
**Resolution:** All 11 UI components migrated from CF-primary/SA-fallback to SA-only. `functions.ts` trimmed to ~80 lines.

### R6 · ~~Notification `type` union drift~~ — **RESOLVED (2026-06-05)**
`payment_request_pending`, `payment_request_rejected`, and `data_deletion_request` were added to
the `Notification.type` union (`src/types/domain.ts`) and given dedicated icons in
`notification-list.tsx`. No emitted type now falls through to the default bell.

## Dead / orphaned code

### R7 · Unused declarations — **Sev: Low · Effort: S · Risk: L**
- ~~`workoutSplitTemplates` collection: declared + had rules, no read/write site~~ — removed from
  collection declarations earlier and Firestore rules on 2026-06-29.
- Root `memberships` key unused (gym-scoped only).
- Several callable wrappers in `src/lib/firebase/functions.ts` with no confirmed UI caller (C5).
- Legacy `profiles` collection — read-only fallback; plan removal with R4.
**Fix:** remove after confirming zero references; keep `profiles` until migration done.

### R8 · Legacy CSS + old card components — **Sev: Low-Med · Effort: L · Risk: M**
The owner dashboard/listing pages were migrated to the `adm-card` design system, but **~26 files
still use the old `list-panel` / `panel-title` / `stat-card` cards** (defined in
`01-owner-members.css`, `07-member-dashboard-legacy.css`, `02-shared-components.css`): the trainer
pages (`/trainer`, `/trainer/members`), member sub-pages (`membership`, `pt-history`, `exercises`),
`profile`/`activity`, `owner/members/[memberId]`, and ~15 shared components
(`body-weight-logger`, `muscle-radar-chart`, `member-history`,
`member-progress-panel`, `member-context-editor`, `owner-ai-capacity-panel`, etc.). The legacy CSS
files can't be deleted until these are migrated. The `ep-modal` class remains live in the program
builder/modal CSS, but the old standalone `ep-modal.css` file has been deleted.
**Fix:** migrate per-area to `adm-card` (owner/admin) or `m3d-`/`mset-` (member) card shells, then
delete superseded selectors after each migrated area.

## Testing & quality

### R9 · Near-zero test coverage — **Sev: Med · Effort: L · Risk: L**
Only `src/lib/__tests__/validation.test.ts` and `src/lib/__tests__/workout-utils.test.ts` exist. The
entire data-access layer (actions, read-models, CFs), authz guards, billing date
math, and dual-write mirroring are untested.
**Progress (2026-07-05):** Added test coverage for billing approval transitions (`billing-logic.test.ts`) and membership expiry logic (`membership-expiry-logic.test.ts`).
**Priority targets:** `assertMemberBelongsToCallerGym`, lockout logic, program-assignment cancel-prior behavior.

## Performance / scalability

### R10 · ~~Collection-group + full-collection scans~~ — **RESOLVED (2026-06-28)**
- `getGymWorkspaces` reads the entire `members` collection group + all member authProfiles to
  count members (`read-models/gyms.ts:28-35`).
- Member delete fires ~10 collection-group queries (`actions/members.ts:754-768`).
- `generateAdminDashboardStats` iterates all gyms with per-gym count queries (`index.ts:1662-1670`).
**Resolution:** Replaced with denormalized counters (`gyms.memberCount`, `summaries/dashboard`). Passed `gymId` to read models to avoid collection group scans.

### R11 · ~~Embedded `notices` array read-modify-write~~ — **RESOLVED (2026-06-28)**
`addGymNotice`/`deleteGymNotice` rewrite the whole `gyms.notices[]` array (`actions/gyms.ts:636-637`)
— concurrent edits clobber. 
**Resolution:** Wrapped in Firestore transaction.

## Suggested order

> **Updated 2026-07-06**: Major items R1-R6 and R10-R11 are completed.

Remaining priorities:
1. **R9** (expand tests around the invariants).
2. **R8** (legacy CSS) — blocked on migrating the ~26 files still using the old
   `list-panel`/`panel-title`/`stat-card` cards to `adm-card`/`m3d-` (trainer pages, member
   sub-pages, profile/activity, and ~15 shared components). See the card-migration plan.
3. **R7** (dead-code removal for remaining orphaned declarations).
