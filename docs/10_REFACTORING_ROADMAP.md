# 10 · REFACTORING ROADMAP (Tier 2 — point-in-time opinion)

`Generated: 2026-06-05 · Commit: 6f00a89`

> ⚠️ **This is dated opinion, not fact.** Unlike Tier-0/1 docs, this file is NOT kept in sync
> with every PR — regenerate on demand. It captures the author's assessment as of the commit
> above. Ratings: Severity (impact), Effort (work), Risk (chance of breaking things).

## Critical issues (do first)

### R1 · Trainer role can't establish a session — **Sev: High · Effort: M · Risk: M**
`createStaffAccount`/`createTrainer` create real `role:"trainer"` Auth users, but
`toProfile` (`src/lib/auth.ts:306`) and the cookie fallback (`src/lib/auth.ts:909`) only accept
`admin|owner|member`. A pure trainer therefore can't log in via the app session path. Today this
is masked because demo trainers are `role:"owner"`+`staffType:"trainer"`.
**Fix:** add `"trainer"` to the accepted-role checks in `src/lib/auth.ts` (and audit
`authUserFromProfile`/`redirectForRole`, which already handle trainer). Test the `/trainer` routes
end-to-end. (See [DISCREPANCIES](DISCREPANCIES.md) B1.)

### R2 · Root-level PT collections leak across members — **Sev: Med-High · Effort: S · Risk: L**
Root `ptSessions`/`ptLiftLogs` rules let any member of a gym read **any** PT session/lift log in
that gym (`firestore.rules:424,432`). The gym-scoped path is correctly restricted to the owning
member (`:252,261`).
**Fix:** tighten the root rules to `resource.data.memberId == memberId()` for members, or deprecate
the root PT mirror entirely (see R4).

### R3 · Lockout key mismatch weakens brute-force defense — **Sev: Med · Effort: S · Risk: L**
Identifier-based locks are written to `loginAttempts/{rawIdentifier}` (`src/lib/auth.ts:589`) but the
Auth blocking trigger reads `loginAttempts/{email}` (`functions/src/index.ts:1912`). Direct-SDK
sign-ins may bypass identifier locks.
**Fix:** standardize on a single key (email, lowercased) across both paths, or have the trigger
also check the normalized identifier.

## Architecture / tech debt

### R4 · Dual-write (root mirror + gym-scoped) is the dominant complexity — **Sev: High · Effort: L · Risk: H**
Almost every collection is written twice (`mirrorGymScopedRecord`/`mirrorProfileToGym`) and every
read-model has a "scoped, else root" fallback. This doubles write cost, invites drift, and forces
defensive read logic everywhere. The README itself notes this is legacy migration scaffolding.
**Direction:** pick the gym-scoped path as canonical, backfill any root-only data, delete the root
mirrors collection-by-collection, and remove the read fallbacks. Sequence behind R2 (PT) since the
root PT rules are also the privacy gap. High risk — do per-collection with verification.

### R5 · Server Action ↔ Cloud Function duplication — **Sev: Med · Effort: M · Risk: M**
Member/staff/gym/program/billing operations exist as both a Server Action (used by UI) and a
Cloud Function (often unused; the `allow:false` rules assume it). Two implementations of the same
invariant drift (e.g. side-effect handling differs: CF uses `onProgramAssignmentCreated` trigger,
the action writes notifications inline).
**Direction:** decide one surface per operation. If Server Actions remain the path, treat the CFs
as dead code (R7) except where genuine client-callable privilege is needed. Document the decision
in `00_AI_CONTEXT.md`.

### R6 · Notification `type` union drift — **Sev: Low-Med · Effort: S · Risk: L**
Billing code emits `payment_request_pending`/`payment_request_rejected` not in
`Notification.type` (`src/types/domain.ts:352-368`). UI icon/styling keyed on type may fall through.
**Fix:** extend the union and the notification-list icon map, or normalize emitted types.

## Dead / orphaned code

### R7 · Unused declarations — **Sev: Low · Effort: S · Risk: L**
- `workoutSplitTemplates` collection: declared + has rules, no read/write site
  ([DISCREPANCIES](DISCREPANCIES.md) C1).
- Root `memberships` key unused (gym-scoped only).
- Several callable wrappers in `src/lib/firebase/functions.ts` with no confirmed UI caller (C5).
- Legacy `profiles` collection — read-only fallback; plan removal with R4.
**Fix:** remove after confirming zero references; keep `profiles` until migration done.

### R8 · Legacy CSS — **Sev: Low · Effort: M · Risk: M**
README flags superseded files (`01-owner-members.css` ⊃ by `19-members-redesign.css`,
`07-member-dashboard-legacy.css`, `06-…-legacy-landing.css`). Undocumented `ep-modal.css` exists.
**Fix:** audit usage per prefix, delete superseded selectors, document or remove `ep-modal.css`.

## Testing & quality

### R9 · Near-zero test coverage — **Sev: Med · Effort: L · Risk: L**
Only `src/lib/__tests__/validation.test.ts` and `src/lib/__tests__/workout-utils.test.ts` exist. The
entire data-access layer (actions, read-models, CFs), authz guards, geofence math, billing date
math, and dual-write mirroring are untested.
**Priority targets:** `assertMemberBelongsToCallerGym`, `validateGymGeofence`/`distanceInMeters`,
`addMonths`/PT date math, lockout logic, program-assignment cancel-prior behavior.

## Performance / scalability

### R10 · Collection-group + full-collection scans — **Sev: Med · Effort: M · Risk: M**
- `getGymWorkspaces` reads the entire `members` collection group + all member authProfiles to
  count members (`read-models/gyms.ts:28-35`).
- Member delete fires ~10 collection-group queries (`actions/members.ts:754-768`).
- `generateAdminDashboardStats` iterates all gyms with per-gym count queries (`index.ts:1662-1670`).
**Direction:** lean on denormalised counters (`gyms.memberCount`, `summaries/dashboard`) and avoid
collection-group scans as gyms grow.

### R11 · Embedded `notices` array read-modify-write — **Sev: Low · Effort: S · Risk: M**
`addGymNotice`/`deleteGymNotice` rewrite the whole `gyms.notices[]` array (`actions/gyms.ts:636-637`)
— concurrent edits clobber. **Fix:** move notices to a subcollection or use array-union/transaction.

## Suggested order

1. **R1** (trainer login) — small, unblocks a documented role.
2. **R3** (lockout key) + **R2** (PT privacy) — security, small.
3. **R6** (notification types) — small cleanup.
4. **R9** (tests around the invariants you're about to touch).
5. **R5** (decide action vs CF) → enables **R7** dead-code removal.
6. **R4** (dual-write consolidation) — largest, do per-collection behind tests.
7. **R10/R11/R8** (perf + CSS) opportunistically.
