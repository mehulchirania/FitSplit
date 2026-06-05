# 08 · BUSINESS RULES (Tier 1)

`Generated: 2026-06-05 · Commit: c0e1f4b`

> Every business rule traceable to code. Columns: Rule | Source `file:line` | Impact.

## Authentication & sessions

| Rule | Source | Impact |
|---|---|---|
| Short session = 2 hours | `src/lib/auth.ts:19` | default cookie lifetime |
| "Remember me" session = 14 days (Firebase max) | `src/lib/auth.ts:20` | extended cookie |
| Login lockout after 5 failed attempts | `src/lib/auth.ts:509` | brute-force protection |
| Lockout duration = 15 minutes | `src/lib/auth.ts:510` | |
| Email login is completely disabled | `src/lib/auth.ts:592-647` | Only username or phone are allowed |
| Dual lockout: profile-embedded (by synthetic email) + identifier-based (by phone/username) | `src/lib/auth.ts:528-609` | phone/username attacks gated before synthetic email resolution |
| Blocking trigger re-checks lockout at Auth layer (keyed by synthetic email) | `functions/src/index.ts:1905-1935` | gates direct SDK sign-in; fails open on error |
| Firebase sign-in REST timeout = 10 s | `src/lib/auth.ts:824` | server action can't hang |
| New staff forced to change password on first login (`mustChangePassword`) | `actions/staff.ts:135`, `src/lib/auth.ts:972-978` | redirect to `/profile?forceChange=1` |
| `requireOwner` blocks staff whose `staffType !== "owner"` from owner actions | `src/lib/auth.ts:991` | trainers can't do destructive owner ops |
| Member Firebase password format = `pin-<4digits>` | `src/lib/auth.ts:812`, `actions/members.ts:74` | PIN auth |
| Inactive/missing profile → redirect `/suspended` | `src/lib/auth.ts:935-943` | access revocation |

## Validation

| Rule | Source | Impact |
|---|---|---|
| Username = 3–32 chars `[a-z0-9._-]`, normalized lowercase | `actions/shared.ts:58-66` | uniqueness key |
| Username uniqueness reserved atomically in a transaction | `actions/members.ts:114-148` | prevents race dup |
| PIN = exactly 4 numeric digits | `actions/shared.ts:52` | |
| Phone = `(+91)?[6-9]\d{9}` | `actions/shared.ts:45-50` | India format |
| Staff password ≥ 6 chars | `actions/staff.ts:41`, `functions/src/index.ts:736` | |
| Gym logo must be PNG ≤ 900 KB | `actions/shared.ts:89-100` | storage guard |
| Contact message body ≥ 10 chars | `actions/contact.ts:55` | |
| Coach note ≤ 600 chars | `actions/progress.ts:219` | |
| Body weight 10–500 kg; body fat 1–70% | `actions/progress.ts:40-42` | |
| Macros 0–2000 each; water 0–30 L | `actions/progress.ts:369-372` | |

## Programs

| Rule | Source | Impact |
|---|---|---|
| Assigning a program cancels the member's prior active assignment | `actions/programs.ts:116-132` | one active program per member |
| Heuristic program pick by goal keyword (strength/fat/muscle) | `actions/programs.ts:47-75` | "generate & assign" without AI |
| Custom program must have ≥ 1 day and ≥ 1 exercise | `actions/programs.ts:363,464,580-583` | |
| Default sets/reps/rest = 3 / "8-12" / 75s | `actions/programs.ts:443,492-494` | |
| Predefined programs filtered to those with exercises | `read-models/programs.ts:20-24` | hides empty templates |

## Workout & attendance

| Rule | Source | Impact |
|---|---|---|
| Geofence default radius = 150 m | `actions/shared.ts:452-454` | check-in gate |
| Check-in blocked if distance > radius | `actions/shared.ts:470-472` | |
| Geofence status `inside` / `not_configured` / `location_not_provided` | `actions/shared.ts:461-477` | recorded on attendance |
| Geofence requires valid lat/lng or throws | `actions/shared.ts:456-458` | |
| dayLog id deterministic `memberId_dayId_weekStart` (upsert) | `actions/progress.ts:299`, `src/types/domain.ts:571-590` | one record per week slot |
| macroLog id deterministic `memberId_date` (upsert) | `actions/progress.ts:395` | one per day |
| Members can only act on their own data (`assertCanManageMember`) | `actions/shared.ts:497-504` | self-scope |
| Owner actions verify member belongs to caller's gym | `actions/shared.ts:515-536` | tenant guard |

## Personal training

