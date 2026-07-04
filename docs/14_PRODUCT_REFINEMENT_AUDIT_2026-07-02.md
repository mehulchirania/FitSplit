# 14 - Product Refinement Audit (Tier 2)

`Generated: 2026-07-02`

> **Purpose.** This is a point-in-time product, UI, and architecture refinement audit.
> It captures verified findings from the July 2026 review pass and should be treated
> as backlog guidance, not as a replacement for code-level verification. As always,
> code is the ground truth where docs and implementation disagree.

## 1. Executive Summary

FitSplit's backend is in genuinely good shape. The June audit cycle was real work,
verified in code: dual-writes were removed from hot paths, Cloud Function duplication
was eliminated, `requireRole` is enforced consistently, typecheck passes, and the
Firestore rules suite is green.

The main problem is that the UI layer silently detached from the backend during
redesign churn. Several end-to-end flows are broken because the components that
called them were deleted while their actions, readers, charts, and docs remained.
The most serious example is attendance: no current UI can start a workout session
or record attendance, yet owner dashboards still render attendance trends from the
now-dead session collection.

The second problem is the landing page. It was rewritten multiple times in late
June, leaving a mix of shadcn/Tailwind debris, inline styles, hardcoded colors, and
non-compliant interaction patterns. The current app now contains three styling
generations: the live prefixed CSS system, the abandoned shadcn/Tailwind layer, and
the inline-style landing page.

Docs and generated memory lag reality. In particular, `docs/11_KNOWN_ISSUES_AND_GAPS.md`
previously said there were no high-priority bugs, which is no longer accurate for
product flows that have live readers but no live writers.

## 2. Product Direction

The core product is operational software for an Indian independent gym expanding to
a small number of gyms: owners run membership, billing, programs, and trainers;
members log lifts and see progress; trainers run PT sessions.

Protect the loop that works today:

1. Assign program.
2. Member logs lifts offline-capably.
3. Progress charts update.
4. Membership renewal and owner operations stay informed.

Focus now on loop integrity: truthful attendance, day completion, cash billing, and
the mobile member logging experience. Avoid B2C expansion, Stripe/UPI production
payments, further landing rewrites, or decorative visual work until the owner
attendance chart reflects real data.

## 3. Feature Inventory

| Feature | Role | Current status | Verdict | Priority | Evidence / notes |
|---|---|---|---|---|---|
| Auth, lockout, sessions | All | Working | Keep | - | Landing login wires to `loginWithCredentials`; session claims optimization landed 2026-06-29. |
| Role routing and guards | All | Working | Keep | - | `requireRole`, `src/proxy.ts`, and page guards remain consistent. |
| Lift logging and offline sync | Member | Working | Keep | - | `logLiftSet`, `syncOfflineLifts`, and Dexie are wired through the member progress panel. |
| Body weight and macro logging | Member | Working | Keep | - | Body weight and macro panels are wired. |
| Workout sessions and attendance | Member -> Owner | Broken / orphaned | Fix or remove | P0 | `startWorkoutSession` and `endWorkoutSession` have no current UI call sites; owner charts read the resulting dead collection. |
| Day status and makeup days | Member | Working | Keep | - | Resolved 2026-07-03: `FocusedDayView` now writes `completed`, `skipped`, and `modified` day-log states; history and calendar read the completed state. |
| Wellness/activity logging | Member | Broken / orphaned | Remove or fix | P1 | `logActivity` has no live writer UI. |
| Contact/enquiry to admin inbox | Public -> Admin | Broken E2E | Fix or remove | P1 | Landing enquiry form was removed while inbox/actions remain. |
| Geofenced attendance | Member | Double-dead | Defer | P2 | No caller, and no gym coordinates configured. |
| Packages, payment requests, cash billing | Owner, Member | Working | Keep | - | Approval flow and expiry function are intact. |
| Card/UPI payments | Member | Mock-only | Defer | - | Intentionally out of scope. |
| Programs and split library | Owner, Member | Working | Keep | - | Assignment flow and batching are present. |
| Exercise catalog and requests | Owner, Admin | Working | Keep | - | Request/approval and dedupe work landed in June. |
| PT booking, sessions, live console | Trainer, Member | Working | Keep | - | PT booking and trainer console pages exist. |
| Notifications and FCM | All | Working | Keep | - | FCM topic subscription exists; broadcast UI remains future work. |
| Progress charts | Member, Owner | Working | Keep | - | Pagination landed 2026-06-29. |
| Landing page | Public | Working but non-compliant | Simplify | P0 | Large client component, inline styles, hardcoded colors, `force-dynamic`, and decorative Three.js. |
| shadcn/ui component set | None | Orphaned | Remove or adopt | P0 | Components and helpers appear to be abandoned debris from the 2026-06-28 landing rewrite. |
| Admin inbox | Admin | Zombie | Remove or fix | P1 | Reads `contactMessages` that the current public UI cannot create. |
| Trainer workspace | Trainer | Partial/thin | Improve later | P2 | Functional but light compared with owner/member roles. |
| DSAR export, archives, T&C gate | Member, Admin | Working | Keep | - | No contrary evidence from this audit. |

