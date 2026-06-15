# FitSplit — B2C + B2B Model Design Plan

> Status: **Design / not yet implemented.** Authored 2026-06-15.
> Decision locked: gym members of a paying gym receive the **full Consumer Pro** feature set at no extra cost ("members get full Pro free").
> This is a functional + architecture plan, not an implementation plan. See §6 for phasing.

---

## 1. The core strategic problem (and the principle that solves it)

Today FitSplit is one product (gym operations software), sold to one buyer (the gym owner),
consumed by a captive audience (their members). The goal is to open the **consumer** side
directly (B2C) — with a free tier for adoption and a paid tier with all features — while
keeping the **business** (B2B) side a must-buy. Nobody pays from day 1, so Free has to be
real, but it must not let gym owners conclude "free is good enough."

**The trap:** splitting one feature list by *quantity* (free = a bit, paid = more). That makes
the paid business tier look like "the same thing but bigger," and the free consumer tier
slowly becomes good enough.

**The principle: segment by job-to-be-done, not by quantity.**

- **Consumer plans** answer: *"Help me train myself better."* — self-coaching, logging, programs, progress.
- **Business plans** answer: *"Help me run a roster of paying clients."* — member management, payments, attendance, PT delivery, revenue, multi-staff.

These are different jobs. A solo lifter gets **zero** value from membership-expiry tracking,
geofenced attendance, payment approvals, trainer-visibility rules, or a revenue dashboard.
So business value is structurally **un-cannibalizable** by any consumer tier — it isn't
withheld, it's simply *for a different job*. That is the moat. Everything below enforces this line.

---

## 2. User segments

| Segment | Who | Buys what | Primary job |
|---|---|---|---|
| **Consumer Free** | Solo lifter, no gym affiliation | Nothing (acquisition tier) | Log workouts, follow a program |
| **Consumer Pro** (paid) | Committed self-coached lifter | Personal subscription | Full self-coaching: analytics, unlimited history, custom programs, macros |
| **Gym Member (entitled)** | Member of a paying gym | Nothing — covered by their gym | Consumer Pro **+** gym-delivered services (PT, gym programs, attendance) |
| **Business** (paid) | Gym owner / operator | Per-gym subscription (tiered by member count) | Run the roster |
| **Trainer / Staff** | Employed by a gym | Nothing — seat under the gym | Deliver PT, manage assigned members |
| **Admin** | Platform (Mehul) | — | Platform ops |

Strategically important relationships:

- **Gym Member entitlement = Consumer Pro, granted by the gym** (decision locked). This is a
  *sales weapon* for the business tier: "Subscribe and every one of your members gets the
  full Pro app for free." It also means the Pro feature set is built **once**.
- **Churn funnel:** a member who leaves their gym auto-downgrades to Consumer Free with a
  one-tap "Keep your history — go Pro" upsell. Data persists. B2B churn becomes B2C revenue
  instead of pure loss.
- **Reverse funnel (growth flywheel):** Consumer users are demand signal. A consumer can
  "claim/invite my gym," producing warm B2B leads from the consumer base.

---

## 3. Packaging & feature matrix

Mapped to features that already exist in the schema (`liftLogs`, `workoutSessions`,
`macroLogs`, `bodyMetricLogs`, `workoutPrograms`, `ptSessions`, `attendanceRecords`,
`memberships`, `paymentRequests`, `summaries`).

| Capability | Consumer Free | Consumer Pro | Business (per gym) |
|---|---|---|---|
| **Self-coaching** | | | |
| Workout logging (`liftLogs`, `workoutSessions`) | ✅ | ✅ | ✅ (members) |
| Predefined split library (`split-library`) | ✅ limited (1–2 splits) | ✅ all + weekly variations | ✅ |
| Custom / self-built programs | ❌ | ✅ | ✅ |
| Workout history retention | Last ~30–90 days | Unlimited | Unlimited |
| Progress analytics / charts (volume, PRs, body metrics) | Basic (current only) | ✅ Full trends | ✅ |
| Macro & nutrition tracking (`macroLogs`) | Limited (today only) | ✅ Targets + history | ✅ |
| Body metrics (`bodyMetricLogs`) | ✅ basic | ✅ + trends | ✅ |
| Offline logging (Dexie) | ✅ | ✅ | ✅ |
| Exercise tutorials / media | Predefined only | Predefined only | ✅ + gym custom media |
| **Roster operations (business job — never in consumer tiers)** | | | |
| Manage other people's profiles (`members`) | — | — | ✅ |
| Membership & expiry tracking (`memberships`) | — | — | ✅ |
| Packages & payments (`packages`, `paymentRequests`) | — | — | ✅ |
| Geofenced attendance (`attendanceRecords`) | — | — | ✅ |
| Personal Training delivery (`ptSessions`, trainer-logged sets) | Receive only* | Receive only* | ✅ Deliver |
| Trainer seats + visibility rules | — | — | ✅ |
| Owner dashboard / revenue (`summaries`) | — | — | ✅ |
| Multi-staff, notices, branding | — | — | ✅ |

