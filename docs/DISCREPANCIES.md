# DISCREPANCIES (Meta)

`Generated: 2026-06-05 · Commit: a0be3a8`

> Every place the legacy `README.md` / `FIRESTORE_STRUCTURE.md` disagree with code, plus
> dead/orphaned references and internal inconsistencies. **Code wins.** Severity is the doc
> author's assessment, not a code label.

## A. README / docs vs code

| # | Topic | README/docs say | Code says | Source | Severity |
|---|---|---|---|---|---|
| A1 | CSS file count | "21 modular CSS files" + lists `forms.css`, `member.css` | `src/app/styles/` also contains **`ep-modal.css`** (undocumented), and two `11-` files (`11-bulk-member-list.css`, `11-member-tabs.css`) | `ls src/app/styles/` | Low |
| A2 | ~~Trainer role~~ — **resolved** | "trainer (staffType)" + first-class `trainer` role in rules/middleware | Session layer now accepts role `trainer` (`toProfile`/cookie fallback `src/lib/auth.ts:306,893`). Demo trainers are still `role:"owner"`+`staffType:"trainer"` in seed data | `src/lib/auth.ts:306,893`, `:78-95` | Resolved |
| A3 | Notification types | README lists a fixed set; `src/types/domain.ts` union has 16 | Billing code emits `payment_request_pending` / `payment_request_rejected` not in the union | `actions/member-billing.ts:70`, `actions/billing.ts:171`, vs `src/types/domain.ts:352-368` | Medium |
| A4 | `FIRESTORE_STRUCTURE.md` collection list | (root doc, treated as map) | `collections.ts` adds `macroLogs`, `activityLogs`, `packages`, `paymentRequests`, `summaries`, `usernames`, `platformSummaries`; `loginAttempts` used but not declared | `collections.ts:1-64`, `src/lib/auth.ts:575` | Medium |
| A5 | Demo member logins table | README lists `mehulchirania`, `9688227039`, etc. | Matches `demoLogins`, but README omits `aarav`, `meera`, `kabir`, `nisha` which also exist | `src/lib/auth.ts:112-240` | Low |

## B. Internal code inconsistencies (potential bugs)

| # | Issue | Detail | Source | Severity |
|---|---|---|---|---|
| B1 | ~~Trainer role can't log in~~ — **resolved** | `toProfile` and the cookie fallback now include `"trainer"` in the accepted-role lists, so a `role:"trainer"` account establishes a session normally | `src/lib/auth.ts:306,893` | Resolved |
| B2 | ~~Lockout key mismatch~~ — **resolved (mitigated)** | On every failure the login flow increments **both** `loginAttempts/{email}` (`auth.ts:813`) and `loginAttempts/{identifier}` (`auth.ts:814`), so the email-keyed doc the `blockLockedAccounts` trigger reads (`functions/src/index.ts:1912`) is maintained. The two-key design is intentional, not a gap. (Separate, untracked limitation: failed *direct-SDK* sign-ins aren't counted — Firebase per-IP throttling is the backstop.) | `src/lib/auth.ts:808-831`, `functions/src/index.ts:1912` | Resolved |
| B3 | ~~Root PT read access too broad~~ — **resolved** | Root `ptSessions`/`ptLiftLogs` now restrict members to their own data (`resource.data.memberId == memberId()`); gym-scoped path likewise. No cross-member read remains | `firestore.rules` root `ptSessions`/`ptLiftLogs` member clause; gym-scoped `:252,261` | Resolved |
| B4 | ~~macroLogs/activityLogs root mirror has no rules~~ — **resolved** | Explicit root `match` blocks added for `macroLogs`, `activityLogs`, and `memberships`, scoped like root `liftLogs` (admin/owner/member-self; `memberships` writes `allow:false`). Also fixed root `exerciseRequests`, which was readable/creatable by any `signedIn()` user across tenants — now `isGymUser(gymId)`-scoped | `firestore.rules` root `macroLogs`/`activityLogs`/`memberships`/`exerciseRequests`; tests in `scripts/test-firestore-rules.mjs` | Resolved |
| B5 | `submitPaymentRequest` notification type | Emits `payment_request_pending` (not in `Notification.type` union); read-model maps unknown types verbatim so UI may lack an icon | `actions/member-billing.ts:70`, `read-models/notifications.ts:22` | Low |
| B6 | Action vs CF duplication | Most privileged writes exist as both a Server Action (used) and a Cloud Function (often unused). Drift risk: e.g. CF `assignProgramToMember` uses trigger-based side effects; the action writes them inline | see [04](04_DATA_ACCESS_CATALOG.md) | Medium |
| B7 | `computeGymDashboard` 7-day window | `expiringThisWeek` uses a hardcoded 7-day window, ignoring per-gym `expiryWarningDays` | `functions/src/index.ts:1609,1690` vs `actions/gyms.ts:151` | Low |
| B8 | ~~PT lifecycle actions can't find gym-scoped sessions~~ — **resolved (2026-06-05)** | `startPTSession`/`complete`/`cancel`/`reschedule` looked sessions up only in the **root** `ptSessions` collection and threw "PT session not found." for sessions that exist only in the **gym-scoped** path (where the UI lists from). Now `loadPTSessionForWrite` resolves gym-scoped → root and updates only existing copies | `actions/pt.ts` `loadPTSessionForWrite` | Resolved |

## C. Declared-but-unused / orphaned

| # | Item | Status | Source |
|---|---|---|---|
| C1 | `workoutSplitTemplates` collection | Declared in `collections.ts` + has rules, but no read/write site found; split logic lives in `src/lib/split-library.ts`/`workouts.json` | `collections.ts:14,41`, `firestore.rules:138,338` |
| C2 | `siteLinks` writes | Read by `getSiteLinks` and rules allow owner/admin write, but no write call site found (seeded/manual) | `read-models/misc.ts:6` |
| C3 | root `memberships` key | Declared at root (`collections.ts:9`) but active path is gym-scoped only | `collections.ts:9` vs `:59` |
| C4 | `profiles` (legacy) | Read-only fallback; no active writes | `firestore.rules:325` |
| C5 | Several Cloud Functions | `createTrainer`, `assignTrainerToPTMember`, `updateTrainerVisibility`, `activateOrRenewMembership`, `generate*DashboardStats` — callable wrappers exist (`functions.ts`) but UI wiring not confirmed in this pass | `src/lib/firebase/functions.ts:345-391` |

## D. Verified accurate (README claims confirmed)

- No `/api` routes — confirmed (no route handlers found). ✅
- Privileged writes `allow:false` for members/staff/programAssignments/etc. ✅ (`firestore.rules`)
- App Hosting config 0–10 inst / 512 MB / 80 concurrency — ✅ (`apphosting.yaml:3-8`).
- Login lockout 5/15min, session 2h — ✅ (`src/lib/auth.ts:509-510,19`).
- Vitest present — ✅ (`vitest.config.ts`) but only 2 test files exist.
- Region `asia-south1` — ✅ (`functions/src/index.ts:20`).

## E. Not inspected this pass (verify before relying)

- `next.config.mjs` CSP/security header specifics (existence confirmed; lines not cited).
- Service worker / PWA manifest files.
- `src/lib/split-library.ts`, `src/lib/workout-utils.ts` internals (referenced, not line-cited).
- Seed/migration scripts referenced in README `package.json` scripts.