## 4. Broken / Incomplete Features

### 4.1 Attendance and workout sessions (P0)

No UI calls `startWorkoutSession` or `endWorkoutSession`, so `workoutSessions` and
`attendanceRecords` receive no new documents. The owner dashboard attendance trend
can therefore show zeros or stale seed data while appearing functional.

Minimal fix: add Start workout / Finish workout controls to the member day view and
wire them to the existing actions.

Preferred fix: upsert a deterministic daily session as a side effect of the first
`logLiftSet` of the day. This makes attendance reflect actual behavior instead of
requiring a separate button members may forget.

Relevant areas:

- `src/lib/firebase/actions/progress.ts`
- `src/components/focused-day-view.tsx`
- `src/lib/firebase/read-models/sessions.ts`
- `src/app/owner/page.tsx`

### 4.2 Day completion and makeup days (resolved 2026-07-03)

`FocusedDayView` now writes first-class `completed`, `skipped`, and `modified`
day-log states through the existing deterministic `logDayStatus` / `clearDayLog`
path. Member history and the workout calendar now read the completed state. Lift
logs still also count as trained days, so explicit completion and actual lift
logging both feed the member progress surfaces.

### 4.3 Contact/enquiry pipeline (P1)

The contact flow is dead at both ends. The landing page no longer contains an enquiry
form, and `/admin/inbox` can display messages but has no complete live creation path.

Recommendation: restore a small enquiry form on the landing page and wire mark-read
in the admin inbox. For a B2B product courting gym owners, lead capture is worth
keeping because the backend already exists.

### 4.4 Wellness/activity logging (P1)

`logActivity` is orphaned and the activity/wellness history affordances no longer
have a complete writer path. This is the least core broken flow. Remove it unless
members explicitly need cardio/stretch logging now.

### 4.5 Landing page compliance (P0/P1)

The landing page currently has inline authoring, hardcoded brand colors, native
`window.confirm` / `window.alert` flows, a too-small modal close target, and
`force-dynamic` on a public page that should be static if possible.

Recommendation: do not rewrite the landing page from scratch again. Extract styles
incrementally into the existing prefixed CSS system, fix target sizes and dialogs,
then decide whether the Three.js effect is worth the dependency.

## 5. Remove or Disable

| Item | Reason | Risk | Action |
|---|---|---|---|
| `src/components/ui/*`, `src/lib/utils.ts`, `src/lib/landing-mock.ts` | Orphaned shadcn debris | Low if zero importers confirmed | Delete after one final import sweep. |
| Unused deps: `class-variance-authority`, `clsx`, `lucide-react`, `radix-ui`, `tailwind-merge` | Confirmed unused in audit context | Low | Uninstall if still unused. |
| Tailwind pipeline and `shadcn.css` import | Served the abandoned shadcn layer | Low after utility-class grep | Remove if no live Tailwind classes remain. |
| `three` and `@types/three` | Decorative hero effect only | Product call | Remove, or at least move `@types/three` to devDependencies. |
| `logActivity` flow | Orphaned and least core | Low | Remove unless re-wiring is planned. |
| `/admin/inbox` and contact actions | Zombie if enquiry form is not restored | Medium | Decide with contact pipeline. |
| `landing.css` unused sections | Landing no longer uses many old classes | Medium | Prune after selector verification. |
| Unused icon/skeleton/form exports | Dead export surface | Low | Prune after in-file usage checks. |
| Long-standing fallback ambiguities | Declared-but-unused legacy paths | Low | Fold into fallback-removal pass. |

