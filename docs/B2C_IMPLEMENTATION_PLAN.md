# FitSplit — B2C Self-Serve E2E Implementation Plan

> Status: **Implementation plan / ready to build.** Authored 2026-07-08.
> Scope: the thinnest end-to-end vertical — a stranger self-signs-up, lands in their own
> workspace, picks a workout program from the catalog, and logs against it. Free tier only.
> Grounded in `src/lib/auth.ts`, `src/lib/firebase/actions/{members,programs}.ts`,
> `src/types/domain.ts`. Realises Phase 1 + a trimmed Phase 2 of
> [`B2C_B2B_DESIGN.md`](B2C_B2B_DESIGN.md), on the identity model from
> [`B2C_IDENTITY_SPIKE.md`](B2C_IDENTITY_SPIKE.md).

---

## Here's what I'd actually do

Build **one vertical slice** — signup → personal workspace → pick a plan → log a lift — and
**explicitly defer** everything the design doc lists that this slice doesn't need: billing
(Razorpay), the affiliations subcollection, the "switch workspace" UI, the global phone index,
churn-downgrade funnels, and the Free/Pro entitlement gates. None of those block a friend from
using the app; all of them are Phase 3+.

The load-bearing decision (locked by the spike) is **consumer = personal gym**: a self-signup
provisions `gyms/personal-{uid}` with `type: "personal"`, and the user is its sole `member`.
Because every read-model, `requireRole`, and server action already consume a single
`{ gymId, role, memberId }`, the consumer app **is the existing member app** pointed at a
self-owned gym. We add a workspace *type*, not a second data architecture.

Critical simplification vs the full spike: in this slice **every account has exactly one
affiliation** (its personal gym), so `defaultGymId` = the personal gym and we do **not** build
the `affiliations` subcollection or `activeGymId` switching yet. `authUserFromProfile` and the
`getCurrentUser` claims path stay byte-for-byte unchanged. We still write the entitlements
resolver with the future `(account, activeGym)` signature so repricing later is config, not a
refactor — but it returns "Free" for everyone and gates nothing in v1.

---

## The exact decisions

1. **Auth method for signup: email + password.** Real email as the login identity (Firebase Auth
   enforces global uniqueness natively). This is distinct from the gym-issued
   `${memberId}@members.fitsplit.app` + `pin-XXXX` flow, which is untouched. Google sign-in and
   phone OTP are strictly better for conversion but add gateway/OTP surface — defer to a fast-follow.
2. **`plan` lives on the account** (`authProfiles/{uid}.plan: "free"`). Personal gym carries
   `type: "personal"`. No gym-granted Pro yet (no business billing exists).
3. **Program selection is a new member-scoped action.** The existing `assignProgramToMember`
   (owner/admin only, `assertMemberBelongsToCallerGym`) is **not loosened**. A consumer picks their
   own plan through a new `selectProgramForSelf` guarded by `requireAuth()` that only writes for
   `memberId === currentUser.memberId` in `currentUser.gymId`.
4. **Personal gyms never render owner surfaces.** They have a `member` doc but no `owner`/`staff`
   doc, and `type: "personal"` suppresses owner operations. Role stays `member`, so existing
   `/member` routing and `requireRole` gating already do the right thing.

---

## Hidden friction (the things that will actually bite)

- **`getCurrentUser` fast-path reads custom claims, not Firestore** (`auth.ts:948`). If signup sets
  the session cookie but not the `{ role, gymId, memberId, isActive }` custom claims, the SSR path
  returns an empty/wrong workspace and the friend sees a broken `/member`. **Signup must mint the
  claims** exactly as the login path does. This is the #1 breakage.
- **`loginWithCredentials` must resolve a real-email account.** Resolution already queries
  `authProfiles` by `email`/`username`/`phone` (`getProfileByEmail`, `resolveProfileForIdentifier`),
  so a consumer profile with `authEmail = <real email>` resolves for free — *provided* signup writes
  `authEmail` in the same normalised (lowercased) form the resolver expects.
- **Username/phone reservation is per-gym today** (`phones` = `gymId:phone`). Consumer login identity
  is account-level and global. For v1: make username **optional** (derive a handle from email if
  omitted) and **skip the phone index entirely** — email is the only login identity. Do not reuse the
  per-gym `phones` scheme for consumers.
- **Provisioning must be atomic.** Mirror `createMemberProfile`'s transactional dual-write: create
  the Auth user, the `authProfile`, the personal gym doc, and the `members/{uid}` doc, or roll back.
  A half-provisioned account (Auth user with no gym) is a support nightmare. Add
  `ensurePersonalWorkspace(uid)` alongside the existing `ensurePrimaryWorkspace`.