\* "Receive only" = an entitled gym member can *see* PT sessions/programs their gym assigns;
a consumer cannot *run* PT for others.

**Why owners keep paying:** every Business-only row is operational and multi-person. None is a
"bigger number" version of a consumer feature — so a gym owner literally cannot run their
business on a consumer plan, free or paid. The decision is never "is free good enough," it's
"can I run my gym without member management, payments, and attendance" — and the answer is no.

**Free → Pro conversion levers** (consumer monetization, kept honest so Free is useful but Pro
is obviously worth it): history-retention cap, analytics/trends, custom programs, full split
library, macro history. These bite exactly when the user is most invested — after a few weeks
of consistent logging.

---

## 4. Technical architecture

The gym-scoped data model can absorb B2C with **low structural risk** given the right abstraction.

### 4.1 Key decision: model a consumer as a "personal gym" (self-gym)

Everything lives under `gyms/{gymId}/...` with a dual-write to root collections, and
`requireRole`/read-models assume a `gymId`. Rather than fork every read-model/rule/action with
a `gymId === null` path, **provision each consumer a private workspace that *is* a gym**, where
the consumer is simultaneously the sole owner and sole member.

- New consumer signs up → create `gyms/personal-{uid}` with `type: "personal"`, plus their
  `members/{uid}` doc and an `authProfile`.
- `liftLogs`, `workoutSessions`, `macroLogs`, programs, etc. keep working unchanged — written
  under the personal gym.
- Owner-operations surfaces (member list, payments, attendance, PT delivery, dashboard) are
  **not rendered** for `type: "personal"` gyms and are gated by entitlement.

**Why this wins:** reuse the dual-write pattern, `mirrorGymScopedRecord`, read-models (with
cache tags + mock fallbacks), and Firestore rules almost wholesale. The consumer app is the
member experience already built, pointed at a self-owned gym. It adds a workspace *type*, not a
second data architecture.

Add to `GymWorkspace` (`src/types/domain.ts`):
```ts
type: "business" | "personal";   // default "business" for all existing gyms
```
Migration = backfill `type: "business"` on existing gym docs (non-breaking).

### 4.2 Entitlements layer (new)

Today access is gated by **role** (`requireRole`). Plans cut *across* roles — a member can be
Free or Pro; a gym can be on different business tiers. Introduce a separate **entitlements**
concept so role is never overloaded with billing.

- Store the plan on the billing owner:
  - Consumer: on the account / `authProfile` → `plan: "free" | "pro"`.
  - Business: on the gym doc → `plan: "biz_starter" | "biz_growth" | ...` (or by member-count tier).
- Resolve a normalized entitlement set at session time (alongside `requireRole`):
  ```ts
  type Entitlements = {
    unlimitedHistory: boolean;
    customPrograms: boolean;
    fullAnalytics: boolean;
    macroHistory: boolean;
    canManageRoster: boolean;   // business
    canDeliverPT: boolean;      // business
    seats: number;
  };
  ```
- **Entitlement = max(personal plan, gym-granted plan).** An entitled gym member resolves to
  Pro-level even on a `free` personal account, because their gym's business plan grants it
  (decision locked: members get full Pro free). One function, `resolveEntitlements(user, gym)`,
  is the single source of truth.
- Gate with `requireEntitlement("customPrograms")` on the server (Admin SDK bypasses rules, so
  this must hold the same bar as `requireRole`) + UI capability checks to show upsell instead of
  a hard 403. **Never** gate on raw plan strings scattered through the code — always go through
  the resolved entitlement so repricing is config, not a refactor.

### 4.3 Auth & onboarding

Auth currently assumes gym-scoped identities (`${memberId}@members.fitsplit.app`,
username/phone uniqueness *within a gym*, `pin-{4digits}`). Consumers self-serve:

