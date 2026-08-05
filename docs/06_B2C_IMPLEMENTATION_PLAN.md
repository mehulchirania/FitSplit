# 06 · B2C Implementation Plan

`Authored: 2026-08-05 · Status: **DRAFT — awaiting Mehul's approval** · Executor: Sonnet subagents`

> Supersedes the deleted `docs/B2C_IMPLEMENTATION_PLAN.md` (authored 2026-07-08, removed in
> `804a3aa` during doc consolidation). Nothing from that plan was implemented — verified against
> the tree at `57f32d2`: no `/signup` route, no `src/lib/entitlements.ts`, no `type: "personal"`
> on `GymWorkspace`, no self-serve program action, no OTP or reCAPTCHA wiring anywhere.

---

## 0. Scope in one paragraph

A stranger installs the PWA or the Expo app, signs up with **their phone number and an SMS OTP**,
lands in a **personal workspace they own**, picks a split from the program library, and logs
lifts against it — for free, forever, with no billing anywhere in the product. Because the
account's identity is now a *phone number* rather than a gym-issued credential, that same account
can later be **affiliated with a real gym** and switch between workspaces without re-registering.
The existing B2B product (owner / trainer / admin, gym-issued phone + 4-digit PIN login) is not
modified in behaviour by any increment below.

### Decisions locked (Mehul, 2026-08-05)

| # | Decision | Choice |
|---|---|---|
| D1 | Monetization in v1 | **Free-only. No billing, no gateway.** Entitlements resolver is written but returns Free for everyone and gates nothing. |
| D2 | Consumer identity | **Phone number + SMS OTP.** Gym-issued `phone + PIN` login stays untouched. |
| D3 | Surfaces | **Web PWA *and* Expo mobile**, both with signup. |
| D4 | Multi-workspace | **Build affiliations + workspace switching now.** One account, N workspaces. |

### The one decision still open — D5, OTP transport

This is the only thing I need a call on before Increment 1 starts, because it determines whether
mobile signup is a two-day job or a two-week job. Increments 0, 2, 3 and 4 do not depend on it.

Firebase's built-in Phone Auth (`signInWithPhoneNumber`) requires a `RecaptchaVerifier`, which
**does not exist in React Native**. `mobile/lib/firebase.ts` uses the Firebase **JS SDK**
(`firebase@^12.15.0` with `getReactNativePersistence`), not `@react-native-firebase/*`. So D3
(mobile signup) and the naive reading of D2 are in direct conflict. Three ways out:

| Option | What it costs | What it buys |
|---|---|---|
| **(A) Custom OTP → `createCustomToken`** *(my recommendation)* | You implement OTP generation, hashing, expiry, and rate limits in a Cloud Function, and contract an Indian SMS vendor (MSG91/Kaleyra). **Requires TRAI DLT registration — sender ID + template approval, typically 3–10 business days.** | **One identical implementation on web and Expo.** No reCAPTCHA, no CSP changes, no native-module migration. Full control of the abuse surface. Cheapest per-SMS in India. |
| **(B) Firebase Phone Auth on web + `@react-native-firebase/auth` on mobile** | Migrating `mobile/` off the JS SDK auth instance to a native module — touches `firebase.ts`, `auth.ts`, every screen's auth assumption, and forces a new EAS dev-client build. Two divergent identity code paths to keep in sync forever. | No DLT paperwork, no OTP code to own. Firebase handles delivery. |
| **(C) Firebase Phone Auth on web, defer mobile signup one release** | Consumers can't sign up on mobile at launch. Partially walks back D3. | Fastest path to a *web* consumer. |

**Recommendation: (A).** The DLT lead time is real but it runs *in parallel* with Increments 0–2
if you start the paperwork on day one. Option (B)'s permanent cost — two identity implementations
across two SDKs — is worse than option (A)'s one-time cost, and (A) is the only choice that
honours D3 without a native-module migration. **Everything below is written assuming (A).**
If you pick (B) or (C), only Increment 1 and part of Increment 5 change.