## 6. Features Worth Adding

| Feature | Why | Complexity | Priority | Required changes |
|---|---|---|---|---|
| Implicit attendance from lift logging | Restores owner attendance truth without extra member UI | Low-medium | Now | `logLiftSet` upserts daily session/attendance docs. |
| Landing enquiry form to admin inbox | Restores lead capture | Low | Now | One public form plus inbox mark-read wiring. |
| Offline lift sync-status audit | Project standard requires visible pending/synced/failed states | Low | Next | UI verification. |
| Owner data freshness cues | Builds trust in dashboards and member lists | Medium | Next | Last check-in/payment fields and UI. |
| Broadcast notification UI | FCM topics are already in place | Medium | Later | Owner form/action for `gym-{gymId}` topic. |

## 7. Role-Based Flow Review

Owner has the strongest experience: dashboard, members, billing, packages, programs,
trainers, training, reports, notifications, and settings. The main issue is that
attendance data feeding owner views is stale or dead.

Admin is functional but the inbox is a zombie until the contact flow is restored.
Admin also still leans on single-gym assumptions that are fine for the pilot and
should be revisited before multi-gym scale.

Trainer is the thinnest role. Trainers can see members and run PT sessions, but they
do not yet have a strong dashboard for their day or schedule. This is a second-phase
investment once the owner/member loop is fixed.

Member is the core loop and mostly healthy. The regression is that the current day
view can show exercises and log lifts, but workout completion, skip, makeup, and
attendance affordances disappeared.

## 8. Data Model / Firestore Review

The June audits put the data layer in strong shape: gym-scoped collections are
canonical, hot writes are single-path, progress reads are paginated, and security
rules remain consistent.

Remaining issues:

1. Write-orphaned collections: `workoutSessions`, `attendanceRecords`, `dayLogs`,
   `activityLogs`, and `contactMessages` have readers but incomplete or missing
   current writer paths.
2. Root fallback double-reads remain until legacy root data is backfilled or archived.
3. `getAdminNotifications` still needs scoping to avoid broad collectionGroup scans.
4. Composite indexes should be verified against deployed pagination queries.
5. The single-gym member model is a known B2B2C gap and should stay deferred.
6. CSP hardening remains constrained by the current landing page style approach.

## 9. UI/UX Refinement Review

Screens needing the most polish:

1. Landing page: inline styles, hardcoded colors, small targets, native dialogs, and
   dead footer links.
2. Member day view: missing completion and attendance affordances.
3. Member history: can render stale data with weak staleness/empty states.
4. Admin inbox: zombie until contact is restored or removed.

The project should standardize on the existing prefixed CSS system. It is already
documented and live across the app. The shadcn/Tailwind layer should either be fully
adopted or removed, and the current audit recommends removal.

## 10. Technical Architecture Review

The architecture is sound: actions/read-models/types separation is consistent, the
`success()` / `failure()` envelope is universal, and guard/validation helpers are
central. The main risk is process: unused code and orphaned actions were detectable
through `knip`, but not enforced as a blocking gate.

Recommended process changes:

- Promote unused files and unused dependencies to CI failures.
- Add action-level tests for billing approval and membership expiry math.
- Finish pruning remaining callable wrappers that have no UI wiring.
- Keep docs and handoff updates paired with significant UI rewrites.

## 11. Prioritized Roadmap

### Immediate Fixes

1. Restore attendance with implicit session/attendance upsert from lift logging, or
   explicit Start/Finish controls.
