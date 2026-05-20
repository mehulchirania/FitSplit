# FitSplit Project Handoff

## Latest Update - 2026-05-20: E2E audit, perf caching, security guards, member features

Full e2e audit + execution batch covering UX bugs, security gaps, member-side features, and performance caching. Detailed analysis recorded below.

### Performance — Firestore caching layer
- `lib/firebase/read-models.ts`: wrapped `getMembers`, `getExerciseCatalog`, `getWorkoutPrograms` in Next.js `unstable_cache` with per-gym tags (`gym:${gymId}`). TTLs: members 60s, programs 120s, exercises 300s. A global `gym-data` tag still works as a fallback for code paths that don't know the gymId.
- `lib/firebase/actions.ts`: `success()` helper now calls `revalidateTag("gym-data")` on every successful mutation, OR `revalidateTag(\`gym:${gymId}\`)` when the gymId is explicitly passed. Coarse but correct — actions can opt into per-gym invalidation by passing their gymId.
- Repeat navigations within the TTL window now serve from RAM instead of hitting Firestore (one of the biggest causes of the "every page takes a lot of time to load" complaint).

### Critical UX bugs fixed
- **Members page filter/sort tabs:** `app/owner/members/page.tsx` used `<a href>` for filter and sort, forcing a full page reload (losing scroll position and selection). Switched to Next.js `<Link>` with `replace` + `scroll={false}`. Each link also got `aria-current="page"` when selected.
- **Main top navigation lacked active state:** `components/main-nav.tsx` now reads `usePathname()` and marks the active link with `aria-current="page"` and `is-active`. CSS rule added in `app/globals.css` (`.topnav a.is-active`) so the user can see which section they're in.
- **Mobile bottom nav lacked active state:** same treatment in `components/mobile-bottom-nav.tsx` + matching `.mobile-bottom-nav a.is-active` styles. Added a "History" tab for members linking to the new `/member/history` page.
- **Program assignment tab-switch loss:** when the owner built half a custom plan and clicked "Pick a plan" they silently lost the work. `ProgramAssignmentForm` now tracks `hasUnsavedCustom` content via an `onContentChange` callback from `BuildCustomForm`, and `window.confirm`s before discarding it.

### Security — cross-gym member action guards
- Added `assertMemberBelongsToCallerGym(user, memberId)` helper in `lib/firebase/actions.ts`. Verifies the target member's `gymId` matches the calling user's gym. Admins bypass, members are still limited to their own ID, owners are blocked from acting on members of another gym.
- Applied to: `assignProgramToMember`, `createAndAssignCustomProgram`, `toggleMemberAccess`, `resetPassword`, `deleteMemberProfile`. Previously these only checked `requireRole(["admin", "owner"])` and trusted whatever memberId came from the form.

### Security — force password change for new staff
- New staff profiles created via `createOwnerProfile` now carry `mustChangePassword: true`. Cleared in `changeStaffPassword` after a successful rotation.
- `AuthenticatedUser` type + `ProfileRecord` shape + `authUserFromProfile` updated to surface the flag.
- `requireRole` redirects staff with the flag set to `/profile?forceChange=1` unless they're already on `/profile`. Path resolution depends on `middleware.ts` now forwarding the current pathname via an `x-pathname` request header (the middleware reuses this for all protected requests, not just the force-change check).
- `/profile` shows a warning banner when `forceChange=1` is in the URL OR the flag is on the current user.

### Member features
- **Workout history page** at `/member/history` — new route. Groups lift logs by calendar day, shows muscle groups trained, PR count, weight × sets × reps per entry, total workouts/sets/volume across all-time. Linked from the mobile bottom nav and from the member dashboard's "Lift logs" stat card.
- **Weekly streak counter** on the member dashboard. Walks back through ISO weeks from the current week and counts consecutive weeks with ≥1 lift log. Grace logic prevents the counter going to 0 on Monday morning before the first set. Displayed as "🔥 N" in the hero summary.
- **"Last time" hint** under the lift log form. Shows `weight × sets × reps` for the most recent log of the selected exercise, plus a PR badge if that lift was the user's all-time max. Updates live when the exercise dropdown changes.
- **Rest timer wired in.** The `RestTimer` component already existed but wasn't rendered anywhere. Now appears below the lift log form in `MemberWorkoutConsole` with 60s/90s/120s presets and an audible beep when the interval expires.

### Component API additions
- `ConfirmActionForm` accepts a `requireConfirmation?: boolean` prop (default true). When false, the form submits immediately without the "are you sure?" modal — useful for non-destructive edits like updating a phone number. Documented inline.

### Performance — N+1 follow-ups
- Renamed internal callers of `getMembers/getExerciseCatalog/getWorkoutPrograms` to the `*Uncached` variants inside `read-models.ts` (`getGymFloorLoadMap` was the only one). External callers (pages, actions) keep using the cached exports.

### Files touched
- `app/globals.css` — active-link CSS for `.topnav` and `.mobile-bottom-nav`; `.lift-log-last-hint` and `.history-day-*` styles
- `app/styles/member.css` — `.md-hero-stat--link` styling
- `app/member/page.tsx` — streak computation + display, "Lift logs" stat now links to /member/history
- `app/member/history/page.tsx` — new route
- `app/owner/members/page.tsx` — `<Link>` for filter/sort with `aria-current`
- `app/owner/members/[memberId]/page.tsx` — passes `catalog` to `ProgramAssignmentForm`
- `app/profile/page.tsx` — forceChange banner on staff/admin variants
- `components/main-nav.tsx` — active state via `usePathname`
- `components/mobile-bottom-nav.tsx` — active state + History tab for members
- `components/member-workout-console.tsx` — RestTimer, last-time hint, selected exercise state
- `components/program-assignment-form.tsx` — tab-switch guard via `onContentChange` callback
- `components/confirm-action-form.tsx` — `requireConfirmation` prop
- `middleware.ts` — forwards `x-pathname` request header
- `lib/auth.ts` — `mustChangePassword` plumbing through ProfileRecord/AuthenticatedUser/authUserFromProfile/toProfile + redirect logic in `requireRole`
- `lib/firebase/actions.ts` — `assertMemberBelongsToCallerGym` helper applied to 5 actions; `mustChangePassword: true` set on staff creation, cleared in `changeStaffPassword`; per-gym revalidateTag in `success()`
- `lib/firebase/read-models.ts` — unstable_cache wrappers with per-gym tags

### Verification
- `npm run typecheck` passes.

### Deferred (recorded in the audit; not shipped this session)
These are scoped and ranked. Each is bounded enough to ship in a future session.

1. **Optimistic lift logging** via `useOptimistic` — would make set logging feel instant. Current impl already does a partial optimistic update via `setLiftLogs(...)` but goes through the action round-trip first. Conversion is medium-risk because of the offline-logs interaction.
2. **Split `globals.css` (~9k lines) and `lib/firebase/actions.ts` (~2.7k lines)** into per-feature files. Pure tech debt but unblocks future UI work. Should be done in one focused session, not piecemeal.
3. **Replace rule-based "AI Semi-Personal Trainer" swap logic** in `MemberWorkoutConsole` with actual Gemini calls through `lib/ai.ts`. Currently it's a hardcoded knee/shoulder/back lookup in `getInjuryRule`. Either rename to "Smart Swaps"/"Recovery Mode" OR wire to a real LLM.
4. **PIN security** — 4-digit PIN is 10,000 combinations. Add a lockout-after-N-failed-attempts counter on the profile doc, OR bump to 6 digits, OR finish OTP-based login (already on the original TODO list).
5. **Body weight / progress log** — add a `bodyMetricLogs` collection with `loggedAt`, `weightKg`, optional `photoUrl`, surface as a chart on `/profile`. Gives members a reason to open the app on off-days.
6. **Trainer notes per session** — quick free-text field a trainer can attach to a member after observing a session, surfaced on the member's next visit.
7. **Member self-report "Today only" injury flag** that auto-triggers the AI swap for that day's session only (no trainer-in-the-loop).
8. **Owner dashboard "Needs attention" lane** — members who haven't logged in 14+ days, declining frequency week-over-week, hitting PRs this week (recognition lever).
9. **Bulk operations** on the members page (multi-select → assign program / suspend / message).
10. **Empty states with primary actions** on `/activity`, `/owner/programs`, `/admin/inbox`. Currently they have copy but no CTA.
11. **Audit log for sensitive actions** — "owner X reset member Y's PIN", "admin Z created staff for gym W". The `activityEvents` collection exists, just isn't used for these flows yet.
12. **Validation consolidation** via zod schemas in actions — current parsing is scattered between `requireText` and inline `String(formData.get(...))`. Standardising would reduce footguns.
13. **`useActionState` consistency** — `AddMemberForm` rolls its own `useTransition + setState`. Convert to match the pattern used by `ConfirmActionForm`.
14. **CSP + security headers** in `next.config.js`. Fiddly with Firebase + Gemini but worth doing once.
15. **Workout templates** ("duplicate Monday onto Wednesday"), exercise variations (band/dumbbell/cable variants), payment/membership tracker (TODO from original handoff).
16. **`getCurrentUser` per-request cache** — only meaningfully wins if multiple components call it independently in one render, which isn't the current pattern.
17. **`Member` + `ProfileMetrics` duality** — same person, two types. Could collapse into a single `MemberProfile` to reduce confusion.
18. **Inline `style={{...}}` cleanup** — large refactor. Extract a `tokens.css` (`--space-xs/sm/md/lg`, `--radius-sm/md`, `--font-xs/sm/base/lg/xl`) and replace inline values progressively.

---

## Latest Update - 2026-05-20: Member dashboard hero and macro placement

- Reworked `/member` first screen so the hero focuses on the assigned workout plan, gym, week, weekly training count, lift logs, and plan status.
- Removed body metrics from the hero to reduce clutter.
- Moved macros into a lower `Body metrics & nutrition` wellness section, after the workout console and gym notices.
- Fixed the macro panel so it renders immediately instead of staying on `Loading macros...`.
- Added defensive topbar logo sizing in `app/styles/member.css` so FitSplit x gym branding cannot render at raw image dimensions.
- Added responsive member dashboard section styles in `app/styles/member.css`; mobile check showed no horizontal overflow.

### Verification
- `npm run typecheck` passes.
- `npm run build` passes.
- Browser checked `/member` on desktop and mobile viewport after member login.

---

## Latest Update - 2026-05-20: Member detail editing and PIN access repair

- Reworked `/owner/members/[memberId]` hero contact details into a separate right-side list with username, email, and phone visible at a glance.
- Replaced the old disclosure-only edit area with a proper `Edit details` button, editable form, and `Cancel edit` option.
- Owner/member detail editing now covers contact info, age, gender, DOB, height, weight, fitness goals, medical notes, injury notes, slots, and assigned trainer.
- Added `updateOwnerMemberContext` server action to persist profile context fields in Firestore and keep member auth metadata intact.
- Member usernames now fall back to phone/email when old Firestore rows do not have a dedicated `username`.
- Reset PIN now backfills missing `username`/`authEmail` profile fields and creates/repairs the Firebase Auth user when needed before setting the new 4-digit PIN.
- Added `scripts/backfill-member-access.mjs` plus `npm run backfill:member-access` to patch existing member profile/auth access data when Firebase Admin env vars are available in the shell.

### Verification
- `npm run typecheck` passes.
- `npm run build` passes.
- `http://localhost:3000/owner/members/titan-alisha` redirects unauthenticated requests to `/` with HTTP 307 locally; authenticated browser QA should be checked after login.
- `npm run backfill:member-access` checked 28 member profiles and created 21 missing Firebase Auth users.

---

## Latest Update - 2026-05-20: Owner member detail UX rebuild

- Rebuilt `/owner/members/[memberId]` around the trainer workflow.
- Weekly schedule is now the primary content instead of being buried below edit/account forms.
- Added a right-side action rail for changing programs, Gemini program matching, account access, PIN reset, and danger-zone deletion.
- Account access and delete controls are collapsed behind intentional disclosure panels so destructive/admin actions do not compete with training tasks.
- Added quick member summary metrics for training days, total exercises, assigned date, last lift log, and assigned trainer.
- Added read-first member context cards for goal, body metrics, medical notes, and injury/pain notes.
- Moved contact editing behind an "Edit contact details" disclosure panel.
- Removed default `1234` from the reset PIN field; owner must intentionally enter a 4-digit PIN.
- Tightened weekly schedule display so duplicate day title/focus text is not repeated.
- Improved assignment preview copy to show sample training-day names and clarified that assignment happens after confirmation.

### Verification
- `npm run typecheck` passes.
- `http://localhost:3000/owner/members/titan-alisha` responds with HTTP 200 locally.

---

## Latest Update - 2026-05-20: Click-to-enlarge exercise thumbnails and GIF preference

- Added `components/exercise-thumbnail-preview.tsx`.
- Exercise thumbnails are now buttons that open an in-app enlarged image modal with Escape/click-outside close support.
- Wired the thumbnail preview into:
  - Assigned workout exercise rows via `components/exercise-list.tsx`.
  - Owner exercise catalog at `/owner/exercises`.
  - Admin exercise catalog at `/admin/exercises`.
  - Member exercise library at `/member/exercises`.
- Added shared modal/thumbnail hover styles in `app/globals.css`.
- Updated `lib/exercise-thumbnails.ts` to prefer animated WGER GIF assets where reliable matches exist, including dumbbell curls, rear delt rows, overhead triceps extensions, split squats, and goblet squats.

### Verification
- `npm run typecheck` passes.
- Local dev server route `http://localhost:3000` responds with HTTP 200.
- Browser plugin JS execution was not exposed in this session, so interactive click QA should be done manually in the running app.

---

## Latest Update - 2026-05-20: Exercise thumbnails replaced with movement-specific sources

- Added `lib/exercise-thumbnails.ts` with a catalog-wide thumbnail resolver.
- Replaced the old random generic Unsplash gym fallback with WGER public exercise-image URLs selected by exercise-name keywords.
- `lib/mock-data.ts` now maps predefined `workouts.json` catalog exercises through the resolver.
- `lib/firebase/read-models.ts` now maps Firestore-backed exercises through the resolver when `thumbnailUrl` is blank or still points at the old generic Unsplash fallback.
- Coverage includes common catalog and SHG workbook movements: bench/incline/decline press, chest fly/cable crossover, lat pulldown, pull-ups, rows, shoulder press, lateral raise, rear delt/face pull, curls, triceps pushdown/extensions/dips, squats, leg press, leg curls/extensions, lunges, hip thrusts, calf work, crunches, leg raises, planks, twists, and related fallbacks by muscle group.

### Verification
- `npm run typecheck` passes.
- Spot checks resolve Barbell Bench Press, Incline Dumbbell Press, Lat Pulldown, Standing Barbell Shoulder Press, Leg Press, and Triceps Push Down to matching WGER exercise images.

---

## Latest Update — 2026-05-20: Exercise catalog cleanup script + seed .env.local fix

### Problems
1. `npm run seed:demo` failed with "Missing FIREBASE_CLIENT_EMAIL" because `seed-demo-firestore.mjs` didn't load `.env.local` (unlike the other scripts).
2. Stage 2/3 exercises imported by Codex into Firestore had: incorrect categories, duplicate entries, bad casing ("barbell squat" instead of "Barbell Squat"), and typos. Gym video URLs from the SHG channel were missing on these exercises.

### Changes

**`scripts/seed-demo-firestore.mjs`**
- Added `.env.local` loading (same pattern as `seed-firebase.mjs` / `seed-firebase-auth.mjs`). `npm run seed:demo` now works without manually exporting env vars in the shell.