> ⚠️ **Start the DLT registration before writing any code.** It is the only item on this plan with
> an external dependency you cannot compress, and it blocks the first real end-to-end test.

---

## 1. Architecture

### 1.1 A consumer is a personal gym

Every read-model in `src/lib/firebase/read-models/*`, every action in
`src/lib/firebase/actions/*`, `requireRole` in `src/lib/auth.ts`, and every rule in
`firestore.rules` assumes a single `{ gymId, role, memberId }` triple. Rather than fork all of
that with a `gymId === null` branch, a consumer signup provisions:

```
gyms/personal-{uid}          type: "personal", ownerId: uid, memberCount: 1
  └─ members/{uid}           the consumer's own member doc — role "member"
  └─ liftLogs, dayLogs, macroLogs, mealLogs, programAssignments, …   (unchanged)
```

The consumer app **is** the existing `/member` experience pointed at a self-owned gym. We add a
workspace *type*, not a second data architecture. Personal gyms have **no `staff` doc**, so no
owner or trainer surface can ever render for them; `type: "personal"` is a second, explicit belt.

### 1.2 Phone is now a global identity — the index has to change

There is a **pre-existing inconsistency** here that B2C forces us to resolve:

- `src/lib/firebase/actions/members.ts:144,370` writes the phone index at
  `phones/{gymId}:{digits}` — deliberately **gym-scoped** uniqueness.
- `src/lib/auth.ts:416` reads it at `phones/{digits}` — **bare digits**.
- `scripts/seed-clean-gyms.mjs:378` writes bare digits.

So today the bare-digit lookup in `auth.ts` only ever resolves *seeded demo* members; real
gym-created members are found by the `authProfiles` fallback query at `auth.ts:441-444`. It works,
but by accident.

Consumer identity is **account-level and global** — one phone, one account, across all workspaces.
Do **not** overload the gym-scoped index. Add a new one:

```
phoneAccounts/{e164Digits}   → { uid, createdAt }     // global, Admin-SDK-only, one per account
phones/{gymId}:{digits}      → unchanged              // per-gym uniqueness, unchanged semantics
```

`auth.ts:416` is repointed at `phoneAccounts`. The seed script is updated to write both so demo
logins keep working. **This is the highest-risk edit in the plan for existing users** — it sits on
the login path for every gym member. It gets its own increment (1) and its own verification gate.

### 1.3 Affiliations and the active workspace (D4)

```
authProfiles/{uid}
  defaultGymId : string          // unchanged — the account's home workspace
  activeGymId  : string          // NEW — which workspace the user is currently in
  plan         : "free" | "pro"  // NEW — always "free" in v1
  └─ affiliations/{gymId}        // NEW subcollection
       { gymId, gymName, type: "personal"|"business",
         role: "member"|"owner"|"trainer", memberId,
         status: "active"|"left", joinedAt, leftAt? }
```

**The hard part is the session, not the schema.** `_getCurrentUserImpl` (`src/lib/auth.ts:951`)
has a fast path that reads `{ role, gymId, memberId, isActive }` straight off the **session cookie's
baked-in custom claims** and never touches Firestore. Custom claims are frozen at
`createSessionCookie` time. So "switch workspace" cannot simply patch claims — a session cookie
can't be re-minted server-side, because minting one needs a fresh `idToken`, and on web the
browser's Firebase client SDK is **never signed in** (login goes through a server-side REST call
to `identitytoolkit` at `auth.ts:863`, then `createSessionCookie`).

The two surfaces therefore diverge, and that's fine — they already do:

- **Web:** on switch, a server action verifies the affiliation doc, then sets a **signed, httpOnly
  `fitsplit-active-workspace` cookie** carrying `{gymId, role, memberId}` + an HMAC over them
  (keyed by a new `WORKSPACE_COOKIE_SECRET` env var). `getCurrentUser` verifies the HMAC and
  **overlays** that triple on the claims-derived identity. Zero extra Firestore reads per request —
  which matters, given the cost pass the README documents. `maxAge` is **1 hour**, so a revoked
  affiliation self-heals within an hour; revocation also clears it on the write path.
