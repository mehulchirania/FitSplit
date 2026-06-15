# Spike — Account-as-Identity vs Gym-Affiliation (B2C §4.4)

> Status: **Design spike / decision doc.** Authored 2026-06-15.
> Resolves the highest-uncertainty item in [`B2C_B2B_DESIGN.md`](B2C_B2B_DESIGN.md) §4.4.
> Grounded in `src/lib/auth.ts`, `src/types/domain.ts`, `src/lib/firebase/collections.ts`.

---

## The question

Today a person **is** their gym affiliation: one Firebase Auth `uid` → one `authProfiles/{uid}`
doc → one `role` + one `defaultGymId`. To support B2C we need a person who can be, at once:

- a self-serve consumer (their own *personal gym*), and
- optionally a member of one or more *business gyms*, and
- possibly an owner/trainer of a gym.

So: **is identity the account, or the affiliation?** And how much of the codebase must change?

---

## Three findings that make this cheap

The code is already most of the way there:

1. **`defaultGymId` is already named for multi-gym.** `AuthenticatedUser.gymId` is sourced from
   `profile.defaultGymId` (`auth.ts:450`). The field name presupposes a *default among several*.
2. **History is already portable.** Every `liftLog`/`workoutSession`/`macroLog`/`bodyMetricLog`
   is dual-written to a **root** collection keyed by `memberId` (= `uid`). A person's training
   history is therefore queryable by `memberId` **independent of gym**. No data migration is
   needed to "carry history" between workspaces — the substrate exists.
3. **Downstream reads a single `gymId`/`role`.** `requireRole`, every read-model, and every
   server action consume `AuthenticatedUser.{gymId, role, memberId}` — one gym, one role. If we
   keep that shape, none of them change.

---

## Recommendation

### Identity = the Firebase Auth `uid` = the **account**. Affiliation is data hanging off it.

- `authProfiles/{uid}` becomes the **account record** (one per person). It carries:
  - login identity (`authEmail`, `phone`, `username`) — globally unique,
  - **consumer plan** (`plan: "free" | "pro"`),
  - `defaultGymId` → repurposed as **active/last-used workspace**,
  - the list of affiliations (see below).
- An **affiliation** = `{ gymId, role, scopedDocId, status, joinedAt }`:
  - `role` is now **per-affiliation**, not per-account (you can be `owner` of gym A and `member`
    of your personal gym).
  - `scopedDocId` = the `gyms/{gymId}/members|staff/{id}` doc id (still `uid` in practice).
  - The **personal gym** is just an affiliation with `gymId = personal-{uid}`, `role = "member"`,
    against a gym whose `type = "personal"` (per design doc §4.1).

**Storage:** affiliations as a **subcollection** `authProfiles/{uid}/affiliations/{gymId}`
(recommended) — granular rules, no array-write contention. An array on the doc is acceptable for
a v1 if N stays tiny; subcollection is the safer default. *(Open decision A.)*

### Contain all multi-gym complexity inside auth resolution.

The session stays keyed to `uid`. Add one concept: **`activeGymId`** (in the session
compatibility cookie / a session claim, seeded from `defaultGymId`).

`getCurrentUser()` then:
1. verifies the session cookie → `uid` (unchanged),
2. loads the account (`authProfiles/{uid}`),
3. picks the affiliation matching `activeGymId`,
4. **projects it into the existing single-gym `AuthenticatedUser`** (`gymId`, `role`, `memberId`
   all come from the active affiliation).

> **This is the load-bearing move.** Because step 4 emits the *same* `AuthenticatedUser` shape,
> `requireRole`, read-models, and all server actions are untouched. Multi-gym lives entirely in
> the resolver. "Switch workspace" = rewrite `activeGymId` + re-resolve. Blast radius ≈ the auth
> module only.

### Entitlements layer plugs in here.

`resolveEntitlements(account, activeGym)` = **max(account.plan, activeGym-derived plan)**. The
locked decision ("members get full Pro free") is exactly: if `activeGym.type === "business"` and
the gym's plan is paid → grant Pro entitlements regardless of `account.plan`. One function,
called right after step 4.

---

## What has to change (and what doesn't)

**Changes — confined to auth + provisioning:**

- `authProfiles` doc gains `plan`; add `affiliations` subcollection; `defaultGymId` semantics →
  "active workspace".
- `getProfileById` (`auth.ts:330`) collectionGroup lookup `where("id","==",uid).limit(1)` is
  **ambiguous once a uid has member docs in >1 gym** — must resolve via the account doc +
  `activeGymId` (direct fetch `gyms/{activeGymId}/members/{uid}`) instead of `.limit(1)`.
- `getCurrentUser` / `createSession` thread `activeGymId`; add a `switchWorkspace(gymId)` action.
- **Self-signup path** (email/password or phone OTP) → provisions account + personal gym +
  affiliation. Distinct from the gym-issued `pin-{4digits}` flow, which stays.
- **Account linking**: when an owner adds a member whose phone/email matches an existing account,
  **add an affiliation** instead of minting a new uid. Enables "already a consumer → joins gym"
  and "leaves gym → keeps personal workspace + history."

**Does NOT change:**

- `AuthenticatedUser` shape, `requireRole`, `requireOwner`, every read-model, every server action.
- The dual-write pattern and root collections (they already give portability).
- The `pin-{4digits}` gym-member login flow.

---

## Uniqueness model (important subtlety)

Two different uniqueness scopes, and they must not be conflated:

- **Login identity** (account-level) → **global** uniqueness. `usernames` is already global
  (doc id = normalized username) ✅. Add a **global phone index** for self-signup login phones.
- **Gym member contact** (per-gym) → `phones` = `gymId:phone` stays per-gym; the same human can
  be a contact in two gyms.

---

## Migration (non-breaking)

1. Backfill `gym.type = "business"` on all existing gyms.
2. For each existing `authProfiles/{uid}`: create one affiliation `{ gymId: defaultGymId, role,
   status: "active" }`; set `plan: "free"`; `activeGymId` seeds from `defaultGymId`.
3. Existing users have exactly one affiliation → behave identically. Zero UX change.
4. `pin`-only members get accounts **lazily** (on first self-claim) rather than a forced
   backfill. *(Open decision C.)*

---

## Open decisions (defaults chosen; flag to revisit)

- **A. Affiliations storage** — subcollection (default) vs array-on-doc. *Default: subcollection.*
- **B. v1 cardinality** — support N business affiliations now, or cap at {1 personal + ≤1
  business} to simplify the switcher? *Default: model N (cheap, since resolution is per-active);
  ship the switcher UI only when a 2nd affiliation is actually possible.*
- **C. Existing pin-only members** — lazy account creation on self-claim (default) vs eager
  backfill. *Default: lazy.*

---

## Verdict

The §4.4 "highest-uncertainty" risk is **substantially retired.** The account/affiliation split
is a clean, additive model, and the codebase's existing `defaultGymId` naming + root-collection
portability + single-`gymId` consumption pattern mean the refactor is **contained to the auth
module + a provisioning/self-signup path** — not a platform-wide rewrite. Foundation phase
(§6.1) can proceed on this footing: build the entitlements resolver to take
`(account, activeGym)` from day one, even while every user still has exactly one affiliation.