- **Abuse surface.** A public, unauthenticated write action is new for this codebase. Rate-limit by
  IP/email (reuse the `loginAttempts` lockout pattern) and require email verification before the
  account can do anything billable later. For v1 Free, a soft cap is enough — but wire the guard now.
- **Firestore rules + `proxy.ts` allowlist.** `/signup` must be public in `proxy.ts`; add client-SDK
  rules for `type: "personal"` gyms and self-created `authProfiles` (Admin SDK bypasses them, but the
  rule is written in the same change per repo policy).

---

## Increments (each keeps `tsc --noEmit` and `npm run build` clean)

### Increment 0 — Foundation, zero UX change
- `GymWorkspace.type: "business" | "personal"` (default `"business"`) in `src/types/domain.ts`.
- `ProfileRecord.plan?: "free" | "pro"` + surface it through `toProfile`.
- `src/lib/entitlements.ts`: `resolveEntitlements(account, gym): Entitlements` with the design-doc
  shape. Returns Free for all; gates nothing yet.
- Backfill: default existing gym docs to `type: "business"` (lazy default on read is acceptable —
  no migration script strictly required since `undefined` → treat as business).
- **Verify:** existing SHG owner/member/trainer flows behave identically.

### Increment 1 — Self-signup + personal workspace provisioning
- `signUpConsumer(formData)` server action (public, **no** `requireRole`): Zod-validate
  `{ fullName, email, password }`; create Firebase Auth user; provision `authProfile`
  (`role:"member"`, `plan:"free"`, `defaultGymId: personal-{uid}`) + personal gym (`type:"personal"`)
  + `members/{uid}` via one transaction (dual-write mirrored); set session cookie **and custom claims**
  `{ role, gymId, memberId, isActive }`; return success → redirect `/member`.
- Rate-limit guard (reuse lockout util); normalise `authEmail` to lowercase.
- `/signup` public page + form component; add to `proxy.ts` public routes; Firestore rules for
  personal gym + self authProfile.
- Link from landing hero/nav and the login modal ("New here? Create an account").
- **Verify:** signup on dev server → session valid → `/member` renders the empty member home.

### Increment 2 — Member picks a plan from the catalog
- `selectProgramForSelf(formData)` guarded by `requireAuth()`: assert `memberId ===
  currentUser.memberId`; cancel prior active assignment; write `programAssignments` (dual-write) in
  `currentUser.gymId`; self-notification instead of owner-notification. Reuses the `split-library`
  program list — same `programId` contract as `assignProgramToMember`.
- Member-facing "Choose your program" UI (member sub-page or `/member` empty state) listing
  split-library programs → calls the action. Fresh consumer with no assignment sees a designed
  empty state, not a blank screen.
- `getProgramAssignmentForMember` already reads gym-scoped → works unchanged for the personal gym.
- **Verify:** pick a split → weekly schedule populates → log a lift → confirm it persists under
  `gyms/personal-{uid}/liftLogs` and the root mirror.

### Increment 3 — E2E polish
- New-signup onboarding: no assignment → route straight to the program picker.
- Confirm offline logging (Dexie) syncs under the personal gym.
- Docs: update `README.md` + prepend `PROJECT_HANDOFF.md`; mark design-doc Phase 1 done, Phase 2 partial.

---

## End-to-end acceptance test (the friend flow)

On the dev server, no owner involvement at any step:
1. Visit `/signup`, create an account with a real email + password.
2. Land on `/member`, authenticated, inside `gyms/personal-{uid}`.
3. Pick a program from the split library.
4. See it in the weekly schedule; log a set; reload; the set persists.
5. Log out, log back in with the same email + password; state is intact.

If all five pass with zero owner/admin action, the slice is shippable to real friends behind a flag.

---

## Deferred (explicitly out of this slice)

Billing / Razorpay · Free→Pro entitlement gates + upsell UI · affiliations subcollection +
`activeGymId` + workspace switcher · global phone index · churn-downgrade funnel · "claim/invite
your gym" B2B lead capture · business-tier repackaging. All tracked in
[`B2C_B2B_DESIGN.md`](B2C_B2B_DESIGN.md) §6 phases 3–5.

## What the top teams do differently

They ship this exact vertical slice behind a flag to a dozen real users **before** writing a line of
billing code, and instrument one metric — signup → first logged workout — from day one. And they
resist building the multi-gym identity machinery until a second affiliation actually exists: the
spike's "model N, ship the switcher later" is right, and over-building identity now is the classic
trap that turns a two-week slice into a two-month refactor.

---

## Open decisions to confirm before Increment 1

- **Signup auth method:** email+password (recommended, simplest) vs Google sign-in (best conversion)
  vs phone OTP (India-native). Changes the form + provisioning surface only.
- **Consumer route:** reuse `/member` (recommended — least code) vs a distinct `/app` namespace.
- **Email verification:** require before first login (safer) vs defer to when billing lands (faster).