- **Mobile:** the client SDK *is* signed in, so the honest path works — a callable patches custom
  claims, the app calls `getIdToken(true)` to force-refresh, done. No cookie involved.

If the cookie is absent or its HMAC fails, `getCurrentUser` falls back to the claims exactly as it
does today. **Every existing gym user has one affiliation and never sets this cookie, so their
session path is byte-for-byte unchanged.** That property is the acceptance criterion for
Increment 3.

### 1.4 Entitlements (written, dormant)

`src/lib/entitlements.ts` exports `resolveEntitlements(account, gym): Entitlements` with the
real future signature, returns the full feature set for everyone, and **gates nothing**. It exists
so that turning on Pro later is config rather than a refactor. Do not add a single `if (!ent.x)`
branch to a UI in v1 — that is D1.

---

## 2. What will actually bite

Grounded in the code, not speculation. Subagents must read this section before touching anything.

1. **`getCurrentUser`'s fast path reads claims, not Firestore** (`src/lib/auth.ts:992`). If signup
   creates the session cookie but not the `{ role, gymId, memberId, isActive }` custom claims, SSR
   returns a broken/empty workspace and the new user's first-ever screen is blank. **Signup must
   mint claims exactly as `upsertAuthUser` does** — mirror `functions/src/index.ts:373-384`.
   This is the #1 breakage risk in the whole plan.
2. **Provisioning must be atomic.** Auth user + `authProfiles/{uid}` + `phoneAccounts/{digits}` +
   `gyms/personal-{uid}` + `members/{uid}` + `affiliations/{gymId}` either all land or none do.
   Mirror the transaction in `createMemberProfile` (`actions/members.ts:147`). A half-provisioned
   account — an Auth user with no gym — is unrecoverable without manual console surgery.
3. **A public unauthenticated write action is new for this codebase.** Every existing action sits
   behind `requireRole`. `requestOtp` is reachable by anyone on the internet and **costs money per
   call**. It needs per-phone and per-IP rate limiting before it ships, not after. Reuse the
   `loginAttempts` lockout pattern (`src/lib/auth.ts:564-658`) — same shape, new collection.
   Enable **Firebase App Check** on the callable.
4. **Phone collision with an existing gym member.** Someone whose gym already registered their
   number signs up as a consumer. OTP proves they own the number, so the correct behaviour is
   **not** "reject" — it's to attach a personal workspace to *the account that already exists* and
   give them both affiliations. This is the single best argument for D4, and it must be an explicit
   test case, not an afterthought.
5. **`proxy.ts` role gating is cookie-driven** (`src/proxy.ts:78-91`) and reads `fitsplit-role`.
   `/signup` must be added to the public set, and the workspace cookie must not confuse the
   matcher. Verify a signed-out user can reach `/signup` and a signed-in one is bounced to their
   role home.
6. **Google Play requires in-app account deletion** for any app offering account creation. The
   Expo app currently has no signup, so it has never needed one. Increment 5 must ship a working
   "delete my account and data" path or the store submission is rejected. This also intersects with
   the existing `legal/data-rights-and-grievance-notice.md` commitments.
7. **Firestore rules are written in the same change as the action** (repo policy). The Admin SDK
   bypasses rules, but the mobile client SDK reads Firestore directly — so personal-gym rules are
   load-bearing on mobile, not decorative. `isGymUser(gymId)` (`firestore.rules:61`) already covers
   a personal gym's sole member correctly; the new surface is `affiliations` and `phoneAccounts`.
8. **Offline logging (Dexie web / AsyncStorage mobile) must sync under the personal gym.** The
   queue serializes a `gymId`; confirm it picks up the *active* workspace, not `defaultGymId`, or a
   user who switches workspaces mid-session flushes lifts into the wrong gym.

---

## 3. Increments

Every increment must leave `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`
clean, and must not change behaviour for the existing SHG owner/trainer/member logins. Each is a
separate branch and a separate PR.