2. ~~Restore day completion with Done/Skip, or derive Done from lift logs.~~ Done 2026-07-03.
3. Restore the contact/enquiry flow or delete the pipeline as a unit.
4. Delete shadcn/Tailwind debris and unused dependencies after verification.
5. Update handoff/docs and rebuild graphify after the cleanup.

### MVP Refinement

1. Incrementally clean landing page styles and dialogs.
2. Verify/deploy composite indexes needed for paginated queries.
3. Wire inbox/history empty states and mark-read behavior.
4. Add action-level tests for billing and membership expiry.

### Next Phase

1. Backfill/archive legacy root data, then remove read fallbacks collection by collection.
2. Scope admin notifications to gym.
3. Build a trainer dashboard.
4. Add geofence coordinates for the SHG gym only after attendance writers are restored.

### Later / Optional

Owner broadcast UI, member multi-gym affiliation, production Card/UPI payments, and
B2C expansion all remain correctly parked.

## 12. File-Level Action Plan

| File/folder | Problem | Action | Priority |
|---|---|---|---|
| `src/components/ui/`, `src/lib/utils.ts`, `src/lib/landing-mock.ts` | Orphaned shadcn debris | Delete after import sweep | P0 |
| `package.json` | Unused deps and `three` decision | Uninstall or reposition deps | P0 |
| `src/app/layout.tsx`, `postcss.config.mjs`, `components.json`, `src/app/styles/shadcn.css` | Tailwind pipeline likely dead | Remove after utility-class grep | P0 |
| `src/lib/firebase/actions/progress.ts`, `src/components/focused-day-view.tsx` | Day completion was partial | Completed 2026-07-03: first-class done/skip/modified day logs | - |
| `src/lib/firebase/read-models/sessions.ts`, `src/app/owner/page.tsx` | Chart over dead collection | Fix through attendance restoration and add empty-state | P0 |
| `src/lib/firebase/actions/contact.ts`, `src/components/admin-inbox-client.tsx`, landing page | Dead contact E2E flow | Restore form and mark-read, or delete | P1 |
| `src/components/landing-page-client.tsx`, `src/app/landing.css`, `src/app/page.tsx` | Landing compliance issues | Incremental cleanup | P1 |
| `src/lib/firebase/functions.ts` | Remaining callable wrapper cleanup | Delete only where truly dead | P1 |
| `src/components/icons.tsx`, `src/components/skeletons.tsx` | Unused exports | Prune | P2 |
| `firestore.indexes.json` | Possible missing composite indexes | Verify against deployed project | P1 |
| `docs/11_KNOWN_ISSUES_AND_GAPS.md`, `README.md`, `PROJECT_HANDOFF.md` | Stale vs this audit | Re-sync | P1 |
| `graphify-out/` | Stale graph snapshot | Rebuild after P0 cleanup | P2 |

## 13. Final Recommendation

The project does not need a rebuild. The backend is disciplined, the security pattern
is consistent, and the core member logging loop works. What it needs is a
reconnection-and-deletion sprint:

1. Delete verified unused shadcn/Tailwind debris and add unused-files/deps checks to CI.
2. Restore attendance truthfully through lift logging or explicit controls.
3. ~~Restore day completion on the focused day view, preferably by deriving completion
   from logged sets and keeping skip as manual input.~~ Done 2026-07-03.
4. Restore the contact pipeline, or delete it as a unit.
5. Re-sync docs and rebuild the graph so future sessions do not reason from stale
   deleted components.

Method note: memory and graph output were used as leads, not truth. Findings should
still be verified against the current working tree before implementation.

---

## UI Walkthrough Review (2026-07-02, evening pass)

All four roles were exercised in a live browser session (owner `santosh-shg`, member
`mehulchirania`, admin, trainer `shg-trainer-1`) at desktop, 1024px, and 375px.
Findings below were measured in the running app, not inferred from code. Fix status
is updated in place as items land.

### Verified defects

