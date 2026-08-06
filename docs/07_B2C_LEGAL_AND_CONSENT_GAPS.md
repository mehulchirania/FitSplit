# 07 · B2C Legal & Consent Gaps

`Authored: 2026-08-06 · Status: **gap register — needs Mehul's decisions + a lawyer's review**`

> Companion to [`06_B2C_IMPLEMENTATION_PLAN.md`](06_B2C_IMPLEMENTATION_PLAN.md). Increment 2 of
> that plan says "reuse `terms-consent-gate.tsx` and set `termsAcceptedAt` at signup". That is
> mechanically correct and legally insufficient. This file records why.
>
> **I am not a lawyer and have not rewritten the legal documents.** What follows is a gap
> register with drafting notes. Every clause change below should be reviewed by counsel before
> it ships. Two items are **product decisions that block Increment 2** and are called out first.

---

## 1. The two things that block Increment 2

### 1.1 There is no gym to gatekeep minors — and India's DPDP Act cares

Today, every account is created by a gym, and the legal corpus **assigns the minors obligation to
that gym**:

- `legal/consent-notice.md:49` — the gym confirms it will "obtain required consents, including
  for health and fitness data, location-based attendance, **minors where applicable**".
- `legal/gym-data-processing-addendum.md:83` — the Gym must "obtain consent where required,
  including **for minors**, health/fitness data, location/geofence attendance".
- `legal/terms-of-service.md:31` — "Gyms are responsible for ensuring they have authority to
  create and manage member and staff accounts, **including any required parent or guardian
  consent for minors**."

**In a self-serve signup there is no gym.** That obligation currently falls on nobody, and the
product would be collecting health and fitness data from anyone who types in a phone number.

India's Digital Personal Data Protection Act 2023 treats anyone under 18 as a child and requires
**verifiable parental consent** before processing their data, with additional restrictions on
tracking and behavioural monitoring of children. FitSplit's consumer product collects body weight,
body-fat percentage, height, age, goals, injury notes, and training history — squarely the kind of
data that makes this matter.

**Decision needed before Increment 2's signup form is built:**

| Option | Implication |
|---|---|
| **Block under-18 self-signup** (simplest, my recommendation) | Capture date of birth at signup, refuse under-18s with a message pointing them at a gym-created account, where the gym carries the existing obligation. Costs one form field and one branch. Does not require a parental-consent flow. |
| Build a verifiable parental-consent flow | Materially larger: a second identity to verify, records of consent, and a defensible verification method. Not a v1 feature. |
| Ship without an age gate | Leaves a DPDP exposure with no party accountable, on a product that collects children's health data. I would not recommend this. |

Whichever you pick, the signup form needs a **date-of-birth field**, so this decision has to land
before Increment 2's form is built rather than being retrofitted.

### 1.2 Account deletion must be self-serve, and the Terms currently say otherwise

`legal/terms-of-service.md:114` — "Members may request account deletion through available app
flows or **by contacting their gym** or FitSplit."

A direct consumer has no gym to contact. This is the same requirement flagged in
[`06`](06_B2C_IMPLEMENTATION_PLAN.md) §2.6 as **Google Play blocking** (Play requires in-app
account deletion for any app offering account creation), so it is already scheduled in
Increment 5 — but the Terms sentence has to change with it, and `legal/data-rights-and-grievance-notice.md`
needs a consumer-facing route that doesn't run through a gym.

---

## 2. The structural gap: FitSplit becomes a data controller

This is the change with the widest blast radius across the documents.

`legal/privacy-policy.md:23` — "For most member and staff data inside a gym workspace, the gym
decides why and how the data is used. In that context, **the gym is generally the
controller/data fiduciary/business, and FitSplit is the processor**."

`legal/gym-data-processing-addendum.md:19-20` says the same.

**For a direct consumer there is no gym in the chain. FitSplit is the controller / data fiduciary
for that person's data**, with the full set of controller duties: lawful basis, purpose
limitation, retention, breach notification, and answering data-rights requests directly rather
than forwarding them to a gym.

The documents currently have **no third category**. They describe gym-controlled data and
FitSplit's own platform-operations data, and a consumer's training data is neither. Every document
below needs a consumer branch added:

| File | What's wrong for a direct consumer |
|---|---|
| `privacy-policy.md:5` | Scoped to "the FitSplit **gym-management** platform". |
| `privacy-policy.md:17` | Audience list is members, staff, and gym customers — no self-coached consumer. |
| `privacy-policy.md:23,25` | The controller/processor split has no consumer case. **Highest priority.** |
| `privacy-policy.md:27` | "your gym may be the best first contact" — there is no gym. |
| `privacy-policy.md:103` | Data sources assume a gym creates the account. |
| `terms-of-service.md:5,13` | Service defined as a gym-management platform for "gyms, trainers, staff, and members". |
| `terms-of-service.md:35` | Refers to a "member PIN"; consumers authenticate by phone OTP and have no PIN. |
| `terms-of-service.md:39` | "contact their gym owner if they suspect unauthorized access". |
| `terms-of-service.md:41-50` | The roles section has no self-coached consumer role. |
| `terms-of-service.md:90` | Repeats the processor framing. |
| `terms-of-service.md:116-122` | Termination grounds assume a gym relationship ("your gym disables your account"). |
| `health-and-fitness-disclaimer.md:5,9` | Framed as gym-management software with trainer oversight. **See §3.** |
| `data-rights-and-grievance-notice.md:89` | Rights routed via "gym controller instructions". |
| `consent-notice.md` | Has no consumer-signup consent block at all — only the gym-authority one at line 49. |

---

## 3. The health disclaimer gets *more* load-bearing, not less

`legal/health-and-fitness-disclaimer.md` currently reads as though a gym and its trainers are in
the loop — line 9 lists "trainer notes" and "coaching" among the covered content.

A self-coached consumer has **no trainer, no gym induction, and nobody watching them lift.**
FitSplit's program library is the only thing telling them what to do. The disclaimer should be
surfaced **at signup**, not buried behind a link — [`06`](06_B2C_IMPLEMENTATION_PLAN.md) §3
Increment 2 already calls for this, and this is the reason why.

Recommended: the consumer consent step explicitly acknowledges the health disclaimer as a separate
line item rather than folding it into a general "I agree to the Terms". `terms-consent-gate.tsx`
today links Terms and Privacy only (lines 69-73); a consumer variant should add the disclaimer.

---

## 4. What I'd change in the product

Independent of the document edits, all inside Increment 2's scope:

1. **Date-of-birth field on the signup form**, driving whatever §1.1 decision you make.
2. **A consumer-specific consent block** at signup — Terms + Privacy + **Health & Fitness
   Disclaimer**, with the disclaimer called out separately. Record `termsAcceptedAt` plus a
   `consentVersion` so a future re-consent can be targeted at people who accepted an old version.
   The current schema records only a timestamp, which cannot answer "who accepted which text".
3. **`consentVersion` on `authProfiles`** — cheap now, impossible to backfill later.
4. Keep the existing gym-member consent path exactly as it is. None of this touches B2B.

---

## 5. What I did not do

I did not edit any file in `legal/`. These are live legal documents for a real product operated by
Blume Labs (`terms-of-service.md:178`), and the controller/processor change in §2 in particular is
a substantive legal position, not a copy edit. The register above is meant to go to counsel more or
less as-is; the product changes in §4 can proceed in parallel once you've made the §1.1 call.