---

### Increment 0 — Foundation types + dormant entitlements
**Depends on:** nothing · **Parallel-safe:** yes · **No user-visible change**

- `packages/core/src/domain.ts`: add `type?: "business" | "personal"` to `GymWorkspace`
  (absent ⇒ business, so no migration script is needed); add the `Affiliation` type and
  `ConsumerPlan = "free" | "pro"`.
- `src/lib/auth.ts`: extend `ProfileRecord` and `AuthenticatedUser` with `plan?` and
  `activeGymId?`; surface both through `toProfile` (`auth.ts:307`). Do **not** yet read them
  anywhere.
- New `src/lib/entitlements.ts` — `resolveEntitlements(account, gym): Entitlements`, returns
  everything enabled. Unit-tested in `src/lib/__tests__/entitlements.test.ts`.

**Acceptance:** SHG owner, trainer, and member logins render identically to `main`. `tsc --noEmit`
clean. New unit tests pass.

---

### Increment 1 — Phone-OTP identity service + global phone index
**Depends on:** 0, and **D5 + DLT approval** · **Parallel-safe:** no · **Highest risk**

- `functions/src/index.ts`: two new callables in `asia-south1`:
  - `requestPhoneOtp({ phone })` — normalise to E.164, rate-limit per phone **and** per IP
    (`otpAttempts/{key}`, mirroring the `loginAttempts` shape), generate a 6-digit code, store
    **only a salted hash** with a 5-minute expiry and a 5-attempt cap, dispatch via the SMS vendor.
  - `verifyPhoneOtp({ phone, code })` — constant-time compare, burn the code on use, return
    `{ customToken, isNewAccount }` via `auth.createCustomToken(uid)`.
- Guard both with **App Check**. Never log the code.
- New `phoneAccounts/{e164Digits}` global index; `firestore.rules` entry `allow read, write: if false`
  (Admin SDK only — same pattern as `phones` at `firestore.rules:573`).
- Repoint `src/lib/auth.ts:416` from `phones/{digits}` to `phoneAccounts/{digits}`.
- Update `scripts/seed-clean-gyms.mjs:378` to write **both** indexes so demo logins survive.
- Backfill script: one `phoneAccounts` doc per existing `authProfiles` doc that has a phone.
  Dry-run mode first; report collisions rather than guessing.

**Acceptance:** `npm run test:rules` passes. Every login in `docs/04_TESTING_AND_LOGINS.md` still
works — all four owners, twelve trainers, and a sample of ten members, **verified by hand, not
assumed**. An OTP round-trip to a real handset succeeds. Requesting 6 OTPs for one number in a
minute is refused.

---

### Increment 2 — Consumer signup + personal workspace provisioning (web)
**Depends on:** 1 · **Parallel-safe:** no

- `src/lib/firebase/actions/consumer-signup.ts` — `signUpConsumer(formData)`, **public, no
  `requireRole`**. Zod-validated `{ fullName, phone, otpCode }`. Verifies the OTP, then in one
  transaction: create-or-reuse the Auth user → `authProfiles/{uid}` (`role:"member"`,
  `plan:"free"`, `defaultGymId: personal-{uid}`, `activeGymId: personal-{uid}`) →
  `phoneAccounts/{digits}` → `gyms/personal-{uid}` (`type:"personal"`) → `members/{uid}` →
  `affiliations/personal-{uid}`. **Mint custom claims** (see §2.1), exchange the custom token for
  an idToken, then `createSession(idToken)` — reuse the existing helper at `auth.ts:904`.
- **Collision path (§2.4):** if `phoneAccounts/{digits}` already exists, do not create an account.
  Provision only the missing personal workspace and its affiliation, then sign that account in.
- `src/app/signup/page.tsx` + a client form (phone → OTP → name). Add `/signup` to the public set
  in `src/proxy.ts`.
- `firestore.rules`: personal-gym reads for the sole member; `affiliations` self-read.
- Consent: reuse `terms-consent-gate.tsx` and set `termsAcceptedAt` at signup — a direct consumer
  has no gym owner accepting on their behalf. Surface `legal/health-and-fitness-disclaimer.md`.