- **Add a self-signup path** (email/password or phone OTP, ideally Google sign-in) → provision
  personal gym + member doc + `authProfile`. Distinct from the gym-issued `pin-{4digits}` flow,
  which stays for gym members.
- Phone/username uniqueness: today per-gym (`phones` = `gymId:phone`). Consumer logins need
  **global** uniqueness — add a global index for self-serve accounts; keep per-gym for
  gym-issued ones. Careful migration to avoid collisions.
- Routing: add `/app` (or reuse `/member`) consumer home rendering self-coaching surfaces
  against the personal gym. The existing `member` role + `MemberSubSidebar` shell is most of this.

### 4.4 Account ↔ gym membership linking (highest-uncertainty piece)

A person may be a consumer *and* join a gym later (or be both). Model an **account** that holds
multiple gym affiliations:

- Personal workspace (always present).
- Zero or more business-gym memberships.
- "Switch workspace" UI (the fixed-shell pattern already exists). In a business gym, the gym's
  entitlements apply; in personal space, the personal plan applies.
- **Data portability:** workout history belongs to the user. Joining/leaving a gym keeps history
  in the personal workspace; gym-delivered content (assigned programs, PT logs) is read-shared.
  This makes leaving a gym a *downgrade, not a data loss* — critical for churn-capture and trust.

This account-as-identity (vs gym-affiliation) model is the one genuinely new concept and
deserves a dedicated design spike before building.

### 4.5 Billing

The existing `paymentRequests` flow (cash / owner-approved) is *gym→member* billing and stays.
**Platform billing is new and separate** (FitSplit→customer, recurring):

- India-first → **Razorpay subscriptions** (UPI autopay/cards). Stripe if going international.
- Webhook → updates `plan` + entitlements on account/gym. Build an internal grant/revoke path so
  comps, trials, and failed-payment grace periods don't touch gateway logic.
- **Free trial** for Business (entitlements on, billing deferred) matters more than discounting —
  let owners feel the roster tooling before paying.

---

## 5. Pricing posture (recommendation)

- **Consumer Free:** ₹0. Generous enough to build the logging habit; capped on
  history/analytics/custom programs.
- **Consumer Pro:** one low price, monthly + discounted annual. Annual is the target (fitness
  retention is seasonal; annual smooths it).
- **Business:** tier by **active member count** (e.g. up to 50 / 200 / unlimited), *not* by
  features — every business tier gets all operational features (withholding ops features pushes
  small gyms toward "free is fine"). Price scales with the value metric (roster size). Every tier
  bundles "all your members get Pro" as the headline.
- Trainer seats: included up to N per tier, then per-seat.

Rationale: consumers are **feature-gated** (pay to unlock capability), businesses are
**usage-gated** (pay as they grow). Mixing these is the classic cannibalization mistake.

---

## 6. Rollout phases

1. **Foundation (no user-visible B2C):** add `gym.type`, backfill `business`; build the
   entitlements resolver + `requireEntitlement`; thread entitlement gates into existing member
   surfaces behind a flag. Zero behavior change for current users.
2. **Consumer beta:** self-signup + personal-gym provisioning; `/app` consumer home reusing member
   surfaces; Free tier only (no billing). Validate the self-coaching loop end-to-end.
3. **Monetize consumers:** Razorpay subscriptions; Free/Pro gates live; history-cap + upsell UI.
4. **Business repackaging:** business tiers + "members get Pro free" entitlement grant; platform
   billing for gyms; free trial. Migrate the SHG pilot onto the new business plan.
5. **Funnels:** churn-downgrade flow (leave gym → Free + upsell); "claim/invite your gym" B2C→B2B
   lead capture; account-multi-gym switching.

Each phase ships independently, keeping `npx tsc --noEmit` and `npm run build` clean, with docs
updated per change.

---

## 7. Top risks & open decisions

- **Account-vs-gym identity refactor (§4.4)** — highest uncertainty; do a design spike before Phase 2.
- **Global uniqueness for consumer logins** vs current per-gym scoping — careful migration to avoid collisions.
- **Entitlement enforcement on the server**, not just UI — must hold the `requireRole` bar or Pro features leak.
- **Free-tier generosity calibration** — too thin and the habit never forms; too rich and Pro/Business erode. Instrument retention by tier from day one.
- **Don't fork the data model** — the self-gym approach only pays off if `gymId === null` special cases are resisted. Hold the line in review.