| Rule | Source | Impact |
|---|---|---|
| Default PT plan duration = 30 days | `actions/pt.ts:32`, `functions/src/index.ts:922` | |
| PT plan duration bounds 1–365 days | `actions/pt.ts:28-33`, `functions/src/index.ts:929` | |
| PT plan end date = start + duration − 1 | `actions/pt.ts:80-82`, `functions/src/index.ts:943-945` | inclusive range |
| PT scheduledAt fixed to `T06:00:00` of start date | `actions/pt.ts:63`, `functions/src/index.ts:954` | |
| PT plan must have ≥ 1 planned exercise | `actions/pt.ts:74`, `functions/src/index.ts:932` | |
| PT lift logs dual-written to `liftLogs` with `source:"trainer"` | `actions/pt.ts:252-269` | member history includes PT sets |
| Lift can only be logged on an active session | `actions/pt.ts:227` | |
| Any gym staff can start/cover any session (trainer-NA cover) | `actions/shared.ts:564-569`, `actions/pt.ts:157` | |
| PT reminders sent at ~24h and ~1h (±10 min window) | `functions/src/index.ts:1770-1786` | once each via `notified24h/1h` |
| Abandoned PT session auto-cancelled after 6h active | `functions/src/index.ts:1862` | runs 02:00 IST |
| Reschedule resets `notified24h/1h` flags | `actions/pt.ts:470-472` | re-notify |
| Reschedule duration bounds 15–240 min | `actions/pt.ts:481` | |

## Billing & membership

| Rule | Source | Impact |
|---|---|---|
| Package duration 1–24 months | `actions/billing.ts:20`, `functions/src/index.ts:1390` | |
| One pending payment request per member+package | `actions/member-billing.ts:39-47` | dup guard |
| Approval creates Membership (end = start + durationMonths) | `actions/billing.ts:107-119`, `functions/src/index.ts:1487-1502` | |
| Approval denormalises status/endDate/packageName onto member + authProfiles | `actions/billing.ts:121-129`, `functions/src/index.ts:1508-1510` | fast list filtering |
| Membership expiry warning default = 7 days | `actions/gyms.ts:151`, `read-models/shared.ts:113` | gym setting |
| Daily expiry sweep flips `expiring_soon`/`expired`, notifies once per transition | `functions/src/index.ts:1688-1748` | uses fixed 7-day window |
| Card/UPI is integration-ready placeholder; does not auto-activate | `src/types/domain.ts:193-196` | manual owner confirm |
| Trainers have no access to billing collections | `firestore.rules:272,281,294` | |

## Catalog / exercises

| Rule | Source | Impact |
|---|---|---|
| Admin creates global exercises (`gymId:"global"`, scope `default`); owner creates gym custom | `actions/exercises.ts:255-275` | |
| Owners cannot edit a default (global) exercise — must add gym custom | `actions/exercises.ts:322-324` | |
| Gym custom exercise overrides global by name (read-model dedup) | `read-models/exercises.ts:96-104` | |
| Exercise tutorial visible by default (`showTutorial !== false`) | `read-models/exercises.ts:84` | owner can hide |
| Approving a request creates a catalog exercise (`ownerOnly:true`) | `actions/exercises.ts:134-155` | |

## Lifecycle / retention

| Rule | Source | Impact |
|---|---|---|
| Deletes archive a snapshot before hard delete | `actions/shared.ts:235-281`, `functions/src/index.ts:285-311` | recoverable |
| Archive retention = 60 days | `actions/shared.ts:231-233`, `functions/src/index.ts:281-283` | |
| Expired archives purged daily | `functions/src/index.ts:1752` | |
| Primary gym `shg` cannot be deleted | `actions/gyms.ts:332`, `functions/src/index.ts:1157` | protected tenant |
| Gym delete blocked while profiles still assigned (simple delete path) | `actions/gyms.ts:336-344` | |
| Member delete cascades program/lift/notif/session/attendance + Auth user | `actions/members.ts:753-822`, `functions/src/index.ts:1102-1128` | |
| Concurrent member-delete guarded by `isDeleted` flag in txn | `actions/members.ts:735-746` | race guard |
| Batched deletes chunk at 450/450 | `actions/shared.ts:287`, `functions/src/index.ts:314` | Firestore batch limit |

## Caching

| Rule | Source | Impact |
|---|---|---|
| Reads cached with tags `gym:{gymId}:{collection}` | `read-models/shared.ts:147-150` | |
| Cache revalidate windows: members/staff 60s, programs 120s, exercises 300s, pt 15–30s, summaries 120s | `read-models/*.ts` (per `unstable_cache` opts) | freshness vs cost |
| Writes bust only touched collection tags | `actions/shared.ts:195-216` | scoped invalidation |

## Seeded constants

| Constant | Value | Source |
|---|---|---|
| Primary gym id | `shg` | `collections.ts:68` |
| Primary owner id | `santosh-shg` | `collections.ts:69` |
| Functions region | `asia-south1` | `functions/src/index.ts:20` |
| Member auth email domain | `@members.fitsplit.app` | `actions/shared.ts:103` |
| Staff auth email domain | `@staff.fitsplit.app` | `actions/staff.ts:102` |
| Demo staff password / member PIN | `password` / `1234` | `src/lib/auth.ts:685` |