**Acceptance:** signup on the dev server → session cookie valid → `/member` renders the empty
member home with the user's own name, **not** a blank or errored shell. Firestore shows exactly one
new gym, one member, one affiliation, one `phoneAccounts` doc. Killing the process mid-transaction
leaves no orphan Auth user.

---

### Increment 3 — Affiliations + workspace switching
**Depends on:** 2 · **Parallel-safe:** no · **Touches auth for existing users**

- `src/lib/workspace.ts`: sign/verify the `fitsplit-active-workspace` cookie (HMAC over
  `{gymId, role, memberId}`, 1h `maxAge`, new `WORKSPACE_COOKIE_SECRET` env var — add to
  `.env.example` and `apphosting.yaml`).
- `_getCurrentUserImpl` (`auth.ts:951`): after the claims fast path resolves, overlay a valid
  workspace cookie. **Absent or invalid ⇒ exact current behaviour.**
- `switchWorkspace(gymId)` server action: verify `affiliations/{gymId}.status === "active"`, set
  the cookie, `revalidatePath`.
- Backfill: one `affiliations/{defaultGymId}` doc per existing `authProfiles` doc. Idempotent,
  dry-run first.
- Workspace switcher in `app-topbar.tsx` — **rendered only when the user has ≥2 active
  affiliations**, so every existing user sees no change at all.
- Revocation: `toggleMemberAccess` / `archiveMemberAccount` mark the affiliation `left`.

**Acceptance:** an account with exactly one affiliation produces an identical `getCurrentUser`
result to `main` — assert this with a test, don't eyeball it. A two-affiliation account switches
and sees the other workspace's programs and logs. A revoked affiliation loses access within the
cookie TTL. Playwright `e2e/auth.spec.ts`, `owner.spec.ts`, `member.spec.ts` all still green.

---

### Increment 4 — Self-serve program selection + consumer onboarding
**Depends on:** 2 (not 3) · **Parallel-safe with 3:** yes, different files

- `selectProgramForSelf(formData)` in `actions/programs.ts`, guarded by `requireAuth()`, writing
  **only** for `memberId === currentUser.memberId` in the active gym. Cancels any prior active
  assignment; dual-writes `programAssignments` via `mirrorGymScopedRecord`; self-notification
  instead of the owner notification. **Do not loosen `assignProgramToMember`** — it stays
  owner/admin-only with its `assertMemberBelongsToCallerGym` check.
- Program picker UI reading the existing `@fitsplit/core` `split-library` (same `programId`
  contract as the owner path). A fresh consumer with no assignment routes here instead of seeing
  an empty dashboard.
- Personal-gym empty states across the member shell: no coach note, no gym notices, no PT history,
  no membership card. Today those render gym-shaped placeholders that are nonsense for a solo user.
  **This is the increment where "vibe-coded default" is most likely to creep in — hold the bar.**

**Acceptance:** pick a split → the weekly schedule populates → log a lift → it persists under
`gyms/personal-{uid}/liftLogs` *and* the root mirror. No owner-only UI is reachable from a
personal workspace, by link or by URL.

---

### Increment 5 — Expo mobile signup + parity
**Depends on:** 1, 2 · **Parallel-safe with 3–4:** yes, separate workspace

- `mobile/screens/SignupScreen.tsx`: phone → OTP → name, calling the same two callables.
- `mobile/lib/auth.ts`: `signInWithCustomToken` (JS SDK — works today, no native module).
- Workspace switching on mobile via the claims path (§1.3): callable patches claims →
  `getIdToken(true)` → re-read profile.
- **Account deletion** (§2.6): screen + `deleteOwnAccount` callable that removes the Auth user,
  `authProfiles`, `phoneAccounts`, and the personal gym subtree, honouring
  `legal/data-rights-and-grievance-notice.md`. **Play-store blocking.**
