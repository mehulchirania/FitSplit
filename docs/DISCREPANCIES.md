# DISCREPANCIES (Meta)

`Generated: 2026-06-05 · Commit: a0be3a8 · Audited: 2026-07-02`

> Every place the legacy `README.md` / `FIRESTORE_STRUCTURE.md` disagree with code, plus
> dead/orphaned references and internal inconsistencies. **Code wins.** Severity is the doc
> author's assessment, not a code label.

## A. README / docs vs code

| # | Topic | README/docs say | Code says | Source | Severity |
|---|---|---|---|---|---|
| A1 | ~~CSS file count~~ — **resolved** | "21 modular CSS files" + lists `forms.css`, `member.css` | `src/app/styles/` contains 21 numbered files plus `forms.css` and `member.css`; the old standalone `ep-modal.css` and later `shadcn.css` debris are gone. | `ls src/app/styles/` | Resolved |
| A2 | ~~Trainer role~~ — **resolved** | "trainer (staffType)" + first-class `trainer` role in rules/middleware | Session layer now accepts role `trainer` (`toProfile`/cookie fallback `src/lib/auth.ts:306,893`). Demo trainers are still `role:"owner"`+`staffType:"trainer"` in seed data | `src/lib/auth.ts:306,893`, `:78-95` | Resolved |
| A3 | ~~Notification types~~ — **resolved (2026-06-15)** | README lists a fixed set; `src/types/domain.ts` union has 16 | `payment_request_pending`, `payment_request_rejected`, and `data_deletion_request` confirmed present at `domain.ts:438-440` (was added per R6 on 2026-06-05; DISCREPANCIES.md just wasn't updated) | `src/types/domain.ts:435-440` | Resolved |
| A4 | ~~`FIRESTORE_STRUCTURE.md` collection list~~ — **resolved (2026-06-15)** | (root doc, treated as map) | `collections.ts` adds `macroLogs`, `activityLogs`, `packages`, `paymentRequests`, `summaries`, `usernames`, `phones`, `platformSummaries`; `loginAttempts` used but not declared in collections.ts; `ptSessions`/`ptLiftLogs` gym-scoped. All added to `FIRESTORE_STRUCTURE.md` | `collections.ts:1-88` | Resolved |
| A5 | ~~Demo member logins table~~ — **resolved** | README lists `mehulchirania`, `9688227039`, etc. | Matches `demoLogins`, but README omits `aarav`, `meera`, `kabir`, `nisha` which also exist | `src/lib/auth.ts:112-240` | Resolved |

## B. Internal code inconsistencies (potential bugs)

| # | Issue | Detail | Source | Severity |
|---|---|---|---|---|
| B1 | ~~Trainer role can't log in~~ — **resolved** | `toProfile` and the cookie fallback now include `"trainer"` in the accepted-role lists, so a `role:"trainer"` account establishes a session normally | `src/lib/auth.ts:306,893` | Resolved |
| B2 | ~~Lockout key mismatch~~ — **resolved (mitigated)** | On every failure the login flow increments **both** `loginAttempts/{email}` (`auth.ts:813`) and `loginAttempts/{identifier}` (`auth.ts:814`), so the email-keyed doc the `blockLockedAccounts` trigger reads (`functions/src/index.ts:1912`) is maintained. The two-key design is intentional, not a gap. (Separate, untracked limitation: failed *direct-SDK* sign-ins aren't counted — Firebase per-IP throttling is the backstop.) | `src/lib/auth.ts:808-831`, `functions/src/index.ts:1912` | Resolved |
| B3 | ~~Root PT read access too broad~~ — **resolved** | Root `ptSessions`/`ptLiftLogs` now restrict members to their own data (`resource.data.memberId == memberId()`); gym-scoped path likewise. No cross-member read remains | `firestore.rules` root `ptSessions`/`ptLiftLogs` member clause; gym-scoped `:252,261` | Resolved |
| B4 | ~~macroLogs/activityLogs root mirror has no rules~~ — **resolved** | Explicit root `match` blocks added for `macroLogs`, `activityLogs`, and `memberships`, scoped like root `liftLogs` (admin/owner/member-self; `memberships` writes `allow:false`). Also fixed root `exerciseRequests`, which was readable/creatable by any `signedIn()` user across tenants — now `isGymUser(gymId)`-scoped | `firestore.rules` root `macroLogs`/`activityLogs`/`memberships`/`exerciseRequests`; tests in `scripts/test-firestore-rules.mjs` | Resolved |
| B5 | ~~`submitPaymentRequest` notification type~~ — **resolved (2026-06-15)** | Emits `payment_request_pending` (confirmed in union at `domain.ts:438`); icon assigned per R6 resolution | `src/types/domain.ts:438` | Resolved |
| B6 | ~~Action vs CF duplication~~ — **documented (2026-06-15)** | Overlap table present in [04_DATA_ACCESS_CATALOG.md](04_DATA_ACCESS_CATALOG.md) "Action vs Function overlap" section. 15 operations documented with both surfaces. Architectural decision (standardize on one surface) tracked as R5 in [10_REFACTORING_ROADMAP.md](10_REFACTORING_ROADMAP.md) | `docs/04_DATA_ACCESS_CATALOG.md:10-37` | Documented |
| B7 | ~~`computeGymDashboard` 7-day window~~ — **resolved (2026-06-15)** | Both `computeGymDashboard` and `processMembershipExpiries` now read `gymDoc.data().expiryWarningDays ?? 7` per gym instead of a hardcoded constant | `functions/src/index.ts:1606,1688` | Resolved |
| B8 | ~~PT lifecycle actions can't find gym-scoped sessions~~ — **resolved (2026-06-05)** | `startPTSession`/`complete`/`cancel`/`reschedule` looked sessions up only in the **root** `ptSessions` collection and threw "PT session not found." for sessions that exist only in the **gym-scoped** path (where the UI lists from). Now `loadPTSessionForWrite` resolves gym-scoped → root and updates only existing copies | `actions/pt.ts` `loadPTSessionForWrite` | Resolved |

## C. Declared-but-unused / orphaned

| # | Item | Status | Source |
|---|---|---|---|
| C1 | ~~`workoutSplitTemplates` collection~~ | Resolved 2026-06-29: collection declarations were already gone; orphaned Firestore rule blocks removed. Split logic lives in `src/lib/split-library.ts` / `workouts.json`. | `firestore.rules` |
| C2 | `siteLinks` writes | Read by `getSiteLinks` and rules allow owner/admin write, but no write call site found (seeded/manual) | `read-models/misc.ts:6` |
| C3 | root `memberships` key | Declared at root (`collections.ts:9`) but active path is gym-scoped only | `collections.ts:9` vs `:59` |
| C4 | `profiles` (legacy) | Read-only fallback; no active writes | `firestore.rules:325` |
| C5 | Several Cloud Functions | `createTrainer`, `assignTrainerToPTMember`, `updateTrainerVisibility`, `activateOrRenewMembership`, `generate*DashboardStats` — callable wrappers exist (`functions.ts`) but UI wiring not confirmed in this pass | `src/lib/firebase/functions.ts:345-391` |

## D. Verified accurate (README claims confirmed)

- Business data has no REST-style `/api` surface. The only route handler is `/api/health`
  (`src/app/api/health/route.ts`) for GET/HEAD service health checks. ✅
- Privileged writes `allow:false` for members/staff/programAssignments/etc. ✅ (`firestore.rules`)
- App Hosting config 0–10 inst / 512 MB / 80 concurrency — ✅ (`apphosting.yaml:3-8`).
- Login lockout 5/15min, session 2h — ✅ (`src/lib/auth.ts:509-510,19`).
- Vitest present — ✅ (`vitest.config.ts`) but only 2 test files exist.
- Region `asia-south1` — ✅ (`functions/src/index.ts:20`).

## E. Previously uninspected — now verified (2026-06-15)

- **`next.config.mjs` + `src/proxy.ts`**: static security headers are in `next.config.mjs`; the per-request nonce CSP and role redirects are in `src/proxy.ts`. Build-time TypeScript and ESLint checks are enabled. Sentry + bundle analyzer wrapped.
- **`src/lib/split-library.ts`** and **`src/lib/workout-utils.ts`**: Fully read. See `project_architecture.md` "Split library" section.
- **Service worker / PWA manifest**: Manifest at `public/manifest.json?v=11` referenced in layout. Icons at `?v=11`. PWA is installable.
- **Seed/migration scripts**: `npm run migrate:tenant-cleanup` and `npm run migrate:gym-scoped` exist per `FIRESTORE_STRUCTURE.md`. Not re-read in this pass; scope of these scripts is documented there.