| # | Finding | Root cause / evidence | Fix | Status |
|---|---|---|---|---|
| U1 | Every native radio/checkbox renders full-width (membership package radio measured 594×44px; label crushed to 68px and clipped) | `02-shared-components.css:504` and `03-visual-refresh.css:589` apply `width:100%; min-height:40-44px; padding` to bare `input` | Add `input[type=radio], input[type=checkbox] { width:auto; min-height:0; padding:0 }` reset after the global rules | **Fixed 2026-07-02** |
| U2 | Trainer accounts (`role:owner` + `staffType:trainer`) land on `/owner` with full owner nav; can view Billing revenue, Reports, and Gym settings; Approve buttons render but fail server-side | Pages guard with `requireRole(["admin","owner"])` only; routing keys off `role` so `/trainer` is unreachable for them | Redirect `staffType` non-owners off money pages; hide Billing/Reports/Packages/Gym profile in owner sidebar for trainers | **Fixed 2026-07-02** |
| U3 | Member dashboard "Today's session" rows: exercise name overlaps the SETS × REPS column | `.m3d-ex__body` computes to 0 width; name overflows into sibling | `flex:1; min-width:0` + ellipsis on name | **Fixed 2026-07-02** |
| U4 | `/owner/training` sessions table: actions column clipped and unclickable at ≤1060px | Table 931px inside 746px wrapper with `overflow-x:hidden` | `overflow-x:auto` on wrapper | **Fixed 2026-07-02** |
| U5 | Member membership page shows green "Active" badge directly above red "Expired on 1 Jul 2026" | Badge trusts persisted `membershipStatus` even when `expiresAt` is in the past | Derive badge from expiry when it disagrees | **Fixed 2026-07-02** |
| U6 | Owner members action queue shows "Expiring · In -24d" | Negative remaining days not handled in copy | "Expired 24d ago" + expired styling | **Fixed 2026-07-02** |
| U7 | Owner mobile: Renew/Approve buttons 30px tall, "All actions →" 74×18 — under the 44px rule; visible scrollbar on Today/People/Money tab strip | odp2 button sizing; default scrollbar on overflow-x strip | 44px min targets at mobile; hide strip scrollbar | **Fixed 2026-07-02** |
| U8 | Admin inbox cannot mark messages read — first real enquiry stays "unread" forever | `markContactMessageRead` orphaned (no call site) | Wire mark-read control in `admin-inbox-client.tsx` | **Fixed 2026-07-02** |
| U9 | Dashboard "Start workout" was localStorage-only theater (toast claimed "streak is active", nothing persisted) while attendance now accrues from lift logging | `handleToggleWorkout` in `member-coach-shell.tsx` never called a persisted action | Replace the fake start/stop state with an "Open workout" link to the focused day view where lift logs and day status are persisted | **Resolved 2026-07-03** — toggle removed; attendance is now implicit (logLiftSet/syncOfflineLifts upsert workoutSessions + attendanceRecords) |
| U10 | App typography was split-brained: body declared literal "Inter" (only matched locally-installed copies → Segoe UI for most users) and the member shell hardcoded an -apple-system stack; the next/font-loaded Inter/DM Sans variables were unused outside the landing page | `00-base-shell.css` body font; `21-member-redesign.css:8,2268`; `06-programs-mobile-legacy-landing.css:711` | Body + shells now lead with `var(--font-inter)`; `h1–h4` use `var(--font-dm-sans)` display stack matching the landing | **Fixed 2026-07-03** |
| U11 | No enter transitions on tab switches / page navigations in owner, admin, and member shells | No animation rules on `.odp2-scroll` / `.m3d-content` children | 240ms opacity+lift enter animation, `prefers-reduced-motion` gated, no persistent transform | **Fixed 2026-07-03** |

### Polish items (lower priority)

- T&C consent dialog: accept button was plain gray, not brand-styled — **fixed 2026-07-02**.
- Admin gyms page offers "+ Add gym" and a text blurb pointing to the overview form for the same task — keep one.
- Member profile "Fitness goals — Not set" is dead text; should be a "Set goals" affordance.
- Owner reports "Training Activity 0 sessions" should now be checked against real lift-log attendance writes.

### What is already good

Owner workspace (action-queue dashboard, billing KPI/filter/list, PT filters + calendar
toggle), admin console, and the member m3d shell are coherent and consistent. Empty
states are designed. The defects above are point failures inside a solid system.