- Confirm `mobile/lib/offline-queue.ts` flushes against the active gym (§2.8).

**Acceptance:** signup on a physical Android build → land in the member tabs → log a lift →
it appears on web for the same account. Account deletion removes everything and the phone can
sign up again cleanly.

---

### Increment 6 — Launch surface + docs
**Depends on:** 2, 4 · **Parallel-safe:** yes

- `src/components/landing/landing-page-client.tsx`: replace the four `onComingSoon` CTAs
  (lines ~343, ~440, and the two nav paths) with real `/signup` links. **Delete
  `coming-soon-modal.tsx`** and its `landing.css` rules — dead code, and the repo has a
  documented no-dead-code posture (`knip.json`).
- Drop the "Coming soon" badges at `landing-page-client.tsx:118,168,180`.
- Update `docs/02_DATA_MODEL_AND_ERD.md` (personal gyms, `affiliations`, `phoneAccounts`),
  `docs/03_BUSINESS_RULES_AND_PRODUCT.md` §2 (B2C is live, free-only), `docs/04_TESTING_AND_LOGINS.md`
  (a consumer test account), and the README's "B2C + B2B Evolution (Planned)" paragraph.
- New Playwright spec `e2e/consumer.spec.ts`: signup → pick program → log lift → sign out → sign in.

**Acceptance:** no route in the app renders "coming soon" for individuals. `npm run knip` reports
no new dead exports. Full E2E suite green.

---

## 4. Explicitly out of scope for v1

Named so a subagent doesn't helpfully build one: Razorpay or any payment gateway; Pro/Free
entitlement *gates* in the UI; history-retention caps; the churn-downgrade funnel; "claim my gym"
reverse-funnel leads; consumer custom program building; Google or Apple sign-in; email as a login
identity; consumer-to-consumer social features.

---

## 5. Subagent dispatch

Sequential chain: **0 → 1 → 2 → {3, 4, 5} → 6**. Increments 3, 4 and 5 fan out in parallel once 2
lands; 5 wants `isolation: "worktree"` since it's a different package.

| # | Agent | Isolation | Gate before merge |
|---|---|---|---|
| 0 | sonnet | branch | typecheck + unit tests |
| 1 | sonnet | branch | `test:rules` + **manual login sweep of `docs/04`** |
| 2 | sonnet | branch | manual signup on dev server + Firestore inspection |
| 3 | sonnet | branch | single-affiliation-unchanged test + full E2E |
| 4 | sonnet | branch | manual pick-program → log-lift round trip |
| 5 | sonnet | **worktree** | physical Android build |
| 6 | sonnet | branch | `knip` + full E2E |

Each subagent brief must carry: this file's §1 and §2 verbatim, its own increment section, the
memory constraints (lime `#C8F135` is fill-only on light surfaces; palette lives in one file; no
generic vibe-coded defaults), and the standing instruction that all rendered dates are pinned to
`Asia/Kolkata` (see `638d3a6`, `0f449c7`).

---

## 6. Risk register

| Risk | Likelihood | Blast radius | Mitigation |
|---|---|---|---|
| DLT / SMS approval slips | **High** | Blocks Inc 1 → 2 → everything | Start paperwork before Inc 0. Increments 0, 3, 4 are testable with a stubbed OTP vendor. |
| `phoneAccounts` repoint breaks a real gym login | Medium | **Every existing user** | Inc 1's own increment + manual sweep of all 56 logins in `docs/04`. Backfill dry-run first. |
| Workspace cookie desyncs from claims | Medium | Wrong-gym data exposure | HMAC + 1h TTL + revocation on the write path. Single-affiliation users never set it. |
| OTP endpoint abused for SMS toll fraud | Medium | Direct ₹ cost | Per-phone + per-IP limits, App Check, daily spend cap alert on the vendor account. |
| Play store rejects for missing account deletion | Low | Delays mobile launch only | Inc 5 ships deletion in the same PR as signup. |
| Personal-gym empty states ship as generic placeholders | **High** | Product quality | Called out in Inc 4. Design review before merge. |