**`scripts/fix-exercise-catalog.mjs`** (new)
- Reads all `exerciseCatalog` docs for `gymId: "shg"` from Firestore
- Normalises names to Title Case; applies 200+ explicit canonical name mappings (e.g. "barbell bicep curl" → "Barbell Curl", "rdl" → "Romanian Deadlift")
- Re-categorises exercises using pattern-matching when the stored category looks wrong
- Deduplicates — for exercises resolving to the same canonical name, keeps the doc with more data (video URL / longer instructions) and deletes the others
- Injects `gymVideoUrl` / `gymVideoSource` from the full SHG YouTube channel mapping (same 100+ exercises as `map-shg-videos.mjs`)
- Commits changes in Firestore batches of 400 ops

**`package.json`**
- Added `"fix:exercises": "node scripts/fix-exercise-catalog.mjs"` script

**`README.md`**
- Added Maintenance Scripts section documenting all seed/fix scripts

### How to run
```bash
npm run seed:demo      # now works — reads .env.local automatically
npm run fix:exercises  # clean up exerciseCatalog in Firestore
```

---

## Latest Update — 2026-05-20: Titan Fitness Club full Firestore wiring

### Root cause diagnosis
`titan-gym` existed only in `lib/mock-data.ts`. When Firebase Admin is configured, `getGymWorkspaces()` reads Firestore exclusively — mock data is invisible. If the admin created the gym via the console without specifying the slug, `slugifyGymName("Titan Fitness Club")` generated `titan-fitness-club`, producing a different workspace ID from the mock data `titan-gym`, causing a split between two non-matching workspaces.

### Changes made

**`scripts/seed-demo-firestore.mjs`**
- Added `titanGymId = "titan-gym"` and `titanOwnerId = "titan-owner-1"` constants
- Seeds `gyms/titan-gym` — Titan Fitness Club workspace with `status: "active"`, `memberCount: 20`
- Seeds `profiles/titan-owner-1` — owner profile with `username: "titan-owner-1"`, `authEmail: "titan-owner-1@fitsplit.app"`, `defaultGymId: "titan-gym"`
- Seeds all 20 Titan member profiles (matching mock-data IDs `titan-ravi` … `titan-meghna`) with `defaultGymId: "titan-gym"`
- Seeds 8 program assignments for Titan members

**`scripts/seed-firebase-auth.mjs`**
- Added `titan-owner-1` Firebase Auth user — `email: "titan-owner-1@fitsplit.app"`, password `password`, claims `{ role: "owner", gymId: "titan-gym" }`

**`lib/auth.ts`**
- Added `"titan-owner-1"` to `demoLogins` — resolves username without Firestore lookup

**`README.md`**
- Added Titan owner to Demo Login Credentials table

### How to apply
```bash
npm run seed:auth    # creates titan-owner-1 Firebase Auth account
npm run seed:demo    # writes titan-gym, titan-owner-1, 20 Titan members to Firestore
```

After seeding: login as `titan-owner-1` / `password` on the **Staff** tab.

If the admin previously created a gym with slug `titan-fitness-club` via the console, delete it from `/admin/gyms` — the seed creates the canonical `titan-gym` workspace.

---

## Latest Update - 2026-05-20: Gemini API mapped to FitSplit AI features

- Updated local `.env.local` with `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-flash-latest`.
- Mapped the model setting into both FitSplit AI paths:
  - Member AI workout/progress summary in `lib/ai.ts`.
  - Owner/admin AI program assignment picker in `lib/firebase/actions.ts`.
- Updated the program assignment Gemini request to send the API key through the `X-goog-api-key` header, matching Google's current REST example.
- Verified the Gemini endpoint locally with a small `gemini-flash-latest:generateContent` request; API returned HTTP 200.
- `npm run typecheck` passes.

### Deployment note
- Add the same `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-flash-latest` values to Firebase App Hosting / production environment before relying on hosted AI features.
- Because the API key was pasted into chat, rotate/restrict the key in Google AI Studio or Google Cloud before production use.

---

## Latest Update - 2026-05-20: SHG Stage 2 and Stage 3 workout import

### Data import
- Imported the trainer spreadsheets from:
  - `C:\Users\mehul\Downloads\stage 2 workout-2 (2).xlsx`
  - `C:\Users\mehul\Downloads\stage 3 workout (2).xlsx`
- Created two active SHG gym workout programs in Firestore:
  - `workoutPrograms/shg-stage-2-workouts` -> **Stage 2 Workouts**
  - `workoutPrograms/shg-stage-3-workouts` -> **Stage 3 Workouts**
- Both are stored as `source: "gym"`, `splitType: "custom"`, `gymId: "shg"`, `createdBy: "santosh-shg"`.

### Imported structure
- Stage 2 Workouts: 6 days, 91 workout items, 76 video links.
- Stage 3 Workouts: 6 days, 89 workout items, 67 video links.
- Added 180 deterministic SHG exercise catalog records with IDs like:
  - `stage-2-workouts-d1-01`
  - `stage-3-workouts-d1-01`
- Video links were copied into both `videoUrl` and `gymVideoUrl` so users who can view assigned workouts/catalog exercises can play the videos through the existing video UI.

### Verification
- Firestore read-back confirmed both program docs exist under project `fitsplit-29215`.
- Firestore query confirmed `exerciseCatalog` has 180 `source: "stage_workbook"` SHG records, 143 with videos.
- These programs should now appear in owner program assignment/dropdown flows together with predefined plans and other SHG custom plans.

---

## Latest Update — 2026-05-20: Fix misleading staff creation confirmation message

### Problem
- `app/admin/page.tsx` "Create gym staff?" confirmation dialog said "They will receive an email with their credentials." — FitSplit does not send any email. This caused confusion about how newly created owner/trainer accounts are accessed.

### Fix (`app/admin/page.tsx`)
- Updated `confirmMessage` to: "This creates a Firebase Auth login with the email and default password 'password'. Share these credentials manually — no email is sent."
- Added inline hint below the form fields: "Default login password is `password`. Share it with the staff member — no email is sent automatically."

### How to log in as a newly created gym staff account
1. Open the FitSplit login page.
2. Select the **Staff** tab (not the Member/PIN tab).
3. Enter the **email** used when creating the account.
4. Enter password: **`password`**
5. Change the password via `/profile` after first login.

Note: `titan-gym` exists in mock data only. To create a Titan owner in Firebase, first create the Titan Fitness Club gym workspace via `/admin/gyms`, then add the owner via `/admin` with that gym's real Firebase ID.

---

## Latest Update — 2026-05-20: UX polish, custom plan improvements, exercise requests

### Back button removed
- `BackButton` component removed from `app/layout.tsx` — breadcrumbs already provide navigation on all pages.
- `.back-row` / `.back-button` CSS removed from `globals.css`.

### Exercise duplicate fix
- `getExerciseCatalog` in `lib/firebase/read-models.ts` now deduplicates by exercise name (case-insensitive) instead of ID. Firebase-persisted version wins over mock data when names collide. Prevents the same exercise appearing twice when Firebase + workouts.json are both present.

### Custom plan builder (`components/custom-plan-builder.tsx`) — full rewrite
- Exercise picker: text filter input + `optgroup`-style select grouped by muscle group.
- Per-exercise sets/reps: each added exercise has its own editable sets/reps fields inline.
- Custom exercise input: free-text field for exercises not in the catalog.
- "Send to admin for catalog" checkbox appears when a custom exercise name is entered — includes muscle group, equipment, and optional notes fields.
- Edit mode: accepts `initialProgram?: WorkoutProgram` prop — pre-fills title, goal, description, and all days. Calls `updateCustomWorkoutProgram` instead of `createCustomWorkoutProgram`.
- Save no longer uses `ConfirmActionForm` — uses direct `useTransition` form submit.

### Custom plan gallery (`components/workout-program-gallery.tsx`) — updated
- Custom gym plans now shown at the **top** of the programs page (most relevant to owner).
- Predefined plans are collapsed by default with a "Show/Hide" toggle.
- Custom plan cards now have **Edit** and **Delete** buttons.
  - Edit opens the `CustomPlanBuilder` in a modal dialog, pre-filled with existing plan data.
  - Delete shows a confirmation dialog and calls `deleteCustomWorkoutProgram`.
- Gallery accepts `catalog?: CatalogGroup[]` prop for the edit modal builder.

### New server actions (`lib/firebase/actions.ts`)
| Action | Description |
|--------|-------------|
| `requestCatalogExercise` | Owner submits a custom exercise request; saves to `exerciseRequests` collection and creates an admin notification. |
| `approveCatalogExerciseRequest` | Admin edits details and approves — saves exercise to `exerciseCatalog`, marks request as approved. |
| `rejectCatalogExerciseRequest` | Admin dismisses a pending request, sets status to `rejected`. |
| `deleteCustomWorkoutProgram` | Owner/admin deletes a custom gym plan from Firestore. |
| `updateCustomWorkoutProgram` | Updates an existing custom gym plan (days, exercises, title, etc.). |

### New Firestore collection: `exerciseRequests`
- Added to `lib/firebase/collections.ts`.
- Fields: `id, gymId, gymName, requestedBy, name, muscleGroup, equipment, instructions, status, createdAt, updatedAt`.
- `status`: `"pending" | "approved" | "rejected"`.

### Admin exercise requests UI (`app/admin/exercises/page.tsx`)
- Pending exercise requests shown at the top of the page with an alert pill.
- Each request card shows name, muscle group, gym source, notes, a **Dismiss** button (one-click reject), and a **Review & Add to catalog** expandable form.
- The form pre-fills with request data and lets admin edit before approving — single submit adds to catalog.

### Domain types (`types/domain.ts`)
- `Notification.type` union extended with `"exercise_request"`.
- `Notification.exerciseRequestId?: string` optional field added.
- New `ExerciseRequest` type added.

### Mock data (`lib/mock-data.ts`)
- 10 new SHG members added (varied goals, join dates Oct 2025–Apr 2026, 2 suspended).
- 20 Titan Fitness Club members added (2 suspended).
- Titan Fitness Club gym workspace added with 2 gym notices.
- 4 new SHG assignments and 8 new Titan assignments added for plan-filter demo.
- SHG `memberCount` updated to 15.

### Member UX changes
- `assignedTrainer` field on `/profile` is read-only for members — `isReadOnlyTrainer={true}` passed from `app/profile/page.tsx`.
- Start Workout button removed from `MemberWorkoutConsole`; session bar only visible when an active session exists.

### Loading states
- `FitnessLoader` component (`components/fitness-loader.tsx`) — animated barbell with pulsing dots.
- `loading.tsx` files added for root, `/member`, `/owner`, `/admin`, `/profile`.

---

## Session 9 Plan — Admin Console Redesign (2026-05-18)

### Scope approved by Mehul. Implementation in progress.

**Problems to fix:**
1. `/admin/gyms` — after deleting a gym a 404 appears (no redirect after delete on list page)
2. "Initial rollout" / "Sri Shakti Hanuman Gym is the active initial rollout" text appears in 5 places — remove all
3. Admin dashboard (`/admin`) — 3 useless color cards, redundant "Manage gyms" button x2, "Initial rollout" card, tiny text inside big cards
4. Admin gyms list (`/admin/gyms`) — inline edit forms per gym clutters the list; editing lives on the detail page
5. Admin topnav — shows `Admin | Dashboard | Members | Workout Programs | Exercise Catalog`; admin shouldn't have owner-specific links mixed in
6. Profile page — admin avatar shows "FA" (derived from name like "FitSplit Admin"); no change email; UID displayed in full looks broken; page has nothing useful besides password change
7. Workout Programs (`/owner/programs`) — `CustomPlanBuilder` appears first/in aside before showing existing programs; programs should be primary
8. Exercise Catalog (`/owner/exercises`) — "Custom Workouts" add form appears before catalog; no edit per exercise; no thumbnail/video URL management
9. Exercise video for members — need YouTube embed modal when member taps a "Watch form" button per exercise

**Implementation tasks:**

