# openGym → FitSplit: Feature Research & Go-Live Cost Notes

Source reviewed: [alexpcosta/opengym](https://github.com/alexpcosta/opengym) (cloned locally for read-only research, nothing in either repo modified as part of this doc).

## 1. What opengym is

A self-hostable, single-tenant/family fitness tracker — React 19 + Vite PWA frontend (also Capacitor-wrapped for iOS/Android), a minimal Node.js backend (raw `http`, no Express, no database — flat JSON files per user), deployed via Docker Compose. Auth is passkey/WebAuthn only. It targets a self-hoster or small household, not a multi-tenant SaaS — no billing, no org/gym model, no social graph. Its standout feature is an optional AI Coach that reviews training history on a cadence and proposes plan edits through a constrained, auditable pipeline.

This is structurally very different from FitSplit (multi-tenant gym SaaS, Next.js + Firebase/Firestore, owner/admin + member workspace, now adding B2C direct signup), but several algorithms and UX patterns are directly transferable.

## 2. MVP features / UX patterns FitSplit could adopt

| Feature | What it is | Why it's valuable for FitSplit | opengym source |
|---|---|---|---|
| "Why this number?" transparency | Every progressive-overload suggestion carries a human-readable `why` string | Builds trust for admin/AI-assigned programs; members stop treating numbers as arbitrary | `frontend/src/lib/progression.js` |
| Muscle-map heatmap | Canonicalizes ~60 messy muscle-name spellings into 18 muscles, shades a front/back body diagram by training volume (week/month/all-time) | Good fit for FitSplit's member progress screen; surfaces undertrained muscles at a glance | `frontend/src/lib/muscles.js`, `frontend/src/components/BodyMap.jsx` |
| GitHub-style activity heatmap | Calendar heatmap of workout consistency | Cheap, high-impact retention visual | `frontend/src/components/Heatmap.jsx` |
| Weekly (not daily) streak definition | "Trained at least once this week" counts | More forgiving/realistic than daily-only streaks — likely better retention psychology than a brittle daily streak | — |
| Dual-scale effort tracking (RIR or RPE) | User picks their preferred scale, normalized internally to one canonical unit for stats | Meets members where they already are instead of forcing one convention | `frontend/src/lib/effort.js` |
| Consent-gated AI data disclosure | A disclosure endpoint returns exactly which data categories get sent to the LLM, driven from the same constant the payload builder uses — consent screen can't drift from reality | Directly relevant to FitSplit's own AI-coach and Firestore data-governance story, and to [07_B2C_LEGAL_AND_CONSENT_GAPS.md](07_B2C_LEGAL_AND_CONSENT_GAPS.md) | `api/coach/disclosure.js` (payload allowlist) |
| Competitor CSV import | Import from FitNotes, Strong, Hevy, Apple Health | Reduces onboarding churn — relevant since B2C self-signup is exactly where import friction kills conversion | `frontend/src/lib/import-csv.js` |
| Diff-style AI proposal review | Accept/reject each proposed plan change individually, not all-or-nothing | Better UX than a single "apply AI changes" button if/when FitSplit adds AI program suggestions | `frontend/src/views/CoachProposal.jsx` |

## 3. Code / data models / algorithms worth adapting

### 1RM estimation
`frontend/src/lib/onerm.js` — three formulas, caps at 12 reps rather than extrapolating wildly:
```js
export const REP_CAP = 12
export const FORMULAS = {
  epley: (w, r) => w * (1 + r / 30),
  brzycki: (w, r) => w * 36 / (37 - r),
  lombardi: (w, r) => w * Math.pow(r, 0.1)
}
```

### Progressive overload engine
`frontend/src/lib/progression.js` (242 lines) — the standout piece:
- Four named policies: linear, greyskull/AMRAP, double progression, time-based.
- A skipped set always counts as a miss.
- `DELOAD_AFTER = { linear: 3, greyskull: 1, double: 3, time: 3 }` triggers a 10% deload snapped to a loadable increment.
- Bodyweight exercises progress in reps instead of load.

### Volume + streak
`frontend/src/lib/history.js`:
```js
export function workoutVolume(w) {
  let v = 0
  w.entries.forEach(e => e.sets.forEach(s => { if (s.done) v += (s.w || 0) * (s.r || 0) }))
  return v
}
```
Streak walks back week-by-week over a `Set` of trained week-keys.

### AI Coach pipeline
`api/coach/{cadence,jobs,payload,validate}.js` — the best architectural pattern in the repo:
- Cadence tick only enqueues a review when something new happened (no wasted LLM calls).
- Payload builder is a strict allowlist (copies fields by name only), pseudonymizes via HMAC handle, caps history size (`MAX_WEEKS=12`, `MAX_SESSIONS=60`).
- Jobs run as subprocesses under unprivileged uid/gid, per-user single-flight, daily caps.
- Model output validated against a closed change-type allowlist — described in the codebase as "the actual security boundary of the feature":
```js
export const CHANGE_TYPES = [
  'add-exercise', 'remove-exercise', 'swap-exercise',
  'sets', 'reps', 'repsMin', 'sec', 'cardio',
  'reorder', 'superset', 'routine-prog', 'exercise-prog', 'inc',
  'add-routine', 'remove-routine', 'rename-routine', 'week'
]
```
- Pending AI proposals live server-side, separate from the synced client state blob, so a whole-blob client sync can't silently clobber a pending review.

### Core data model
`frontend/src/store/useStore.js`, `frontend/src/lib/exercises-data.js`:
- Root state: `{ bodyweight[], routines[], week{}, dayPlan{}, workouts[], active, customEx[], effort, coach }`
- `workouts[]`: `{ id, d, start, end, rating, note, prs[], entries: [{ id, target, sets[] }] }`, set shape varies by mode (reps/time/cardio).
- Exercise library entry: `{ id, n, bp, eq, tg, mg, sm[], st[], img, gif }` (~1,324 exercises).

## 4. Red flags — do not copy into FitSplit

- **Whole-blob sync, last-write-wins** — entire per-user state PUT/GET as one JSON keyed by client timestamp; concurrent-device edits can silently lose data. Wrong fit for Firestore's granular per-document writes.
- **No real database** — flat JSON files read synchronously in hot paths (`fs.readFileSync`/`readdirSync`); won't scale past self-hosted single-family use.
- **Client is source of truth** for progression/1RM/streaks — server never validates workout data. Risky if this state ever feeds trainer decisions or billing.
- **Env-var-based admin role** (`ADMIN_UIDS` comma list) instead of real RBAC — granting/revoking admin needs a restart.
- **Duplicated business logic** between frontend (`progression.js`/`coach.js`) and backend (`payload.js`) with no shared build step — FitSplit's `@fitsplit/core` shared package already avoids this class of drift; keep using it for any ported logic.
- **Secrets on disk** rather than a secrets manager — fine for self-hosting, not managed SaaS.
- **No pagination** anywhere in admin/history views — fine at small scale, won't hold at FitSplit's multi-gym scale.

---

## 5. Go-live cost notes (FitSplit on Firebase)

FitSplit runs on Firebase (Firestore + Cloud Functions + Hosting) on the Blaze (pay-as-you-go) plan — required for any outbound network calls (e.g. OTP/SMS, or an AI coach calling an LLM) and for Cloud Functions beyond the free tier. These are **directional estimates based on Firebase's published pricing**, not a bill — actual cost depends entirely on usage patterns, and should be re-validated against the [Firebase Pricing page](https://firebase.google.com/pricing) and the GCP Billing console before committing to it.

### Firestore (Native mode)
- **Free tier (per day):** 50K reads, 20K writes, 20K deletes, 1 GiB stored.
- **Beyond free tier:** ~$0.06 per 100K reads, ~$0.18 per 100K writes, ~$0.02 per 100K deletes, ~$0.18/GiB stored/month.
- FitSplit's read-heavy screens (member dashboard, macros, progress, admin reports) mean **reads** will be the dominant Firestore cost driver, especially with the current per-document/collection query patterns rather than aggressive caching.

### Cloud Functions (2nd gen)
- **Free tier (per month):** 2M invocations, 400K GB-seconds compute, 200K CPU-seconds, 5 GB outbound networking (within same region it's free).
- **Beyond free tier:** ~$0.40 per million invocations + compute time billed per GB-second/CPU-second (varies by memory/CPU allocation).
- Server actions (OTP send/verify, `switchWorkspace`, `selectProgramForSelf`, progress mirroring) each count as invocations; OTP SMS delivery itself is billed separately by the SMS provider (Twilio/MSG91/etc., not Firebase) — that's usually the real per-user cost driver for B2C signup, not the function invocation itself.

### Firebase Hosting (serves the Next.js app)
- **Free tier:** 10 GB storage, 360 MB/day (~10 GB/month) data transfer.
- **Beyond free tier:** ~$0.026/GB storage/month, ~$0.15/GB transfer.
- Cheap unless serving large unoptimized images/video at scale.

### Firebase Auth
- Free for email/password and OAuth providers.
- **Phone Auth (SMS/OTP)** is billed per verification after a small free allotment and varies heavily by destination country — this is worth pricing out specifically for India-based OTP volume before B2C launch, since it scales linearly with signups, not with plan tier.

### Cloud Storage (if used for profile photos, exercise media, etc.)
- **Free tier:** 5 GB storage, 1 GB/day download.
- **Beyond free tier:** ~$0.026/GB stored/month, ~$0.12/GB downloaded.

### Rough monthly floor at go-live
At low initial volume (a handful of gyms, low hundreds of members), FitSplit will likely stay **within or just above the Blaze free tiers** — realistically low single-digit dollars to ~$10–30/month — with the two variables to watch being:
1. **Firestore read volume** as member/admin screens scale (dashboards, reports, progress charts all issue reads on load).
2. **OTP/SMS cost** for B2C phone-based signup, which is a genuinely per-user variable cost, not a fixed platform fee.

### Action items before go-live
1. Enable **Firebase Budget Alerts** in GCP Billing console with a low threshold (e.g. $10, $25) so cost growth is visible early rather than discovered on an invoice.
2. Confirm the actual SMS/OTP provider and per-message cost for the target OTP volume — this is currently the least-Firebase-native, most usage-driven line item.
3. Audit Firestore read patterns on the highest-traffic screens (member dashboard, admin reports) for redundant reads before they compound at scale.
4. Revisit this section against the live [Firebase Pricing page](https://firebase.google.com/pricing) close to actual launch — published rates and free-tier thresholds do change.