| # | File | Change |
|---|------|--------|
| 1 | `lib/firebase/actions.ts` | Add `updateCatalogExercise` (edit name, muscle, equipment, instructions, thumbnail, videoUrl) |
| 2 | `lib/firebase/actions.ts` | Add `changeAdminEmail` (admin email + profile doc update) |
| 3 | `lib/firebase/actions.ts` | Fix `deleteGymWorkspace` error message (remove SHG initial rollout reference) |
| 4 | `components/main-nav.tsx` | Admin nav → `Dashboard /admin | Gyms /admin/gyms | Inbox /admin/inbox` (remove /owner/* from admin nav) |
| 5 | `app/admin/page.tsx` | Full redesign: compact stat strip (gyms, active, members), clean gym table, remove useless color cards and "Initial rollout" |
| 6 | `app/admin/gyms/page.tsx` | Remove initial rollout/SHG text, remove inline edit forms (they live on detail page), add `successRedirect` to delete |
| 7 | `app/owner/programs/page.tsx` | Programs gallery first (primary), `CustomPlanBuilder` at bottom as secondary "Create Program" section; remove SHG text |
| 8 | `app/owner/exercises/page.tsx` | Catalog first grouped by muscle; each exercise has `<details>` edit panel; "Add exercise" at bottom; remove SHG text |
| 9 | `app/profile/page.tsx` | Admin section: avatar with proper initials/icon, truncated UID, change-email form, change-password form; display name edit |
| 10 | `components/exercise-list.tsx` | Make client component; YouTube embed modal when exercise has videoUrl |
| 11 | `app/globals.css` | Add CSS for: admin stats strip, admin gym table, exercise catalog edit row, video modal |

---

## Co-Developer Protocol

This project is maintained by two AI co-developers — **Claude** and **Codex** — plus the owner, **Mehul Chirania**. Both developers must:
1. Prepend a dated "Latest Update" entry to this file after every change session.
2. Keep `README.md` Current Status and Features sections accurate.

This file is the canonical handoff document. Read it first when starting any new session.

---

## Product Direction Note - 2026-05-19: Remove manual workout start/end flow

Mehul plans to remove the explicit `Start Workout` / `End Workout` button flow because most members are unlikely to use it consistently.

Preferred direction:

- Make `Log Sets` the primary in-gym action.
- Treat the first logged set of the day as the implicit workout/session start.
- Use logged sets as the attendance/proof-of-training signal instead of requiring a separate check-in.
- Show lightweight status such as `Last trained today at 6:42 PM`.
- Do not create attendance/session records when no sets are logged.
- Avoid reintroducing manual start/end workout UX unless explicitly requested.

---

## Product Direction Note - 2026-05-19: AI gym-floor optimization

FitSplit should differentiate from generic AI workout generators by using AI to optimize workout assignment around the real gym floor.

Future AI program assignment should consider:

- Existing member program assignments.
- Member primary/secondary training time slots.
- Assigned trainer.
- Muscle-group overlap by day.
- Exercise/equipment overlap by day.
- Machine/equipment availability and expected crowding.
- Historical busy hours and logged training behavior.

When assigning a program, AI should surface:

- Recommended workout program.
- Schedule/machine crowding risk.
- Overlap warnings, such as too many members training chest or using bench/cable stations in the same slot.
- Suggested changes, such as shifting a member's push day, starting them on a different day in the split, or swapping an overloaded machine exercise for an equivalent alternative.

The owner/trainer assignment UI should eventually support:

- `Assign as-is`.
- `Apply AI optimized schedule`.
- `Pick another program`.

This should position FitSplit as an AI training-operations tool for gyms, not just an AI workout generator.

---

## Product Direction Note - 2026-05-19: Owner muscle/equipment usage charts

Owner dashboard should include a day-wise and slot-wise load map showing which muscle groups and machines/equipment are expected to be used.

Recommended views:

- Heatmap: day of week x muscle group.
- Heatmap: day of week x equipment/machine.
- Slot heatmap: time slot x muscle group/equipment.
- Stacked bars: members per muscle group per day.
- Warning cards for expected overload, such as `Bench stations overloaded Monday evening`.

Example insights:

- Monday: Chest high, Triceps medium, Bench press high, Cable machine high.
- Tuesday: Back high, Biceps medium, Lat pulldown high.
- Slot D: Chest very high, bench/cable demand high.

AI should use this same load-map data to recommend better program assignments, stagger workout days, shift exercise selection, and reduce crowding.

---

## Latest Update - 2026-05-19: CSS modularization and default exercise video support

- Started splitting feature CSS out of the oversized `app/globals.css`.
- Moved the isolated member workout layout rules into `app/styles/member.css` and imported it from `app/layout.tsx`.
- Added shared form helper styles in `app/styles/forms.css`.
- `lib/workouts.json` exercise entries now support optional `video_url`; `lib/mock-data.ts` maps that into `Exercise.videoUrl` by default.
- `getExerciseCatalog()` now preserves default `video_url` values from `workouts.json` when Firestore has a legacy blank video field, while still allowing Firestore video overrides.
- Catalog video editing is admin-only at the UI/action layer. Owners can edit exercise details, but default video source changes are preserved for admin users.
- Catalog video icons are clickable for users who can access the exercise catalog; assigned workout/program screens use the shared `ExerciseList` video action.

Verification:

- `npm run typecheck` passes.
- `npm run build` passes.
- Local dev server restarted at `http://localhost:3000`.

---

## Latest Update - 2026-05-19: Member workout UI rebuild

- Rebuilt the member workout console with isolated `member-*` layout classes to stop shared dashboard/catalog CSS from breaking the member page.
- Workout content and lift logging now use a stable two-column layout on desktop and a clean stacked layout on mobile.
- Exercise rows now have fixed card structure: thumbnail, exercise details, prescription, and a prominent `Play video` button for video-enabled exercises.
- Lift logging is constrained to the side panel with responsive fields, so inputs no longer stretch to the page edge.
- Video modal z-index and card spacing were tightened for the member page.

Verification:

- `npm run typecheck` passes.
- Clean `npm run build` passes.
- Local dev server restarted at `http://localhost:3000`.

---

## Latest Update - 2026-05-19: Exercise catalog video editing and member playback

- Reworked `/owner/exercises` edit rows so each exercise opens a full-width edit panel with a visible `Edit` / `Close edit` toggle.
- Added a small video indicator icon beside catalog exercises that have a `videoUrl`.
- Updated catalog exercise saves to stamp the current gym id, `isActive`, and owner metadata so edited predefined exercises remain visible in SHG owner/member reads.
- Added YouTube Shorts support to the member exercise video modal, so links like `/shorts/...` embed correctly.
- Repaired the existing Barbell Bench Press Firestore document from the old Titan gym id to `shg`, preserving its video URL for member playback.
- Tightened member exercise-row CSS so prescription and `Watch form` actions align cleanly on desktop and mobile.

Verification:

- `npm run typecheck` passes.
- Barbell Bench Press now has `gymId: shg`, `isActive: true`, and its YouTube Shorts video URL in Firestore.

---

## Latest Update - 2026-05-19: Workout programs page redesign

- Reworked `/owner/programs` from stock-image cards into a useful program library.
- Programs are now split into `Predefined workout plans` and `Custom gym plans`.
- Each program card shows real mapped catalog exercises, training-day count, exercise count, and assigned member count/names.
- Removed the misleading `sessions` count and replaced it with `training days` and `exercises`.
- Removed stock imagery from program cards.
- Program modal still opens the full weekly schedule with catalog-mapped exercise details.

Verification:

- `npm run typecheck` passes.
- Clean `npm run build` passes after clearing `.next`.
- Local `/owner/programs` renders mapped exercises such as Barbell Bench Press, T-Bar Row, and EZ Bar Preacher Curl.

---

## Latest Update - 2026-05-19: Program assignment source merge

- Fixed owner member detail assignment flow so predefined `workouts.json` programs always appear, even when a gym has not created any custom Firestore programs yet.
- `getWorkoutPrograms()` now merges predefined plans with active gym-created plans from Firestore and tags them as `predefined` or `gym`.
- Empty predefined placeholder templates are excluded from assignment so AI cannot assign a blank `Custom User Routine`.
- `getExerciseCatalog()` now merges predefined `workouts.json` exercises with Firestore exercises so predefined plans render exercise names even when Firestore has no exercise catalog rows.
- Repaired Kabir's active Firestore assignment from the empty custom template to `PPL + Upper/Lower`.
- Reworked the assign-program UI into a dropdown grouped by `Predefined plans` and `Saved gym plans`, with a concise selected-plan preview.
- AI program brief now has assignable programs available because Gemini/fallback selection reads the same merged program list.

Verification:

- `npm run typecheck` passes.
- Local `/owner/members/member-aarav` renders predefined plans in the assign-program dropdown.

---

## Latest Update - 2026-05-18: Gym logo management and initial rollout status removal

- Removed user-facing `initial rollout` status handling. Gym status is now active, paused, or inactive; legacy Firestore/mock `initial rollout` values normalize to `active` on read.
- SHG mock and primary workspace defaults now use `status: "active"` and SHG gets `/shg-gym-logo.jpeg` as the fallback logo.
- Added `logoUrl` and `logoPath` fields to `GymWorkspace`.
- Added admin gym logo management on `/admin/gyms/[gymId]`: upload an image, preview the FitSplit x gym lockup, crop via move sliders, resize via zoom slider, then save a 512px PNG.
- Added `updateGymLogo` server action that uploads the processed PNG to Firebase Storage and stores the download URL/path on the gym document.
- Member topbar now shows `FitSplit x gym-logo` for members whose gym has a logo.
- Reworded About/admin copy to remove initial rollout references.

Verification:

- `npm run typecheck` passes.
- `npm run build` passes.

---

## Latest Update - 2026-05-18: Protected route redirect fix for admin opening

- Added `middleware.ts` to redirect unauthenticated protected routes (`/admin`, `/owner`, `/member`, `/profile`, `/activity`, `/about`) before Server Components render.
- Fixed the dev-only broken shell where `/admin` could show only app chrome/topbar while the page was redirecting.
- `AppTopbar` and `BackButton` now hide when there is no authenticated role, preventing public/protected redirect pages from showing authenticated chrome.
- Restarted the local dev server on port `3000`.

Verification:

- Unauthenticated `GET /admin` returns `307` to `/`.
- Admin-cookie request to `/admin` renders `Admin Console`.
- `npm run typecheck` passes.
- `npm run build` passes.

---

## Latest Update - 2026-05-18: Landing CSS split repair and login button fix

- Respected the new CSS split: `/` imports `app/landing.css`, and the final `lp-*` landing overrides now live there instead of `app/globals.css`.
- Repaired the landing navbar, hero, responsive grids, partner cards, footer contact form, mobile menu, and modal styles with scoped `lp-*` rules.
- Fixed the landing Login button stacking/clickability by giving the navbar actions their own z-index and explicit button sizing.
- Fixed the `/profile` production build issue by importing the client `ProgressiveOverloadChart` directly instead of using `next/dynamic({ ssr: false })` in a Server Component.

Verification:

- `npm run typecheck` passes.
- `npm run build` passes.
- `http://localhost:3000/` responds with status `200`.

---

## Latest Update - 2026-05-18: Gym-aware app shell and strict attendance records

This update supersedes the attendance notes from session 8 where GPS was optional.

- Authenticated app chrome now resolves gym branding with `getGymDetail(currentUser.gymId)` instead of always using `getPrimaryWorkspace()` / SHG.
- Owner dashboard, member empty state, and non-member profile cards now use the logged-in user's gym record.
- `GymWorkspace` supports optional `latitude`, `longitude`, and `radiusMeters` fields for per-gym geofence configuration.
- Start Workout now requires browser geolocation before submitting. If GPS is unavailable/denied, the member sees an inline error and no session is started.
- `startWorkoutSession` validates against gym-level geofence coordinates when present, falling back to SHG env vars.
- `startWorkoutSession` now creates/updates `attendanceRecords/{sessionId}` with true `checkInAt`, GPS, device info, distance, radius, and geofence status.
- `endWorkoutSession` now updates the same attendance record with `checkOutAt` instead of creating a separate record at checkout time.
- `WorkoutSession` and `AttendanceRecord` domain types now include gym/session/geofence metadata used by Firestore reads.

Verification:

- `npm run typecheck` passes.
- `npm run build` passes.

---

## Latest Update - 2026-05-18: Admin portal gap fixes (session 8)

### Multi-gym write paths fixed
All server actions that previously hardcoded `PRIMARY_GYM_ID` or `PRIMARY_OWNER_ID` now use the authenticated user's `gymId`/`uid` from the session:
- `assignProgramToMember` — uses `currentUser.gymId` for assignment, notification, and activity event writes
- `generateAndAssignProgram` — passes `currentUser.gymId` to `getWorkoutPrograms()`
- `logLiftSet` — uses `currentUser.gymId` for lift log records
- `syncOfflineLifts` — uses `currentUser.gymId` for offline lift batch writes
- `startWorkoutSession` — uses `currentUser.gymId` for session records
- `endWorkoutSession` — uses `currentUser.gymId` for attendance records; now requires `memberId` in form data
- `createCatalogExercise` — uses `currentUser.gymId` and `currentUser.uid`
- `createCustomWorkoutProgram` — uses `currentUser.gymId` and `currentUser.uid`

### Multi-gym read paths fixed
- `getLiftLogsForMember` — removed `gymId` filter (memberId is globally unique; filter was blocking non-SHG members)
- `getProgramAssignmentForMember` — removed `gymId` filter for same reason
- `getActivityEvents` — new optional `gymId` param; all callers (`activity/page.tsx`) pass `currentUser.gymId`
- `getMemberDetail` and `getMemberWithProfile` — removed `data.defaultGymId !== PRIMARY_GYM_ID` restriction that blocked non-SHG member detail pages
- All owner pages already pass `currentUser.gymId` (done in F1); member page now passes it to `getWorkoutPrograms`, `getExerciseCatalog`, `getActiveWorkoutSessions`
- Member detail page now passes `currentUser.gymId` to programs and exercises reads

### Mock fallback pollution fixed
When Firebase Admin is configured but a Firestore snapshot is empty, read models now return real empty state instead of demo data:
- `getOwnerNotifications` → `[]` when empty (not mock notifications)
- `getMemberNotifications` → `[]` when empty
- `getWorkoutPrograms` → `[]` when empty (new gym gets clean state)
- `getExerciseCatalog` → `[]` when empty
- `getProgramAssignmentForMember` → `null` when not found
- `getActiveProgramAssignments` → `[]` when empty
- `getActivityEvents` → `[]` when empty
- `getProfileMetrics` — returns non-persisted flag when doc missing so callers know it's fallback data

### Start/End Workout UI restored
`MemberWorkoutConsole` now includes a session bar at the top of the workout panel:
- **Start Workout** button: requests GPS (optional, soft-fail), calls `startWorkoutSession`, stores sessionId + start time in `localStorage`
- Elapsed time counter updates every second while session is active; shows `MM:SS` or `Xh MMm`; red warning at 3h
- **End Workout** button: calls `endWorkoutSession`, clears localStorage, creates an `attendanceRecord` in Firestore
- Session state is restored from `localStorage` on page refresh so the timer survives navigation

### Geofence made optional
`startWorkoutSession` no longer throws when GPS is unavailable — if lat/lng are not provided, `geofenceStatus: "location_not_provided"` is recorded and the session starts normally.

### Attendance record on session end
`endWorkoutSession` now creates an `attendanceRecords` document on each session completion (non-fatal — attendance write failure does not block the session end).

### Dead code removed
- `isLegacyInitial rolloutWorkspace` function removed from `read-models.ts` (filter was already removed in a prior session; function was orphaned)

Verification: `npm run typecheck` passes clean.

---

## Current Source Of Truth

This section supersedes older contradictory notes in the historical change log below.

FitSplit is currently an SHG-focused workout delivery app for **Sri Shakthi Hanuman Gym (SHG Gym)**. The second `Dummy-Gym` workspace exists only for admin testing.

Current product focus:

- Workout plan creation and assignment.
- Member workout delivery.
- Lift logging and progress tracking.
- Trainer/owner coordination.
- Admin contact inbox and gym/staff management.
- AI-assisted semi-personal trainer workflow.

Current technical baseline:

- Next.js App Router, React 19, TypeScript.
- Firebase Auth email/password with server-side credential resolution.
- Firebase Admin session cookies and server-side role guards.
- Cloud Firestore as the app data source.
- Firebase App Hosting for deployment.
- PWA basics: manifest, service worker, icons, and install prompt.
- Gemini API hooks for AI workout/program suggestions when configured.
- Mock fallback data remains in `lib/mock-data.ts` and `lib/workouts.json` when Firebase Admin is unavailable.

Current route behavior:

- Unauthenticated `/` renders the public landing page with modal login.
- Authenticated `/` redirects by role: admin -> `/admin`, owner -> `/owner`, member -> `/member`.
- Authenticated app chrome/footer must not leak into the public landing page.

Current IDs and credentials:

- SHG gym id: `shg`
- SHG owner username/id: `santosh-shg`
- Dummy gym id: `dummy-gym`
- Dummy owner username/id: `dummy-gym-owner-1`
- Admin profile id: `admin-fitsplit`
- Admin login: `admin` / `password`
- Owner login: `santosh-shg` / `password`
- Trainers: `shg-trainer-1` / `password`, `shg-trainer-2` / `password`
- Members: `mehulchirania` / `1234`, `9688227039` / `1234`, `mehul@example.com` / `1234`, `aarav@example.com` / `1234`

Explicitly out of scope unless re-approved:

- In-workout rest timer. It was requested earlier, then later removed from the product requirements.
- Membership renewal UI. FitSplit no longer syncs with the external membership app.
- Public landing copy that says FitSplit does not do billing. Billing is now a future roadmap item, not a public limitation message.

Recommended next work (as of 2026-05-18 audit):

**Start with Phase F0 — all 7 items break core functionality or corrupt data:**
1. **F0-1** Contact form field names — silent failure on every submission.
2. **F0-2** Member empty state fallback — unassigned members see wrong program.
3. **F0-3** Profile page role split — admin/owner see member-only body metrics.
4. **F0-4** `updateMemberProfile` gym corruption — editing member overwrites gym ID.
5. **F0-5** `deleteMemberProfile` data cleanup — orphaned lift logs / assignments.
6. **F0-6** `updateProfileMetrics` role corruption — can overwrite non-member role.
7. **F0-7** Trainer access restriction — trainers have destructive owner-level access.

Full ranked list of F0 → F1 → F2 issues is in the "Full product audit — functional fix roadmap" update below.

---

## Latest Update - 2026-05-18: Member dashboard UI repair

Fixed the broken member dashboard presentation:

- Reworked the `/member` top section into a stable responsive summary card so the greeting, program title, badges, and profile metrics do not collide.
- Anchored profile and notification dropdowns with higher z-index, fixed widths, mobile-safe positioning, and consistent menu item alignment.
- Rebuilt the member "Log your sets" panel with CSS classes instead of brittle inline layout styles; inputs/selects now keep readable dark/light styling.
- Removed the in-workout rest timer from the member console path, keeping with the current out-of-scope product decision.
- Cleaned corrupted PR/member streak UI text in the member experience.
- Fixed `components/session-timeout.tsx` browser timer typing so verification can pass.

Verification:

- `npm run typecheck` passes.
- `npm run build` passes.

---

## Latest Update - 2026-05-18: Phase F1 wrong-behavior fixes (session 5)

All 11 Phase F1 issues resolved. `typecheck` passes clean.

- **F1-1** `getMembers`, `getWorkoutPrograms`, `getExerciseCatalog`, `getActiveProgramAssignments`, `getActiveWorkoutSessions` in `read-models.ts` now accept optional `gymId` param (defaults to `PRIMARY_GYM_ID`). Owner dashboard, members page, exercises page, programs page all pass `currentUser.gymId`.
- **F1-2** `getOwnerNotifications(gymId?)` now accepts optional gym filter. Owner dashboard passes `currentUser.gymId` so multi-gym owners don't see each other's notifications.
- **F1-3** `assignProgramToMember` now uses `currentUser.uid` as `createdBy` instead of hardcoded `PRIMARY_OWNER_ID`.
- **F1-4** Owner dashboard "Members needing plans" panel shows "All members have a program assigned." when `unassignedMembers.length === 0` instead of showing up to 4 assigned members.
- **F1-5** Owner dashboard detects `staffType: "trainer"` / `"staff"` from session. Trainers/staff see "Trainer dashboard" eyebrow, "View members" CTA instead of "Assign member plans", and the "Open catalog" destructive link is hidden.
- **F1-6** `resetPassword` success message no longer echoes the new PIN — now returns `"PIN reset successfully."`.
- **F1-7** `getLiftLogsForMember` no longer returns hardcoded demo bench press logs — returns `[]` when Firebase is unconfigured or when a member has no logs. Chart and lift history now show their real empty states.
- **F1-8** `clearUserNotifications` ownership check simplified — removed fragile `.includes(gymId)` string check on UUID recipientId.
- **F1-9** `/owner/members/[memberId]` now fetches `getProfileMetrics` in parallel. Body metrics panel (weight, height, age, BMI, primary slot) appears in the aside when the member has entered them.
- **F1-10** `getAdminNotifications()` added to `read-models.ts`. Layout now fetches it for admin role and passes to topbar notification bell.
- **F1-11** `createMemberProfile` increments `GymWorkspace.memberCount`. `deleteMemberProfile` decrements it (with a safe try/catch so deletion never fails if the gym doc is missing).

---

## Latest Update - 2026-05-18: Phase F0 critical fixes (session 4)

All 7 Phase F0 critical bugs fixed. `typecheck` passes clean.

- **F0-1** `app/about/page.tsx` — contact form fields renamed: `number`→`mobile`, `requirement`→`body`. Form now actually writes to Firestore.
- **F0-2** `app/member/page.tsx:47` — removed `?? programs[0]` fallback. Unassigned members now see "No workout plan assigned" empty state with gym contact links.
- **F0-3** `app/profile/page.tsx` — role-split profile page: admin/owner see a simple identity card (no body metrics), members see the full form + chart + AI summary.
- **F0-4** Already correct — `updateMemberProfile` already reads `defaultGymId` from the existing Firestore doc.
- **F0-5** `lib/firebase/actions.ts` `deleteMemberProfile` — added batch cleanup of `programAssignments`, `liftLogs`, `notifications`, `workoutSessions`, `attendanceRecords` before profile delete.
- **F0-6** `lib/firebase/actions.ts` `updateProfileMetrics` — removed `role: "member"` and `defaultGymId: PRIMARY_GYM_ID` from the write. Only metrics fields are updated.
- **F0-7** `lib/auth.ts` — added `staffType` to `AuthenticatedUser`, `ProfileRecord`, `DemoLogin`. Added `requireOwner()` export that blocks `staffType: "trainer"` and `"staff"`. Applied to 6 destructive actions in `actions.ts`.

---

## Latest Update - 2026-05-18: Full product audit — functional fix roadmap (session 3)

### Product Owner Audit — Role-by-Role Findings

Deep audit of every user flow. Findings are listed under their role. Priority: **P0** = broken/data corruption/security, **P1** = wrong behavior, misleading UX, **P2** = missing feature.

---

#### ADMIN FLOW

| # | Priority | Issue | File(s) |
|---|----------|-------|---------|
| A1 | P0 | `/profile` page shows member-only body metrics (weight, height, BMI, slot preferences, injury notes) to admin. Admin has no body metrics concept. | `app/profile/page.tsx`, `components/profile-form.tsx` |
| A2 | P1 | `WorkspaceSwitcher` on admin dashboard is purely decorative — `<select>` has no `onChange` handler; switching gym does nothing. | `components/workspace-switcher.tsx` |
| A3 | P1 | Admin has no self-service password change UI. Only reachable via direct Firestore edit. | `app/profile/page.tsx` |
| A4 | P1 | `resetPassword` success message reveals the new password in plaintext: `"Access code reset to '${rawNewPassword}'"`. Should not expose credentials in toast. | `lib/firebase/actions.ts:957` |
| A5 | P1 | Admin notification bell shows nothing — `getOwnerNotifications()` filters `recipientRole: "owner"` only; admin gets no notification feed. | `app/layout.tsx`, `lib/firebase/read-models.ts:450` |
| A6 | P2 | `GymWorkspace.memberCount` stored field is never updated when members join/leave; admin gym list shows stale count (always 0 unless manually patched). `getGymWorkspaces()` computes it dynamically but `getPrimaryWorkspace()` reads the stale stored value. | `lib/firebase/actions.ts` (createMemberProfile, deleteMemberProfile) |

---

#### OWNER FLOW

| # | Priority | Issue | File(s) |
|---|----------|-------|---------|
| O1 | P0 | ALL owner read queries are hardcoded to `PRIMARY_GYM_ID = "shg"`: `getMembers()`, `getWorkoutPrograms()`, `getExerciseCatalog()`, `getActiveProgramAssignments()`, `getProgramAssignmentForMember()`, `getLiftLogsForMember()`, `getActiveWorkoutSessions()`, `getActivityEvents()`. An owner of a different gym sees SHG data. | `lib/firebase/read-models.ts` (every query) |
| O2 | P0 | `updateMemberProfile` hardcodes `defaultGymId: PRIMARY_GYM_ID` — editing a member from gym B overwrites their gym to SHG. Data corruption. | `lib/firebase/actions.ts:473` |
| O3 | P0 | `deleteMemberProfile` leaves orphaned Firestore data: `programAssignments`, `liftLogs`, `notifications`, `workoutSessions`, `activityEvents` for the deleted member are never cleaned up. | `lib/firebase/actions.ts:996` |
| O4 | P1 | Trainers (`staffType: "trainer"`) have the same full owner-level access as gym owners. They can create/delete members, reset PINs, delete members, create/delete exercises, and create programs. `staffType` is never checked in any route guard or action. | `lib/auth.ts`, all `requireRole(["admin","owner"])` actions |
| O5 | P1 | `WorkspaceSwitcher` is decorative — no `onChange` handler, switching gym has no effect. | `components/workspace-switcher.tsx` |
| O6 | P1 | Owner dashboard "Members needing plans" section: when ALL members have programs (`unassignedMembers.length === 0`), it falls back to showing `members.slice(0, 4)` with the label "Members needing plans" — misleading, they all have plans. | `app/owner/page.tsx:113` |
| O7 | P1 | `createMemberProfile` / `deleteMemberProfile` never update `GymWorkspace.memberCount` stored field. | `lib/firebase/actions.ts:389`, `lib/firebase/actions.ts:996` |
| O8 | P1 | `assignProgramToMember` hardcodes `createdBy: PRIMARY_OWNER_ID` — on multi-gym setup, the wrong owner is credited. | `lib/firebase/actions.ts:563` |
| O9 | P1 | Owner member detail page (`/owner/members/[memberId]`) shows `member.goal` but has no view of body metrics the member has entered (weight, height, age, BMI). Owner should be able to see member's self-reported physical data. | `app/owner/members/[memberId]/page.tsx` |
| O10 | P2 | `CustomPlanBuilder` only creates 1-day programs. `daysPerWeek` hardcoded to `1`, only one `days` entry, no UI to add more days. | `components/custom-plan-builder.tsx` |
| O11 | P2 | `assignedTrainer` field in member profile is a freetext input — no dropdown populated from actual trainers in the gym. Owner must manually type trainer names. | `components/profile-form.tsx` |
| O12 | P2 | Activity events are not created for member create, member delete, member access toggle — only `assignProgramToMember` creates an activity event. | `lib/firebase/actions.ts` |

---

#### MEMBER FLOW

| # | Priority | Issue | File(s) |
|---|----------|-------|---------|
| M1 | P0 | **Empty state is unreachable.** `const program = programs.find(...) ?? programs[0]` — unassigned members always see `programs[0]` workout instead of the "No plan assigned" empty state. The empty state block (`lines 105–125`) is dead code when any programs exist. | `app/member/page.tsx:47` |
| M2 | P0 | `/profile` page shows member-only fields (weight, height, BMI cards, slot preferences, injury notes, assigned trainer) to ALL roles via `requireAuth()`. Admin and owner should have their own simplified profile pages. | `app/profile/page.tsx` |
| M3 | P1 | `updateProfileMetrics` hardcodes `role: "member"` and `defaultGymId: PRIMARY_GYM_ID` in the Firestore write. If an admin/owner somehow calls this for their own UID, their profile role gets overwritten to "member". | `lib/firebase/actions.ts:739` |
| M4 | P1 | Members have no way to change their own PIN. No self-service PIN change on the profile page — they must contact the owner. | `app/profile/page.tsx` |
| M5 | P1 | Reps field for lift logging accepts freetext with no format guidance (e.g., "8" vs "8,6,6" vs "8x3"). Members won't know what format is expected or how to log varying rep counts. | `components/member-workout-console.tsx` |
| M6 | P1 | Progressive overload chart always renders with demo fallback lift logs (2 demo bench press entries) even for real members with no logs. Chart shows as "progress" when there is none. | `lib/firebase/read-models.ts:609` (fallback data always returned) |
| M7 | P2 | Session expires after 2 hours with no warning. `SessionTimeout` component exists but gives no advance notice before the hard cutoff. | `components/session-timeout.tsx` |

---

#### TRAINER/STAFF FLOW

| # | Priority | Issue | File(s) |
|---|----------|-------|---------|
| T1 | P0 | Trainers land on `/owner` and have full owner capabilities: create members, delete members, reset PINs, create/delete exercises, create programs. No access restriction differentiates a trainer from a gym owner. | All `requireRole(["admin","owner"])` guards |
| T2 | P1 | No trainer-specific dashboard. Trainers see "Today's checklist", "Assign member plans" CTA, and all destructive management actions that should be owner-only. | `app/owner/page.tsx` |
| T3 | P1 | Staff (`staffType: "staff"`) have identical unrestricted owner access. | Same as T1 |
| T4 | P2 | No trainer-focused workflow (view assigned members, add training notes to a member's profile) separate from owner management workflow. | N/A (feature missing) |

---

#### ABOUT/CONTACT FLOW

| # | Priority | Issue | File(s) |
|---|----------|-------|---------|
| C1 | P0 | Contact form always silently fails. Form uses `<input name="number">` and `<input name="requirement">` but `submitContactMessage` expects `mobile` and `body`. No error shown to user — form submits and nothing is stored. | `app/about/page.tsx`, `lib/firebase/actions.ts` (submitContactMessage) |

---

#### NOTIFICATIONS

| # | Priority | Issue | File(s) |
|---|----------|-------|---------|
| N1 | P1 | Owner notifications are broadcast to ALL owners of ALL gyms — `getOwnerNotifications()` filters by `recipientRole: "owner"` but not by `gymId`. Owner of gym B sees gym A's notifications. | `lib/firebase/read-models.ts:450` |
| N2 | P1 | `clearUserNotifications` ownership check uses `notification.recipientId.includes(currentUser.gymId)` — string includes on a UUID is fragile and can produce false matches. | `lib/firebase/actions.ts:822` |
| N3 | P2 | `Notification.type` TypeScript union is missing `"password_reset_request"`, `"member_access_toggled"`, `"member_created"` values that are used in action writes. TypeScript casts hide this. | `types/domain.ts` |

---

### Functional Fix Roadmap (Priority Order)

**Fixes must be done in this order — later fixes depend on earlier ones.**

#### Phase F0 — Critical Bugs (Break core functionality or corrupt data)

- [x] **F0-1: Contact form field names** — renamed `number`→`mobile` and `requirement`→`body` in `app/about/page.tsx`. (C1)
- [x] **F0-2: Member empty state fallback** — removed `?? programs[0]` fallback in `app/member/page.tsx:47`; null program now shows the "No plan assigned" empty state. (M1)
- [x] **F0-3: Profile page role split** — `/profile` now branches by role: member sees full form + AI summary, admin sees identity card (name/email/uid), owner sees gym name/role card. No body metrics for non-members. (A1, M2)
- [x] **F0-4: `updateMemberProfile` gym** — already correct: reads `defaultGymId` from existing Firestore doc at line 468. Not a bug in current code.
- [x] **F0-5: `deleteMemberProfile` cleanup** — added batch delete of `programAssignments`, `liftLogs`, `notifications`, `workoutSessions`, `attendanceRecords` before profile delete. (O3)
- [x] **F0-6: `updateProfileMetrics` role corruption** — removed `role: "member"` and `defaultGymId: PRIMARY_GYM_ID` from the Firestore write; only metrics fields are updated. (M3)
- [x] **F0-7: Trainer access restriction** — added `staffType` field to `AuthenticatedUser` and `ProfileRecord` in `lib/auth.ts`. Added `requireOwner()` export that throws for `staffType: "trainer"` / `"staff"`. Applied to `createMemberProfile`, `deleteMemberProfile`, `resetPassword`, `toggleMemberAccess`, `createCatalogExercise`, `createCustomWorkoutProgram`. Trainers can still call `assignProgramToMember`, `generateAndAssignProgram`, `updateMemberProfile`. (T1)

#### Phase F1 — Wrong Behavior (Data reads wrong or UX misleads)

- [x] **F1-1: Owner reads gym-scoped** — `getMembers`, `getWorkoutPrograms`, `getExerciseCatalog`, `getActiveProgramAssignments`, `getActiveWorkoutSessions` accept optional `gymId` param; all owner pages pass `currentUser.gymId`. (O1)
- [x] **F1-2: Owner notifications gym-scoped** — `getOwnerNotifications(gymId?)` accepts gym filter; owner dashboard passes `currentUser.gymId`. (N1)
- [x] **F1-3: `assignProgramToMember` uses current user ID** — replaced hardcoded `PRIMARY_OWNER_ID` with `currentUser.uid`. (O8)
- [x] **F1-4: Owner dashboard empty "needs plans" section** — shows "All members have a program assigned." when unassigned count is 0. (O6)
- [x] **F1-5: Trainer dashboard** — detects `staffType` from session; trainers see "Trainer dashboard" label, read-only "View members" CTA, no exercise catalog link. (T2)
- [x] **F1-6: `resetPassword` success message** — no longer echoes the PIN value. (A4)
- [x] **F1-7: Demo lift log fallback** — removed hardcoded demo bench press logs; empty member now sees empty state. (M6)
- [x] **F1-8: `clearUserNotifications` ownership check** — removed fragile `.includes(gymId)` on UUID recipientId. (N2)
- [x] **F1-9: Owner member detail shows body metrics** — `getProfileMetrics` fetched in parallel; body metrics panel rendered in aside when available. (O9)
- [x] **F1-10: Admin notifications** — `getAdminNotifications()` added; layout fetches it for admin role. (A5)
- [x] **F1-11: `memberCount` bookkeeping** — `createMemberProfile` increments, `deleteMemberProfile` decrements `GymWorkspace.memberCount`. (A6, O7)

#### Phase F2 — Missing Features (Functionality gap, not a bug)

- [x] **F2-1: Member self-service PIN change** — `changeMemberPin` action + form on member `/profile` page. (M4)
- [x] **F2-2: Reps field guidance** — placeholder updated to `"e.g. 10 or 8,8,7"` with tooltip in lift log form. (M5)
- [x] **F2-3: `assignedTrainer` dropdown** — `ProfileForm` now renders `<select>` from `getOwnersForGym()` trainers when available. (O11)
- [x] **F2-4: Admin simple profile page** — completed in F0-3; identity card shown (no body metrics). (A1)
- [x] **F2-5: Owner simple profile page** — completed in F0-3; gym name + role card shown. (A1)
- [x] **F2-6: Admin/owner password change** — `changeStaffPassword` action + form on admin and owner `/profile` pages. (A3)
- [x] **F2-7: `WorkspaceSwitcher` removed from owner pages** — removed from owner/page, exercises, programs. Kept on admin page. (A2, O5)
- [x] **F2-8: Session expiry warning** — `SessionTimeout` shows sticky warning banner at T-5 min with countdown and dismiss. (M7)
- [x] **F2-9: Activity events for all mutations** — emitted on member create, access toggle, and delete. (O12)
- [x] **F2-10: `CustomPlanBuilder` multi-day** — full day tab UI with add/remove days, per-day exercise picker, serialised to JSON. (O10)
- [x] **F2-11: Fix `Notification.type` TypeScript union** — 5 new notification types added. (N3)

---

**Note on multi-gym scope:** Issues O1–O2 affecting gym data isolation are architectural. If FitSplit remains SHG-only for the foreseeable future, O1 hardcoding is acceptable for now but O2 (data corruption) must still be fixed because admin edits can corrupt member gym assignment.

---

## Latest Update - 2026-05-18: Phase F2 missing features + UI polish (session 6)

### F2 feature additions
- **F2-11**: Added `password_reset_request`, `member_access_toggled`, `member_created`, `access_suspended`, `access_restored` to `Notification.type` union in `types/domain.ts`.
- **F2-2**: Reps input placeholder updated to `"e.g. 10 or 8,8,7"` with descriptive `title` tooltip in `member-workout-console.tsx`.
- **F2-7**: Removed non-functional `WorkspaceSwitcher` from `app/owner/page.tsx`, `app/owner/exercises/page.tsx`, `app/owner/programs/page.tsx`. Kept on admin page where "Manage gyms" link is useful.
- **F2-8**: `SessionTimeout` upgraded to show a sticky warning banner at T-5 minutes before forced logout, with live minute countdown and dismiss button.
- **F2-9**: Activity events now emitted on `createMemberProfile` (member joined), `toggleMemberAccess` (access suspended/restored), and `deleteMemberProfile` (member removed). All write to `activityEvents` with `gymId` and `memberId` set correctly.
- **F2-1**: `changeMemberPin` server action added to `actions.ts`; PIN change form (current → new → confirm) added to member `/profile` page.
- **F2-6**: `changeStaffPassword` server action added to `actions.ts`; password change form added to admin and owner `/profile` pages.
- **F2-3**: `assignedTrainer` field in `ProfileForm` now renders a `<select>` populated from `getOwnersForGym()` when trainers are available; falls back to text input otherwise. Profile page passes `trainers` prop.
- **F2-10**: `CustomPlanBuilder` rewritten to support adding/removing multiple workout days (up to 7). Each day has its own title, exercise list, sets, and reps. Serialises to JSON `days` field. `createCustomWorkoutProgram` action updated to parse multi-day JSON or fall back to legacy single-day format.
- **F2-4/F2-5**: Admin and owner profile pages were already split in F0-3. Password change form added to both.
- **`ConfirmActionForm`**: Added optional `onBeforeConfirm` callback prop (called before the confirmed submit fires).

### Landing page UI fixes
- Fixed hero subheadline — removed duplicate "workspace" (was "one calm workspace…one focused workspace").
- Bento card stat `0 / focused trainer workflow` changed to `1 / place for every training op` with updated body copy.
- Step cycling interval slowed from 800ms → 2400ms (was too fast to read).
- Footer copyright updated: `© 2025` → `© 2026`.
- Added social proof line under hero CTAs: "Used by Sri Shakthi Hanuman Gym & Titan V2 Fitness".
- Workflow bento section header made center-aligned with subtitle text.
- Feature grid and bento grid now stay 2-column at 480–768px (tablets/large phones) instead of collapsing to 1 column.

### Members page UI improvements
- `MemberRow` now shows phone number (clickable `tel:` link), join date, and a visible Active/Inactive status pill alongside the toggle button.
- Member list panel header now shows total member count badge.
- `member-row` grid expanded from 4 to 5 columns (avatar, info, status badge, access toggle, view button).
- `status-inactive` CSS class added (red pill for inactive members).
- Mobile layout maintains correct 2-column stacking for the extra columns.

---

## Latest Update - 2026-05-18: End-to-end flow fixes (session 2)

### Security & auth fixes
- **`createCatalogExercise` / `createCustomWorkoutProgram`**: Added missing `requireRole(["admin","owner"])` guards — these were callable by any user with a session.
- **`createOwnerProfile`**: Fixed Auth/Firestore creation order (Auth first, then Firestore) so duplicate email errors fail clean without leaving orphaned Firestore docs. Also added `avatarInitials` derived from name.
- **`generateWorkoutSummary` in `lib/ai.ts`**: Added `requireAuth()` guard; members can only generate their own summary, preventing Gemini API quota abuse.

### Data persistence fixes
- **`EditableMetrics` body metrics (member dashboard hero)**: The edit form was only calling `setIsEditing(false)` — changes were lost on refresh. Now calls `updateProfileMetrics` server action on save, shows a pending/error state.
- **Member notifications in topbar**: Layout never fetched `getMemberNotifications`, so the notification bell badge was always 0 for logged-in members. Fixed in `app/layout.tsx`.

### Admin / cache fixes
- **`app/admin/inbox/page.tsx`**: Added `export const dynamic = "force-dynamic"` — inbox was potentially serving cached state.
- **`components/ai-program-brief.tsx`** (Phase 1 complete): New client component wires textarea to `generateAndAssignProgram` — the brief textarea was previously purely decorative.
- **`AddStaffForm` / `AddGymForm`**: New client components replacing static server forms on admin pages, with confirm dialogs, success/error modals, and live slug preview.
- **`toggleMemberAccess`**: Added missing `revalidatePath("/owner")` so owner dashboard updates after toggling member access.
- **`var(--text-muted)` undefined variable**: Replaced with `var(--text-soft)` across member detail, gym detail, and notification list.

---

## Latest Update - 2026-05-18: Phase 1 + Phase 2 batch

### Phase 1 fixes
- **Dark mode as default**: `data-theme="dark"` on `<html>` at SSR, `ThemeToggle` state defaults to dark. No FOUC for first-time visitors.
- **Exercise card collapse**: instructions in `<details>`/`<summary>` with animated arrow. Name + meta always visible.
- **Log Set form reset**: `liftFormRef.current.reset()` after successful submission clears weight field.
- **Topbar drawer gym name**: replaced hardcoded "FitSplit x SHG Gym" with dynamic `gymName` prop.
- **Hero separator**: added `border: none` to `.md-hero` to neutralize any inherited UA border.
- **Mobile layout**: tighter padding at ≤860px, 2-col lift-log-fields (1-col at ≤480px), reduced hero padding.
- **CSS deduplication**: removed dead `.content-grid` block; removed redundant `.topbar` block (bar-style with `border-bottom`); removed dead `background/border/box-shadow` from second `.topbar` block; merged two `.panel-title` blocks into one canonical definition.
- **`getMemberWithProfile`**: new read-model that combines `getMemberDetail` + `getProfileMetrics` into a single Firestore doc read. Member page updated to use it.
- **Session/role guard audit**: all routes and server actions verified — guards are correctly placed.
- **No PDF button found**: no PDF code in codebase; likely a browser extension. Not a code issue.
- **Training Notes/Gym Rules**: not found in current codebase — already removed. Handoff item was stale.

### Phase 2 features
- **Progress chart in member console**: `ProgressChart` (which was imported but unused) now renders in a collapsible panel below Lift History. Shows weight-over-time line chart per exercise.
- **Personal records (PRs)**: 🏆 indicator on lift history rows that match the current max for that exercise. "New PR!" toast on submission when new weight exceeds previous max.
- **First-run empty state**: shows gym name, phone link, and email link from Firestore when no program is assigned.
- **Streak tracker**: already in hero from previous session (🔥 N days this week badge).

## Latest Update - 2026-05-17: Documentation baseline cleanup

- Follow-up: added Titan V2 Fitness to the public landing page Partners section in the same card format as SHG Gym.
- Added `public/titan-v2-fitness-logo.svg` as the partner logo asset.
- Updated README landing features to mention SHG and Titan V2 Fitness partner proof.
- Added this `Current Source Of Truth` section to make the handoff reliable at a glance.
- Clarified current route behavior, active credentials, product focus, and explicit out-of-scope items.
- Left older dated entries below as archive/history, even where older notes conflict with the current source of truth.
- README should remain the shorter public/current reference; this file remains the deeper operational handoff.

---

## Context

FitSplit × SHG is built exclusively for **Sri Shakthi Hanuman Gym (SHG)** members and staff. It is not a generic multi-gym SaaS product. All features, copy, and UX decisions should reflect that single-gym context. The second "Dummy Gym" workspace exists only for admin testing.

---

## Roadmap & TODOs

### Phase 1: Bugs & Polish (In Progress)

#### UI/Layout Fixes
- [x] **Topbar brand simplification** — gym identity in drawer only; topbar shows FitSplit logo + name.
- [x] **Day tabs fade edge** — fade mask already existed; confirmed working.
- [x] **Topbar gym name** — drawer now uses dynamic `gymName` prop from Firestore.
- [x] **Hero separator line** — `border: none` added to `.md-hero`.
- [x] **`member-meta` "none" values** — filter already in exercise-list.tsx; confirmed working.
- [x] **PDF floating button** — no code found; browser extension artifact.
- [x] **Training Notes / Gym Rules** — already removed from codebase; stale handoff item.
- [x] **Mobile layout** — content-grid/hero padding tightened; lift-log-fields 2-col at ≤860px, 1-col at ≤480px.
- [x] **Dark mode as default** — `data-theme="dark"` on `<html>` SSR; ThemeToggle defaults to dark.

#### Functional Fixes
- [x] **Log Set feedback** — success toast present; form auto-resets via `liftFormRef.current.reset()`.
- [x] **Empty lift history state** — "No sets logged yet" message in place.
- [x] **Exercise card collapse** — instructions in `<details>` with animated arrow.
- [x] **First-run onboarding card** — shows gym name, phone, email from Firestore.
- [x] **Fix owner creation/onboarding flow** — createOwnerProfile: Auth first then Firestore, avatarInitials added. AddStaffForm client component on gym detail page.
- [x] **Gym workspace creation/management** — AddGymForm client component with live slug preview; createGymWorkspace has auth guard.
- [x] **Member creation and role assignment** — audited; auth guards added to createCatalogExercise and createCustomWorkoutProgram.
- [x] **Session/role guard audit** — all routes and server actions verified; guards correctly placed.
- [x] **`getProfileMetrics` + `getMemberDetail` merge** — combined into `getMemberWithProfile` (one Firestore read).
- [x] **`globals.css` cleanup** — ~9500 lines cleaned up by extracting landing page styles into `landing.css` and cleaning up duplicates.

### Phase 2: Member Features (SHG-specific)

- [x] **Progress charts** — `ProgressChart` component (Recharts line chart) now rendered in collapsible panel below Lift History in member console.
- [x] **Streak / consistency tracker** — 🔥 N days this week badge in member hero (derived from liftLogs).
- [x] **Personal records (PRs)** — 🏆 in lift history table rows at current max weight; "New PR!" toast on submission.
- [ ] **Nutrition target card** — daily protein/calorie target set by admin per member, displayed as a simple progress bar in the member dashboard. Read from member Firestore profile.

### Phase 3: Admin / Owner Features (SHG-specific)

- [ ] **Member attendance heatmap** — who attended, when, how often. Firestore attendance collection already exists.
- [ ] **Broadcast notifications** — admin sends a push/in-app notification to all SHG members or a filtered group (e.g. "Gym closed Saturday"). Use existing notification Firestore collection.
- [ ] **Program bulk assignment** — assign a program to multiple members at once (e.g. all beginners → Starter Plan), rather than one by one.
- [ ] **Revenue / billing dashboard** — track membership fees, payment status, overdue members. New Firestore collections needed: `payments`, `membership_plans`.
- [ ] **Exercise video upload UI** — admin UI to upload exercise thumbnails/videos to Firebase Storage and link to the exercise catalog.
- [ ] **Firebase Storage avatar upload** — member profile photos and staff images.

### Phase 4: Infrastructure

- [ ] **OTP-based PIN reset** — member PIN reset via OTP (SMS/email). Staff password reset approval via owner/admin. Abuse limits, expiry, audit trail.
- [ ] **Firebase Cloud Messaging** — push reminders for workout days, rest day tips, gym announcements.
- [ ] **Production geofence** — configure actual SHG Gym GPS coordinates for attendance geofencing.
- [ ] **Inline styles → CSS classes** — member-workout-console.tsx has ~40 `style={{}}` props; move to named CSS classes.

## Latest Update - 2026-05-17: Replace hero grid with app mockup

- Removed abstract `WorkoutGrid` (animated green squares) from hero — users had no idea what it represented.
- Replaced with `AppMockup`: a realistic member workout card showing gym name, plan tag (Push Day), today's exercises with sets/reps/weight, completion progress ring (2/4), and a "Log Next Set" CTA.
- Active exercise row cycles every 2.2s to hint at live interaction.
- Added `lp-mockup-*` CSS in `globals.css`; removed `lp-grid`, `lp-cell-*`, `lp-chips`, `lp-chip` CSS.

---

## Latest Update - 2026-05-17: Hero viewport fit fix

- Reduced `.lp-h1` font size from `clamp(52px, 7vw, 88px)` to `clamp(36px, 4.2vw, 58px)` — headline was overflowing the viewport.
- Reduced hero top padding from `120px` to `80px` and bottom from `80px` to `48px`.
- Reduced `.lp-hero-inner` gap from `64px` to `40px` and `.lp-hero-copy` gap from `28px` to `18px`.
- Reduced `.lp-subheadline` from `17px` to `15px`.
- All hero elements (FitSplit branding, eyebrow, headline, subheadline, CTA, workout grid + chips) now fit in one viewport without scrolling.

---

## Latest Update - 2026-05-17: Member dashboard UI revamp

- Rewrote `app/member/page.tsx` with a premium `md-*` layout: contextual greeting, hero section showing program title + week/sets badges, inline editable metrics (Age, Weight, Height, BMI) in the hero.
- Added full `md-*` CSS section to `app/globals.css` covering `.md-page`, `.md-hero`, `.md-hero-inner`, `.md-greeting`, `.md-hero-title`, `.md-hero-meta`, `.md-badge`, `.md-badge-accent`, `.md-hero-metrics`, `.md-empty` — consistent with the dark `#0A0A0A` / `#C8F135` palette.
- Updated dark theme CSS vars (`--bg`, `--bg-elevated`, `--brand`, `--primary`) to match the landing page aesthetic throughout the entire authenticated app.
- Fixed `app-topbar.tsx` infinite re-render: removed `useEffect([notifications])` that caused a render loop (default `[]` parameter creates new array ref each render).
- Reverted `app/page.tsx` to serve `<LandingPageClient />` directly — removed Codex-added role-based redirects.
- Fixed `app/layout.tsx` to skip Firestore reads for unauthenticated visitors (cookie check only).
- Replaced animated green grid in landing page hero with realistic `AppMockup` workout card component.
- Fixed framer-motion blank-page issue on fresh server start using `useMounted` pattern (`initial={false}` until hydration).

---

## Latest Update - 2026-05-17: Premium dark B2B landing page redesign

- Rebuilt `components/landing-page-client.tsx` from scratch as a Linear/Vercel/Raycast-inspired dark SaaS landing page.
- Installed `framer-motion` (v11) for all animations.
- Added Syne (700/800) + DM Sans (400/500) fonts to `app/layout.tsx` alongside existing Inter.
- Design tokens scoped to `.lp-root` (CSS variables `--lp-*`) — completely isolated from the authenticated app shell.
- Sections: Navbar → Hero → Feature strip → How it works → Audience pills → Workflow bento → Partners → Footer → Login modal.
- Hero uses `/bg-image.png` as a 12%-opacity gym background with dark gradient overlay + radial lime glow. Animated 6×4 workout grid replaces old trainer workspace widget; cells cycle active→done every 4s. Floating metric chips animate in on load.
- Gradient animated text on "every member" in H1.
- Custom springy cursor (desktop only, hidden on touch). SVG noise overlay at 3% opacity. Reduced-motion support via `useReducedMotion()`.
- Hero content fades on scroll via `useScroll`/`useTransform`.
- Navbar blurs with `backdrop-filter` after 60px scroll.
- Login modal: `AnimatePresence` scale/opacity, animated tab underline via `layoutId`, full Firebase auth preserved (loginWithCredentials, requestPasswordReset, Escape/outside close).
- Appended ~500 lines of scoped `lp-*` CSS to `globals.css`.
- Verification: `npm run typecheck` ✅ · `npm run build` ✅

## Latest Update - 2026-05-17: Claude onboarded as co-developer

- Claude read the full codebase (layout, auth, Firestore collections, domain types, read-models, key components) and built persistent project memory.
- Established co-developer protocol: both Claude and Codex must update README.md + PROJECT_HANDOFF.md after every change session.
- Added "Co-Developer Notes" section to README.md and "Co-Developer Protocol" section to this file.
- No functional code changes in this session — onboarding/orientation pass only.

## Latest Update - 2026-05-13: Login Enter Key + Reset Request UX

- Follow-up on 2026-05-17: fixed landing page UI regressions:
  - restored authenticated `/` routing so logged-in admin/owner/member users go to their role dashboard instead of seeing public landing mixed with app chrome.
  - polished the active landing layout with a cleaner floating nav, stronger hero hierarchy, calmer cards, better mobile spacing, and no horizontal overflow.
  - removed reappeared public demo-oriented and billing-limitation copy from the active landing page.
  - verified unauthenticated `/` returns the landing page and `npm.cmd run typecheck` passes.
- Follow-up on 2026-05-15: refined the public landing page into a cleaner premium product showcase:
  - removed the old Trainer Command hero widget and fake dashboard/stat cards.
  - changed hero copy to "Deliver structured workouts to every member."
  - added outcome-focused "Why gyms use FitSplit" cards.
  - simplified the workflow to Create plans, Assign members, Members follow workouts, Track progress.
  - added realistic workflow preview cards for assignment, member workout view, progress, and owner actions.
  - kept the SHG partner section calm and static.
  - compacted the footer/contact area while preserving the Firestore-backed contact action and login modal.
- Follow-up: corrected member management UX:
  - logged-in users visiting `/` are redirected to their role dashboard, and login now uses history replacement so browser Back does not return them to the landing page.
  - Back button now routes to the role/top-level page instead of raw browser history.
  - profile/logout dropdown styling was aligned with the app UI.
  - member creation now preserves form values on errors and only clears after success.
  - member creation validates before Firestore persistence and uses generated member Auth emails so multiple members can share the same contact email.
  - inactive members remain visible in the members list, and profile edits no longer reactivate suspended members.
  - member Active/Inactive toggles were repaired for list and detail pages.
  - program assignment was moved into selectable cards on the member detail page.
  - AI program brief now has a Generate action that uses Gemini when configured and falls back to a deterministic saved-program match.
  - attendance calendar panels and attendance copy were removed from member/owner-facing pages.
  - member detail now includes a delete member action.
  - members list now supports sorting by name, newest, oldest, active, and inactive.
- Follow-up: regenerated FitSplit favicon/PWA icon assets as transparent logo-mark files and bumped manifest/favicon versions to clear stale browser-tab icon caching.
- Fixed login form keyboard behavior so pressing Enter from username/password fields submits the login form.
- Added "Forgot password?" to both active login experiences:
  - member reset requests show a confirmation dialog explaining the request goes to the gym owner and the member should contact them for the new PIN.
  - staff reset requests show a confirmation dialog explaining the request goes to the gym owner and admin.
- Added a Firestore-backed password reset request notification path for owner/admin recipients when Firebase Admin is configured.
- Scoped the Training Notes/Gym Rules footer to member pages only.
- Updated owner member access controls into compact Active/Inactive switch-style toggles on both the members list and member detail page.

## Latest Update - 2026-05-13: Focused Landing Page Redesign

- Follow-up: removed the remaining `Get Started` CTAs from the active landing page so Login is the only auth entry point.
- Follow-up: improved login speed by removing workspace seeding from the sign-in hot path and using lighter session-cookie verification on normal authenticated page reads.
- Follow-up: removed demo-oriented wording from the active landing page and login modal helper copy.
- Removed outdated product limitation copy from the public landing page.
- Rebuilt the public `/` landing page into the requested five-section, dark-first FitSplit marketing site:
  - Navbar
  - Hero
  - How It Works
  - Features + Product Previews
  - Partners
  - Footer with compact contact form
- Removed the duplicated public landing sections from the active route: product overview strip, trainer/admin overview, repeated CTA strip, partner marquee, inline bottom login form, and landing navbar Install App button.
- Added a centered login modal wired to the existing Firebase Auth/session-cookie flow.
  - Member tab: mobile/email + 4-digit PIN.
  - Staff tab: username + password.
  - Successful login still redirects by role and resets scroll to top.
- Kept the existing PWA/service worker/manifest setup intact while removing the landing nav Install App CTA.
- Kept the SHG partner logo to the Partners section only, using `public/shg-gym-logo.jpeg`.
- Added a compact footer contact form and extended the existing Firestore `contactMessages` server action to accept this footer form without breaking the full Contact Us form/admin inbox.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`
  - local `/` HTTP + CSS 200 on `http://localhost:3000`

## Latest Update - 2026-05-12: Premium Matte Landing Refresh

- Refactored `/` into a cohesive matte-black premium SaaS landing page that matches the authenticated app visual language.
- Rebuilt the public storytelling flow around:
  - Hero
  - Product overview
  - Features
  - App previews
  - Trainer/Admin overview
  - Our Partners
  - Testimonials/trust
  - Contact
  - Final CTA
  - Login
- Added a data-driven `Our Partners` section with a smooth infinite SHG Gym logo carousel using `public/shg-gym-logo.jpeg`.
- Kept SHG partner branding off the public hero/nav; the landing page remains FitSplit-first, while SHG branding appears in the partner section and authenticated SHG workspace.
- Polished the landing navbar into a compact matte floating header with Home, Features, Partners, Contact, Login, theme toggle support, and an Install App CTA.
- Added premium matte styling for the PWA install banner, contact section, login band, product preview cards, and landing footer.
- Removed the stale `memberships` collection reference from the README to match the current Firestore model focus.
- Verification passed:
  - local `/` HTTP 200 on `http://localhost:3000`
  - `npm.cmd run typecheck`
  - `npm.cmd run build`

## Latest Update - 2026-05-12: SHG Gym Initial rollout Rename + Partner Branding

- Renamed the primary initial rollout workspace from the earlier gym identity to `Sri Shakthi Hanuman Gym`.
- Standardized the primary gym identifiers:
  - Gym id / slug: `shg`
  - Owner id / username: `santosh-shg`
  - Owner auth email: `santosh-shg@fitsplit.app`
- Added the SHG Gym logo from the supplied WhatsApp image as `public/shg-gym-logo.jpeg`.
- Updated the authenticated app topbar to show a FitSplit x SHG Gym logo lockup after users log in to the SHG Gym workspace.
- Kept the public landing page FitSplit-only so visitors see the product brand before login.
- Fixed the landing break caused by the global Next loading fallback remaining visible over the home page.
- Updated the service worker to stop caching dynamic Next pages/RSC responses, preventing stale loading shells from coming back.
- Tightened mobile landing navigation so the brand and hamburger stay in one compact row.
- Added SHG demo staff profiles for two trainers: `shg-trainer-1` and `shg-trainer-2`, both using password `password`.
- Ensured the SHG demo workspace seeds five editable member profiles and filters the previous legacy initial rollout gym out of the gyms page.
- Updated mock fallbacks, Firebase seed scripts, auth demo mapping, workspace switcher, owner/admin copy, and read models to use SHG Gym.
- Removed direct app/docs/script references to the previous initial rollout gym name.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local `/` HTTP 200 on `http://localhost:3000`

## Latest Update - 2026-05-06: Landing Contact + Admin Inbox

- Removed the public landing-page footer credit so the credit only appears in the logged-in app footer.
- Regenerated public logo assets from `lib/images` to remove the white halo around the dark logo on dark backgrounds.
- Added a landing-page dark/light theme toggle in the glass navbar and improved the mobile navbar layout.
- Added a landing contact form with required name, mobile number, message body, and optional email.
- Contact submissions now create Firestore `contactMessages` records with `unread` status and create an admin notification record.
- Added `/admin/inbox` for admins to view contact messages, call back, and mark messages as read.
- Added an admin hamburger-menu Inbox link with unread badge; the hamburger button shows a notification dot when unread messages exist.
- Fixed Gemini partial implementation issues:
  - contact form field names now match the server action.
  - unread count now checks `unread`, not `new`.
  - unread count is loaded server-side in the layout instead of calling a server function from the client topbar.
  - inbox message read action is wired through a valid server form action.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local `/` and CSS asset HTTP 200 on `http://localhost:3000`

## Latest Update - 2026-05-05: Premium SaaS Landing V2

- Rebuilt `/` into the requested modern FitSplit SaaS landing flow:
  - Hero
  - Who it is for
  - How it works
  - Interactive plan builder preview
  - Product previews
  - Feature bento grid
  - Before vs After
  - About + Contact
  - CTA
  - Footer
- Added `components/landing-nav.tsx` with a fixed glassmorphism navbar, desktop links, and mobile hamburger menu.
- Removed Contact from the top nav; contact details now live inside the About + Contact section.
- Updated hero copy to: "Assign better workouts. Track member progress. Keep training simple."
- Expanded the interactive demo to support Goal, Days, and Level, with dynamic split, exercise cards, sets/reps, rest time, and assigned-member preview.
- Added About copy and developer card for Mehul Chirania with Bengaluru, India and phone contact.
- Footer now uses the exact requested text: `© 2026 FitSplit. Made with 💪 by Mehul Chirania.`
- Follow-up fix: restarted the local Next dev server after CSS 404s caused the landing page to render unstyled.
- Follow-up fix: tightened hero typography/spacing and added mobile-safe width/wrapping rules for the hero and preview cards.
- Follow-up logo update: copied the new dark/light logo assets from `lib/images` into `public/fitsplit-logo-dark.png` and `public/fitsplit-logo-light.png` for browser use.
- Follow-up logo update: replaced the old neon icon in the landing nav, landing hero, About developer card, app topbar, and manifest icon.
- Follow-up hero update: changed the first viewport from two competing cards into a centered brand-first introduction with the product mockup below it.
- Follow-up layout update: removed the unnecessary slant from the hero product mockup and aligned the supporting cards.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local `/` HTTP 200 check on `http://localhost:3000`
  - local landing CSS asset HTTP 200 check

## Latest Update - 2026-05-05: Landing Navigation Polish

- Added a sticky glass landing navbar on `/` with immediate access to About us, Demo, Contact, and Login so daily users do not have to scroll to the bottom first.
- Reduced the hero headline scale for "Manage your members' workouts in one place." on desktop and mobile.
- Kept the landing palette consistent with a black/white/grey base and subtle cyan accent instead of the earlier green-to-black hue shift.
- Reworked landing scroll animation to fade sections in and out instead of using vertical motion/scale.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local `/` HTTP 200 check on `http://localhost:3000`

## Latest Update - 2026-05-05: Trainer-Focused Landing Page

- Rebuilt `/` as a high-conversion FitSplit landing page focused on gym owners/trainers and members.
- Added role-separated positioning:
  - trainers create, assign, and track workout plans.
  - members log in, view assigned workouts, and track performance.
- Added product-preview panels for trainer dashboard, member workout screen, and progress tracking.
- Added `components/sample-plan-demo.tsx`, an interactive sample split generator driven by goal and days per week.
- Replaced generic carousel-led messaging with SaaS-style sections: hero, proof, who it is for, how it works, role-based features, product preview, interactive demo, testimonials, repeated CTA, and login.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local desktop/mobile screenshot checks with no horizontal overflow

## Latest Update - 2026-05-05: Gym Staff Access Controls

- Reworked `/admin/gyms/[gymId]` from "Gym Owners" to "Gym Staff".
- Staff records now support `owner`, `trainer`, and `staff` categories through the admin add-staff form.
- Added a compact access toggle on the gym detail page.
- Gym access toggle now enables/disables Firebase Auth access for all owner/staff and member profiles in that gym, not just the gym status label.
- Added a delete action beside reset password for gym staff; deleting removes the Firestore profile and Firebase Auth user.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local `/admin/gyms/shg` render check for Gym Staff, access toggle, reset, and delete controls

## Latest Update - 2026-05-05: Auth Hardening and Firestore Rules

- Local Firebase Admin is now the required path for auth-backed local server actions.
- `scripts/seed-firebase-auth.mjs` now loads `.env.local` before seeding Firebase Auth users.
- Seeded demo Auth users with staff password `password` and member PIN `1234`.
- Demo login resolution now uses real Firebase Auth when Admin credentials are configured.
- Fixed server-render session handling so invalid Firebase session cookies do not attempt cookie mutation during page render.
- Normalized `santosh-shg` login to `santosh-shg@fitsplit.app`.
- Member creation is now gym-scoped to the authenticated owner/admin instead of hard-coding the initial rollout gym.
- Logout now signs out the Firebase browser session before clearing the server session.
- Hardened and deployed Firestore rules:
  - admin can manage all gyms and records.
  - owners are scoped to their assigned gym.
  - members are scoped to their own profile, workout sessions, logs, assignments, attendance, and notifications.
- Verification passed:
  - `npm.cmd run seed:auth`
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - local admin/member/owner redirect checks
  - `firebase.cmd deploy --only firestore:rules --project fitsplit-29215`

## Latest Update - 2026-05-05: Hosted Demo Login Fix

- Fixed hosted login failure where demo usernames such as `admin`, `santosh-shg`, and member mobile logins were routed through real Firebase Auth on Firebase App Hosting.
- Demo credentials now resolve to the local demo-session path first, even when Firebase Admin is configured in the hosted environment.
- Route guards now accept the demo compatibility cookies when no Firebase session cookie is present, so hosted demo users can reach `/admin`, `/owner`, and `/member`.
- Real Firebase Auth remains available for non-demo accounts.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`

## Latest Update - 2026-05-05: Firebase Auth Integration

- Main page revamp: `/` is now an intro landing page before login.
- Added a hero section with FitSplit branding, stock gym background image, and an “Explore features” smooth-scroll CTA.
- Added `components/feature-carousel.tsx` with auto-advancing feature slides, stock gym imagery, previous/next controls, and dot navigation.
- Added a “Login now” CTA after the carousel that scrolls to the login section.
- Existing login form remains available below the intro content, with member/staff local demo credentials preserved.
- Added landing/carousel/login page CSS in `app/globals.css`.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`

- Follow-up UI fix: login page now always renders the login experience at `/` instead of redirecting logged-in local users through the loader.
- Rebuilt `components/login-form.tsx` into a dedicated two-panel glass login UI with member/staff tabs, clear local demo credentials, cleaner labels, and proper error/success states.
- Added login-specific responsive CSS in `app/globals.css`; tablet/mobile layout now keeps the form visible above the fold.
- Added a mount scroll reset so returning to `/` does not preserve a previous page scroll offset and clip the login hero.
- Verified visually in the in-app browser at `http://localhost:3000` for both Member and Staff tabs.
- Verification passed:
  - `npm.cmd run typecheck`

- Follow-up fix: added a local demo-session fallback when Firebase Admin credentials are not configured locally.
- Local login now works without Firebase Admin credentials:
  - Staff tab: `admin` / `password` -> `/admin`
  - Member tab: `9688227039` / `1234` -> `/member`
- Real Firebase Auth remains the production path when Admin credentials are configured.
- Verified in the in-app browser on `http://localhost:3000`:
  - Staff login reaches `/admin`.
  - Member login reaches `/member`.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`

- Follow-up fix: login page was hanging locally because `.env.local` had only `FIREBASE_PROJECT_ID`, so Firebase Admin SDK tried Application Default Credentials that are not configured on this machine.
- `lib/firebase/admin.ts` now treats Admin as configured only when a service account/private key is present or when running in a Google runtime / ADC environment.
- Fixed new Antigravity compile errors:
  - Added `Settings` icon export.
  - Allowed `style` on `ConfirmActionForm`.
  - Imported `Role` in Firebase actions.
  - Added `isActive` to mock members.
  - Hardened `getGymDetail` data typing.
- Local login page now renders and submit returns the setup message instead of hanging:
  - `Firebase Admin is not configured on the server yet.`
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`

- Replaced the mock password/cookie login flow with Firebase Auth email/password sign-in.
- `components/login-form.tsx` now resolves demo usernames/mobile numbers to Firebase Auth emails, signs in with the Firebase Web SDK, sends the ID token to the server, and supports Firebase password reset emails.
- `lib/auth.ts` now creates/verifies Firebase Admin session cookies and exposes `requireAuth` / `requireRole` guards.
- Protected routes now enforce roles server-side:
  - `/admin` requires admin.
  - `/owner/*` requires admin or owner.
  - `/member` requires member.
  - `/profile` and `/activity` require a signed-in user.
- Role-aware top navigation now hides owner/admin links from members.
- Member dashboard/profile now use the authenticated member ID instead of the old `fitsplit-member-id` fallback cookie.
- Added `scripts/seed-firebase-auth.mjs` and `npm run seed:auth` to create demo Firebase Auth accounts:
  - `admin`
  - `santosh-shg`
  - `dummy-gym-owner-1`
  - demo member emails/phones, including Mehul.
- Firestore profile seeding now includes `authEmail` and `username` fields used by login resolution.
- New member creation now creates a matching Firebase Auth user and custom claims.
- Firestore rules were updated for `recipientId` notifications and `attendanceRecords`.
- Local `.env.local` was converted from UTF-16 to UTF-8 and public Firebase web config was added for local browser sign-in.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`
- Attempted `npm.cmd run seed:auth`, but local Firebase Admin credentials are missing. Run one of these before seeding:
  - `gcloud auth application-default login`
  - or set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.

## Latest Update - 2026-05-05: Login Keyboard Submit Fix

- Fixed login keyboard behavior where pressing Enter in the password field did not submit the login form.
- Split Forgot Password into its own form so it no longer competes with the main login submit action.
- Added an Enter key handler on the login form that explicitly triggers the login submit button for reliable keyboard access.
- Verified in the in-app browser:
  - Enter from the password field logs in and navigates to `/admin`.
  - Enter while the Log in button is focused also logs in and navigates to `/admin`.
- Verification passed:
  - `npm.cmd run typecheck`

## Latest Update - 2026-05-05: Login Reveal Fix

- Fixed login page invisibility caused by scroll reveal applying `reveal-on-scroll` to the `/` login form.
- `components/scroll-reveal.tsx` now excludes the login route and clears reveal classes when returning to `/`.
- Verified in the in-app browser at `http://localhost:3001/`: login form is visible and the red Next dev issue badge is gone after restarting the dev server.
- Verification passed:
  - `npm.cmd run typecheck`

## Latest Update - 2026-05-05: Neutral Theme, Floating Nav, Scroll Reveal

- Shifted the visual theme away from green into a neutral black/white/grey palette for both light and dark modes.
- Added a floating glassmorphism sticky topbar treatment with rounded container, blur, shadow, and neutral hover states.
- Added `components/scroll-reveal.tsx`, mounted in `app/layout.tsx`, using IntersectionObserver to reveal hero sections, panels, forms, cards, and lists as the user scrolls.
- Updated `public/manifest.json` and the layout `theme-color` to neutral app chrome colors.
- Verification passed:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
- Local dev server restarted on `http://localhost:3001`; `/owner`, `/member`, `/profile`, and `/owner/programs` return HTTP 200.

## Latest Update - 2026-05-05: UI Refresh

- Added a cohesive glassmorphism visual refresh in `app/globals.css` across the app shell, topbar, hero/dashboard headers, cards, stat blocks, forms, day tabs, dialogs, drawer, and lists.
- Reworked the existing colorful `ui-card` experiment into calmer glass stat cards with accent strips, consistent typography, and no blur-on-hover clutter.
- Added branded hero-style header treatment with a subtle FitSplit icon watermark and accent rail.
- Fixed the profile header metric cards to read `weightKg` and `heightCm` from the actual profile model.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`
- Local dev server restarted cleanly on `http://localhost:3001`; `/owner`, `/member`, and `/profile` return HTTP 200.

## Latest Update - 2026-05-05: App Route Loader

- Added `components/hamster-loader.tsx` as a reusable animated loading indicator based on the Uiverse loader supplied by the user.
- Added `app/loading.tsx` so Next.js can show the loader during route-level loading states.
- Added global loader styles and keyframes in `app/globals.css`, including a reduced-motion pause rule.
- Verification passed:
  - `npm.cmd run typecheck`
  - `npm.cmd run build`

Use this file as the starting context for future Codex chats.

## ⚡ Latest Update — May 2026 (Session 3): Attendance, BMI Analytics & Build Stability

### Attendance Calendar
- **Attendance Tracking:** New `attendanceRecords` collection/type for gym check-ins.
- **Member Dashboard:** Added "Monthly Attendance" stat in summary panel and a full **Attendance Calendar** grid in the dashboard.
- **Owner Access:** Owners can now view a member's full attendance history on the member detail page.
- **Mock Data:** Populated Aarav and Mehul with 15+ attendance records for April/May.

### BMI & Metrics UX
- **Dynamic BMI Coloring:** The BMI pill now changes color based on health categories:
  - Underweight (< 18.5): **Yellow** (`status-warning`)
  - Normal (18.5 – 24.9): **Green** (`status-active`)
  - Overweight (25 – 29.9): **Yellow** (`status-warning`)
  - Obese (≥ 30): **Red** (`status-danger`)
- **BMI Info Popover:** Added a `?` info button next to BMI that reveals a categorical chart/popover for user education.
- **Editable Metrics:** BMI and metrics (Age, Weight, Height) are fully inline editable from the member dashboard.

### Build & Stability
- **Build Fix:** Resolved a duplicate `minHeight` property error in `app/page.tsx` that was blocking Firebase deployments.
- **Firestore Paths:** Added `attendanceRecords` to the central `collectionPaths` registry.
- **Type Safety:** Added `AttendanceRecord` and `WorkoutSession` to domain types and mock models.

---

## ⚡ Latest Update — May 2026 (Session 2): Admin, Program Assign & Workout Clock

### Admin Panel Fix
- Gym name link now correctly points to `/owner` (was `/owner/dashboard` which 404'd).

### Program Assignment Fix
- `assignProgramToMember` action now has a **mock fallback** — works without Firebase Admin configured.
- Returns `"… was assigned (local mode)."` locally instead of a 500 error.

### Workout Elapsed Clock
- A **live elapsed clock** (`⏱ MM:SS` or `⏱ Xh YYm`) is displayed in the session panel when a workout is active.
- The start timestamp is persisted in `localStorage` (`fitsplit-session-start`) so the clock survives page refreshes.
- At **3 hours** elapsed, the clock turns red and shows an `"Auto-ends at 4h"` warning pill.
- At **4 hours**, the session is **automatically ended** — `endWorkoutSession` is called, localStorage is cleared, and capacity is decremented.
- The clock resets to zero on manual "End Workout" as well.

---

## ⚡ Latest Update — May 2026: Auth & UX Overhaul

### Authentication
- **Mock auth** implemented via `lib/auth.ts` using Next.js cookies (no Firebase Auth required).
- Login supports **username OR mobile number** (e.g., `9688227039` → auto-normalizes to `+91 9688227039`).
- Inputs are trimmed of whitespace before matching.
- **Forgot Password** flow sends a notification to admin/owner. Owner can reset from member detail page.
- Password field now shows a placeholder (`password`) rather than pre-filled `*****`.

| Role   | Username / Mobile     | Password |
|--------|-----------------------|----------|
| Admin  | `admin`               | password |
| Owner  | `santosh-shg`       | password |
| Owner  | `dummy-gym-owner-1`   | password |
| Member | `mehulchirania`       | 1234 |
| Member | `9688227039`          | 1234 |
| Member | `aaravs`              | password |

### Login Page
- Centered FitSplit logo/branding, no topbar/hamburger/profile on login.
- Placeholder: `"Enter username/mobile number"`.
- Forgot Password moved to bottom of form (after Login button) to prevent Tab-key skip.

### Member Dashboard
- Greeting: `"Welcome, Mehul"` + `"Let's get fit!"` headline.
- Body metrics (Age, Weight, Height, BMI) shown as pills with a **pencil ✏️ icon** for inline editing via `<EditableMetrics />` component.
- BMI auto-calculated from weight/height.
- **Gym Busyness widget removed.**
- Assigned Program panel shows correct `daysPerWeek` (not `days.length`).
- Gym name **removed from Assigned Program panel** — now shown in topbar next to profile avatar.

### Topbar
- Gym name displayed to the left of the initials avatar.
- Initials avatar (e.g., `MC`) replaces the generic person icon.
- Hidden entirely on the login page (`/`).
- Hook-order bug fixed (early return moved after all `useEffect` calls).

### AI Semi-Personal Trainer
- **Push/Pull logic enforced:** swapping a push exercise no longer accidentally assigns a pull exercise.
- **Lower back pain** no longer avoids Legs (only avoids Back/deadlifts/rows).
- Stretches are **prepended** to the routine and shown in a separate `🧘 Stretches & Warm-ups` section in the workout view.
- Weight exercises appear in a separate `🏋️ Weight Exercises` section when modified.
- **Plan Modified panel** now has two distinct sections: `🔄 Exercises Swapped` and `🧘 Stretches Added for Pain Management`.
- Swap reasons include injury name for better context.

### Firebase / Local Mode
- `startWorkoutSession`, `endWorkoutSession`, `logLiftSet` — all now **return mock success** when Firebase Admin is not configured. No more 500 errors locally.
- Dialog (`confirm-dialog`) positioning fixed: `position: fixed; display: flex; z-index: 1000` — always centered on screen.

### Admin Page
- **"Owner scope"** row removed from summary panel.
- Gym names are **clickable links** to `/owner/dashboard`.
- **Dummy-Gym** displayed alongside Sri Shakti Hanuman Gym.

### Mock Data
- All exercise `instructions` now have **real coaching notes** (e.g., "Keep chest up, drive through the heels...") instead of the placeholder `"Compound back movement. Add coaching notes..."`.
- Exercise thumbnails updated to muscle-specific Unsplash images (bench press for Chest, pull-up for Back, squat for Legs, etc.).
- Mehul's phone number updated to `+91 9688227039`.

### Rest Timer
- Font size reduced (`clamp(1.6rem, 4vw, 2.4rem)`) to make the timer more compact.

### Weight Label
- Log Lift form label updated to `"Weight (kg)"`.

### Notifications
- Empty state added: `"No new notifications for you!"`.

---

## Project

FitSplit is a Next.js gym management app for the Sri Shakti Hanuman Gym initial rollout gym.

Local project path:

```text
C:\Users\mehul\Documents\Codex\2026-05-03\FitSplit
```

GitHub:

```text
https://github.com/mehulchirania/FitSplit
```

Firebase project:

```text
fitsplit-29215
```

Firebase console:

```text
https://console.firebase.google.com/project/fitsplit-29215/overview
```

## Current Stack

- Next.js App Router
- React 19
- TypeScript
- Firebase Authentication, planned for real login and role enforcement
- Cloud Firestore for app data
- Firebase Storage for uploaded exercise videos, pending Storage setup in console
- Firebase App Hosting for full-stack hosting
- Firebase Security Rules for Firestore and Storage

## Important Status

- Last updated: 2026-05-04.
- Firebase Blaze is ready per user.
- Firebase Web App exists: `1:766523780087:web:e825b99ed4a88d30c79cf2`.
- App Hosting backend exists: `fitsplit` in `us-central1`.
- App Hosting URL: `https://fitsplit--fitsplit-29215.us-central1.hosted.app`.
- App Hosting local-source deploy succeeded.
- Live App Hosting URL returned HTTP 200 after deploy.
- A production add-member error with digest `2009792147` was traced in Cloud Run logs to `fullName is required.` from `createMemberWithMembership`; the add-member form is now required-field guarded and uses a friendly `useActionState` success/error message instead of crashing the page.
- Confirmation/status dialogs are now used for Firestore-backed actions: add member, edit member, profile save, contact submit, catalog exercise save, custom workout plan save, Start Workout, End Workout, and Log Lift.
- Product direction update: membership tracking is intentionally handled outside FitSplit in the user's existing gym app. FitSplit now focuses on member training profiles, workout programs, custom exercises, weekly schedules, AI modifications, and live capacity.
- Firestore has been initialized.
- Firestore rules and indexes have been deployed.
- Firestore was seeded with Sri Shakti Hanuman Gym demo data on 2026-05-04.
- Live Firestore document counts after seeding: `gyms` 1, `profiles` 6, `memberships` 4, `exerciseCatalog` 49, `workoutPrograms` 5, `notifications` 3, `workoutSplitTemplates` 5, `liftLogs` 2, `programAssignments` 2, `activityEvents` 4, `workoutSessions` 0, `contactMessages` 0, `siteLinks` 4.
- Storage rules file exists but Storage setup was previously blocked until console setup.
- App Hosting config exists in `apphosting.yaml`.
- Firebase Admin on App Hosting uses application default credentials. Local development can use service account env vars.
- The app has Firebase Admin server actions and mock fallback when Firebase Admin cannot be initialized.
- Videos/workouts will be updated later by user.

## Key Commands

Install:

```bash
npm.cmd install
```

Run local dev server:

```bash
npm.cmd run dev
```

Typecheck:

```bash
npm.cmd run typecheck
```

Build:

```bash
npm.cmd run build
```

Seed Firestore from `lib/workouts.json`:

```bash
npm.cmd run seed:firebase
```

Seed Firestore with full demo initial rollout data:

```bash
npm.cmd run seed:demo
```

If service account env vars are missing but Firebase CLI is logged in locally:

```bash
set USE_FIREBASE_CLI_TOKEN=1
npm.cmd run seed:demo
```

Deploy Firestore rules/indexes:

```bash
firebase.cmd deploy --only firestore:rules,firestore:indexes --project fitsplit-29215
```

Deploy Storage rules after Storage is initialized:

```bash
firebase.cmd deploy --only storage --project fitsplit-29215
```

Deploy all Firebase config:

```bash
firebase.cmd deploy --project fitsplit-29215
```

Deploy App Hosting only:

```bash
firebase.cmd deploy --only apphosting:fitsplit --project fitsplit-29215
```

## Firebase Environment Variables

`.env.example` lists required variables.

Client-side Firebase config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fitsplit-29215.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fitsplit-29215
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fitsplit-29215.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=766523780087
NEXT_PUBLIC_FIREBASE_APP_ID=1:766523780087:web:e825b99ed4a88d30c79cf2
```

Server-side Firebase Admin config:

```env
FIREBASE_PROJECT_ID=fitsplit-29215
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Other:

```env
CRON_SECRET=
AI_PROVIDER_API_KEY=
```

For local development outside Google runtime, use a service account key:

```text
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

For Firebase App Hosting, Firebase Admin uses the runtime service account via application default credentials. `apphosting.yaml` includes the public Firebase web config.

## Firebase Data Model

Firestore collections:

```text
gyms
profiles
memberships
exerciseCatalog
workoutPrograms
notifications
workoutSplitTemplates
liftLogs
programAssignments
activityEvents
workoutSessions
contactMessages
siteLinks
```

Important IDs:

```text
SHG gym id: shg
SHG owner id: santosh-shg
```

Relevant files:

```text
lib/firebase/actions.ts
lib/firebase/admin.ts
lib/firebase/client.ts
lib/firebase/collections.ts
lib/firebase/read-models.ts
```

## Current Firebase Writes

Server actions in `lib/firebase/actions.ts`:

- `createMemberProfile`
- `updateMemberProfile`
- `assignProgramToMember`
- `updateProfileMetrics`
- `logLiftSet`
- `startWorkoutSession`
- `endWorkoutSession`
- `submitContactMessage`
- `createCatalogExercise`
- `createCustomWorkoutProgram`

These are used by:

```text
app/owner/members/page.tsx
app/owner/exercises/page.tsx
components/custom-plan-builder.tsx
```

## Current Firebase Reads

Read models in `lib/firebase/read-models.ts`:

- `getMembers`
- `getMemberDetail`
- `getGymWorkspaces`
- `getPrimaryWorkspace`
- `getRoleSummary`
- `getExerciseCatalog`
- `getOwnerNotifications`
- `getMemberNotifications`
- `getWorkoutPrograms`
- `getLiftLogsForMember`
- `getProgramAssignmentForMember`
- `getActiveProgramAssignments`
- `getActivityEvents`
- `getProfileMetrics`
- `getSiteLinks`
- `getActiveWorkoutSessions`

If Firebase Admin env vars are missing, the app falls back to mock data from:

```text
lib/mock-data.ts
lib/workouts.json
```

## Workout Data

Primary workout source:

```text
lib/workouts.json
```

Seed script:

```text
scripts/seed-firebase.mjs
```

Supported split templates:

- PPL x 2
- PPL + Upper/Lower
- Bro Split
- Modified Arnold Split x 2
- Custom User Routine

## UI Notes

The UI has:

- Modern minimal CSS in `app/globals.css`
- Dark mode toggle in `components/theme-toggle.tsx`
- Route-aware navigation in `components/main-nav.tsx`
- Owner pages hide member-only navigation and vice versa

Important pages:

```text
/admin
/activity
/about
/owner
/owner/members
/owner/exercises
/owner/programs
/member
/profile
```

## Firebase Rules

Rules and indexes:

```text
firestore.rules
firestore.indexes.json
storage.rules
firebase.json
```

Firestore rules are deployed.

Storage rules exist but need deployment after Firebase Storage is initialized in console.

## App Hosting Next Steps

Current backend:

```text
Backend: fitsplit
Region: us-central1
URL: https://fitsplit--fitsplit-29215.us-central1.hosted.app
```

Useful commands:

```bash
firebase.cmd apphosting:backends:list --project fitsplit-29215 --json
firebase.cmd deploy --only apphosting:fitsplit --project fitsplit-29215
```

GitHub automatic deployments are not connected yet. To enable them, connect:

```text
GitHub repo: mehulchirania/FitSplit
Branch: main
Root directory: /
Backend: fitsplit
```

Manual App Hosting deployment from local source is working and should be used until GitHub automatic deployments are connected.

## Known Caveats

- Real Firebase Auth login/role session enforcement is not fully implemented yet.
- Server actions currently use Firebase Admin and trust the owner/admin UI route. Add authenticated role checks before production use.
- Storage upload UI is not implemented yet; exercise form stores video URL/path text only.
- Firebase Storage still needs console setup and storage rules deployment if not completed.
- Member portal still uses the first mock member unless extended to auth-aware member lookup.
- Workouts and videos will be updated later.

## Recent Updates

- Converted remaining page/component static data to Firestore-backed read models. Only `lib/firebase/read-models.ts` now imports `mock-data`, strictly for fallback when Firebase Admin is unavailable.
- Added and seeded Firestore collections for `programAssignments`, `activityEvents`, and `siteLinks`.
- Added Firestore-ready collections/rules for `workoutSessions` and `contactMessages`; these populate from Start Workout/End Workout and About form submissions.
- Fixed owner add-member failure handling. `/owner/members` now uses `components/add-member-form.tsx`, requires Full name, Email, Start date, and Duration in the browser, validates duration server-side, and returns visible success/error messages from the Firebase server action.
- Added reusable `components/confirm-action-form.tsx` for confirmation before submit and success/error status after server actions.
- Updated Firestore server actions to return a shared `{ status, message }` state and to catch user-facing validation/write failures instead of throwing raw app errors.
- Added confirmation and post-update status dialogs for member workout events: Start Workout, End Workout, and Log Lift.
- Removed membership-dependent UI and stopped creating membership/renewal records from FitSplit. Existing Firestore `memberships` seed data is legacy only and is no longer read by active pages.
- Renamed the gym selector UI to `Select Gym`; it is a dropdown with Sri Shakti Hanuman Gym as the current initial rollout option.
- Moved custom exercise creation into a `Custom Workouts` section on `/owner/exercises` and renamed its submit action to `Save custom exercise`.
- Added a global footer across every page with `Developed with ❤️ by Mehul`.
- Improved primary navigation flow to Dashboard, Members, Workout Programs, Custom Workouts, and Exercise Catalog.
- Added weekly schedule day tabs for assigned programs. Member and owner member-detail views default to the current weekday, so Monday opens the Monday workout first.
- Added real owner-side program assignment on member detail pages. Owners can select a workout plan, confirm assignment, and the app writes `programAssignments`, member notification, and owner activity records.
- Added a global back-arrow button in the top navigation.
- Program cards on `/owner/programs` now open full modal dialogs with an `X` close button and weekly schedule tabs.
- Reworked the owner dashboard into a training ops command center: total members, assigned plans, plan gaps, active workouts, program count, catalog count, assignment coverage, and action links.
- Live capacity now shows current status, active workout sessions, member names when available, and a refresh button instead of only a static chart.
- Removed `Custom Workouts` from the top navigation; custom exercise creation remains inside the Exercise Catalog page.
- Optimized the hamburger drawer spacing and changed the brand tagline to `Your fitness companion`.
- Reworked About page links into compact social icon links above the global footer using default public destinations.
- Removed user-facing Firebase/Firestore wording from page status pills, form confirmations, and save buttons.
- Activity page now shows the combined gym-wide feed across owner and member audiences instead of a member-specific feed tied to the demo/local user.
- Moved the back button out of the brand/topbar cluster into a contextual row below the topbar for better navigation ergonomics.
- Made home, admin, member, activity, profile, about, owner workspace, and exercise lookup data dynamic.
- Updated `ExerciseList` and member workout AI logic to use Firestore exercise catalog data passed from read models.
- Added Firestore-backed historical lift logging for progressive overload via `liftLogs`, `logLiftSet`, and `getLiftLogsForMember`.
- Added in-workout rest countdown timer with 1, 1.5, 2, and 3 minute presets.
- Updated demo seed data with two Barbell Bench Press lift logs for Aarav.
- Deployed Firestore rules for `liftLogs`.
- Added member-side AI Semi-Personal Trainer workflow: Update Injury/Limitation trigger, deterministic catalog-based exercise swaps, and fallback recovery routine.
- Added mandatory Start Workout and End Workout controls on the member workout screen, using local active-session state as an attendance proxy.
- Added member Gym Busyness widget based on active workout count.
- Added owner dashboard AI business-value analytics: Active Semi-Personal Training Plans, Trainer Hours Saved, and AI-ready templates.
- Added owner live capacity panel with exact active workout headcount and a simple peak usage chart.
- Updated home/about/member/owner copy to emphasize the AI as an automated Semi-Personal Trainer.
- Added global hamburger drawer with Light/Dark mode toggle, Activity link, and About link.
- Added profile icon dropdown with View Profile link and dummy Log Out button.
- Added `/activity` page with owner/member conditional feed views.
- Added `/profile` page with basic data entry fields and reactive BMI calculation.
- Added `/about` page with required contact fields, social placeholders, email link, and exact footer text.
- Added `public/favicon.ico` generated from the cropped icon and changed tab icon links to `/favicon.ico?v=3` plus versioned PNG links to force browser favicon refresh.
- Recropped `public/icon-512.png` to the dark artwork panel so no white border is visible, and replaced the header `FS` text mark with the same icon image.
- Added FitSplit PWA/browser icon assets: `public/icon-512.png`, `public/manifest.json`, and root layout manifest/favicon/apple-touch links.
- Seeded live Firestore for project `fitsplit-29215` with full Sri Shakti Hanuman Gym demo data: gym workspace, admin/owner/member profiles, memberships, exercise catalog, workout programs, notifications, and split templates.
- Added `scripts/seed-demo-firestore.mjs` and `npm.cmd run seed:demo` for repeatable demo seeding.
- Added editable member profile form on `/owner/members/[memberId]` backed by `updateMemberProfile`.
- Made owner dashboard and owner programs page read dynamic Firestore data.
- Wired member renewal saving to Firebase. `/owner/members/[memberId]` now reads member detail from Firestore, submits renewal memberships with a notification record, and refreshes owner/member views.
- Fixed membership ID creation so the stored membership `id` matches the Firestore document ID.
- Made membership date calculation use UTC date-only math to avoid timezone drift.
- Made `/owner/members/[memberId]` dynamic so newly created Firebase members can open detail pages without a rebuild.
- Refreshed `README.md` to match current Firebase-only architecture, live App Hosting deployment, commands, caveats, and setup files.
- Created Firebase Web App `FitSplit`.
- Created Firebase App Hosting backend `fitsplit` in `us-central1`.
- Added `apphosting` backend entry to `firebase.json`.
- Updated Firebase Admin initialization to use application default credentials on App Hosting.
- Marked owner members and exercise catalog pages as dynamic to avoid build-time Firestore reads.
- Hardened Firebase read models to fall back to mock data if Admin initialization/querying fails.
- Deployed App Hosting successfully.
- Verified live URL returns HTTP 200.

## Latest Update - May 11, 2026

- Added `/admin/gyms` management page for admin users.
- Admin can now add new gym workspaces, edit existing gym details inline, open a gym detail page, and remove unused gyms.
- Gym removal is guarded:
  - Sri Shakti Hanuman Gym cannot be deleted because it is the active initial rollout gym.
  - Gyms with assigned profiles cannot be removed until staff/members are reassigned or deleted.
- Removed the old workspace helper copy: `Admin can add more gyms later`.
- Replaced that copy with `Manage gyms` buttons on the admin dashboard and workspace switcher.
- Login hardening completed in the previous pass:
  - Member login accepts username/mobile/email plus `1234` PIN.
  - Server-side credential login maps member PIN to Firebase-compatible `pin-1234`.
  - Successful login uses hard navigation to the role dashboard.
- Landing/authenticated nav now hides on scroll down and returns on scroll up.
- Landing theme toggle moved into the hamburger menu.
- README was refreshed to match current PWA/auth/admin-gym state.

Latest verification:

```bash
npm.cmd run build
npm.cmd run typecheck
```

Local server:

```text
http://localhost:3000
```

## Open Issues

- GitHub automatic deployment is not connected in Firebase App Hosting backend settings.
- Storage rules deploy was previously blocked because Firebase Storage had not been initialized in console.
- Firebase Storage avatar/staff image upload is still pending.
- Firebase Cloud Messaging push reminders are still pending.
- Production gym geofence coordinates must be configured in environment variables before strict attendance validation is complete.
- Membership renewal saving was removed from FitSplit UI because membership tracking now stays in the user's existing gym app.

## Last Known Verified Commands

Latest local UI fix:

- PWA/Auth upgrade pass added a cache-busted manifest, service worker, install prompt, cleaned transparent logo assets for favicon/app icon/header usage, and mobile bottom navigation.
- Member auth now uses a 4-digit numeric PIN (`1234` for demo members) with inline client validation and 2-hour cookie/session timeout handling.
- Workout check-in now requests GPS, sends latitude/longitude/device info to `workoutSessions.attendance`, and enforces the gym geofence when `SHG_GYM_LATITUDE`, `SHG_GYM_LONGITUDE`, and optional `SHG_GYM_RADIUS_METERS` are configured.
- Member profile now stores timing slots, gender/DOB, goals, medical notes, injury notes, and assigned trainer fields.
- In-workout rest timer UI/code references were removed.
- Authenticated footer now carries Pro Tips and Gym Rules. Landing page remains free of the Mehul footer credit before login.
- Still pending for a later pass: Firebase Cloud Messaging push reminders, Firebase Storage avatar/staff image uploads, full revenue/payment dashboard modeling, and production geofence coordinates in `.env.local`/hosting config.
- Verification passed:

```bash
npm.cmd run build
npm.cmd run typecheck
```

- Admin page could render only the topbar because the scroll reveal helper was mutating server-rendered page elements before hydration completed.
- `components/scroll-reveal.tsx` is now non-mutating and only clears the legacy reveal root class.
- Restarted the local Next dev server on `http://localhost:3000`.
- Verified `/admin` in the in-app browser: `Gym control.` heading and admin dashboard content are visible after reload.
- `npm.cmd run typecheck` passed.

These passed after Firebase migration:

```bash
npm.cmd run typecheck
npm.cmd run build
```

These passed after wiring member renewal:

```bash
npm.cmd run build
npm.cmd run typecheck
```

These passed after adding PWA icon/manifest:

```bash
npm.cmd run build
npm.cmd run typecheck
```

These passed after recropping the icon and using it in the header brand:

```bash
npm.cmd run build
npm.cmd run typecheck
```

These passed after adding the dedicated favicon and cache-busted icon links:

```bash
npm.cmd run build
npm.cmd run typecheck
```

These passed after adding navigation, activity, profile, and about pages:

```bash
npm.cmd run build
npm.cmd run typecheck
```

These passed after adding AI modification and live capacity tracker features:

```bash
npm.cmd run build
npm.cmd run typecheck
```

App Hosting deploy passed:

```bash
firebase.cmd deploy --only apphosting:fitsplit --project fitsplit-29215
```

Live URL check passed:

```text
https://fitsplit--fitsplit-29215.us-central1.hosted.app -> HTTP 200
```

Firestore deploy passed:

```bash
firebase.cmd deploy --only firestore:rules,firestore:indexes --project fitsplit-29215
```

GitHub push passed to:

```text
https://github.com/mehulchirania/FitSplit
```
