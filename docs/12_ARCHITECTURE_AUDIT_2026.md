# 12 · Architecture & Backend Audit — 2026-06-28

> **Scope.** Firestore cost patterns, B2B2C scaling readiness, collection architecture, and data model gaps.  
> **Method.** Full codebase scan: all read-models (`src/lib/firebase/read-models/`), all Server Actions (`src/lib/firebase/actions/`), domain types, and graphify knowledge graph query.
> **Implementation update 2026-06-28.** Sprint 1 easy wins are now implemented: `progress.ts` hot paths write gym-scoped only, `syncOfflineLifts` writes deterministic gym-scoped lift docs, `getGymWorkspaces` / `getGymDetail` use gym doc counters, and member notification/body-metric reads are gym-scoped at the main call sites.

---

## Executive Summary

Five findings block cost-effective B2B2C scale. In order of severity:

1. ~~**progress.ts still dual-writes**~~ — **fixed 2026-06-28 for hot paths.** Lift logs, body metrics, macro logs, activity logs, workout sessions, and attendance records now write gym-scoped only.
2. ~~**`getGymWorkspaces` is a 3-way full-collection scan**~~ — **fixed 2026-06-28.** It now reads only `gyms` and uses denormalized gym counters.
3. **Read-model fallbacks double every read** — all progress, notification, and member read-models try gym-scoped first, then fall back to root. Empty gym-scoped collections pay for 2 reads per query.
4. **`getMemberNotifications` / `getBodyMetricLogsForMember` use unscoped collectionGroup queries** — they filter by `recipientId`/`memberId` across all gyms. Cost scales linearly with gym count even though each member belongs to exactly one gym.
5. ~~**`syncOfflineLifts` writes root-only**~~ — **fixed 2026-06-28.** Offline sync now writes deterministic gym-scoped lift docs in a single batch.

---

## Firebase Pricing Reference (2026)

| Operation | Cost |
|---|---|
| Read | $0.06 / 100K |
| Write | $0.18 / 100K |
| Delete | $0.02 / 100K |
| Count aggregation | $0.06 / 100K (1 read = 1 count op) |
| Storage | $0.108 / GiB-month |
| Egress | Free within GCP region |

A 30-set workout session with current code: ~66 Firestore writes ($0.000119 per session). At 200 active members × 20 sessions/month = 264,000 writes/month = **$0.48/month just for lift logs**. At B2B2C scale with 100 gyms: **$48/month** for workout writes alone, before any reads.

---

## Section A — Progress Actions: Dual-Write Not Removed (R4 Incomplete)

**File:** `src/lib/firebase/actions/progress.ts`

Every personal progress operation currently does 2 writes instead of 1:

| Action | Root write | Gym-scoped write | Total |
|---|---|---|---|
| `logLiftSet` | `liftLogs/{id}` | `gyms/{gym}/liftLogs/{id}` | 2 |
| `logBodyWeight` | `bodyMetricLogs/{id}` | `gyms/{gym}/bodyMetricLogs/{id}` + `mirrorProfileToGym` | 3 |
| `logDayStatus` | `dayLogs/{docId}` | `gyms/{gym}/dayLogs/{docId}` | 2 |
| `saveMacroLog` | `macroLogs/{docId}` | `gyms/{gym}/macroLogs/{docId}` | 2 |
| `logActivity` | `activityLogs/{id}` | `gyms/{gym}/activityLogs/{id}` | 2 |
| `startWorkoutSession` | `workoutSessions/{id}` + `attendanceRecords/{id}` | gym-scoped mirrors ×2 | 4 |
| `endWorkoutSession` | `workoutSessions/{id}` + `attendanceRecords/{id}` | gym-scoped ×2 | 4 |
| `updateMakeupStatus` | `dayLogs/{id}` | `gyms/{gym}/dayLogs/{id}` | 2 |

**`syncOfflineLifts` is the worst case**: writes N lift records to root `liftLogs` in a batch — no gym-scoped mirror at all. Every offline sync leaves data only in the root collection, inconsistent with the rest of the write path.

**Read-model analysis** (`read-models/progress.ts`): All read functions (`getBodyMetricLogsForMember`, `getDayLogsForMember`, etc.) try gym-scoped collectionGroup first, then fall back to root. Once root writes are removed, the gym-scoped path will always win and fallbacks can eventually be deleted. **Safe to remove root writes from progress.ts.**

**Status 2026-06-28:** Implemented for the hot progress/session paths. `syncOfflineLifts` now writes deterministic gym-scoped lift docs in one batch. Remaining migration work is to backfill/archive legacy root data and remove fallback reads when safe.

---

## Section B — `getGymWorkspaces`: O(G × M) Full-Collection Scan

**File:** `src/lib/firebase/read-models/gyms.ts:18`

```
3 parallel queries on every admin dashboard load:
  1. db.collection("gyms").get()                                     → reads every gym doc
  2. db.collectionGroup("members").get()                             → reads ALL member docs across ALL gyms
  3. db.collection("authProfiles").where("role","==","member").get() → reads ALL member authProfiles
```

Then in JS it deduplicates member IDs per gym by filtering in memory.

**Cost model:** At 50 gyms × 300 members avg = 15,000 collectionGroup reads + 15,000 authProfile reads + 50 gym reads = **30,050 reads per admin dashboard page load.** Firestore charges per document read regardless of field projection.

**Root cause:** The gym doc already has a `memberCount` field (denormalized by Cloud Functions on membership activation). This field is available but not used here.

**Status 2026-06-28:** Implemented. `getGymWorkspaces` now reads only the `gyms` collection and `getGymDetail` uses the mapped gym doc instead of fetching member documents for counts.

---

## Section C — Read-Model Double-Reads (Fallback Pattern)

**Files:** `read-models/notifications.ts`, `read-models/progress.ts`, `read-models/gyms.ts`, etc.

The standard pattern throughout:
```ts
const scoped = await gymCollection(db, gymId, "collection").get();
const snapshot = scoped.empty
  ? await db.collection(rootPath).get()   // ← second read when scoped is empty
  : scoped;
```

For a gym that has all data in gym-scoped collections (after R4 completes), this still pays for 1 read on the gym-scoped collection before confirming it's non-empty. That's correct behavior. However, for **member-level queries** that use unscoped collectionGroup (see Section D), the fallback to root adds unnecessary cost.

**Action:** Once R4 is complete for all collections, add a Firestore comment or migration marker confirming no root data exists, then remove the fallback branches collection by collection. No risk in doing this per-collection after confirming read-model data is 100% gym-scoped.

---

## Section D — Unscoped CollectionGroup Queries (Scale With Gym Count)

**Files:** `read-models/notifications.ts`, `read-models/progress.ts`

Three patterns that scan across ALL gyms:

**`getMemberNotifications(memberId)`** — `db.collectionGroup("notifications").where("recipientId","==",memberId)`. At 100 gyms × 500 notifications/gym = 50,000 notification documents scanned to find 50 for one member.

**`getAdminNotifications()`** — `db.collectionGroup("notifications").where("recipientRole","==","admin")`. Scans all gyms' notification subcollections. Should be scoped to `PRIMARY_GYM_ID` with a direct gym-scoped query since admin only has one gym context.

**`getBodyMetricLogsForMember(memberId)`** — `db.collectionGroup("bodyMetricLogs").where("memberId","==",memberId)`. Since a member belongs to one gym, this should be `gymCollection(db, member.gymId, "bodyMetricLogs").where("memberId","==",memberId)`. Same for `getDayLogsForMember`, `getLiftLogsForMember`, etc.

**Fix:** Member ID is always available alongside gym ID at the call site (member profile contains `defaultGymId`). Pass gymId explicitly to all progress read-model functions and switch from collectionGroup to `gymCollection(db, gymId, collection)`. Requires a composite index on `(memberId, loggedAt)` per collection — these likely already exist.

---

## Section E — `getGymFloorLoadMap`: Uncached N+1 Fan-Out

**File:** `src/lib/firebase/read-models/gyms.ts:234`

```ts
const [{ assignments }, { members }, { programs }, { exercises }] = await Promise.all([
  getActiveProgramAssignments(gymId),   // 1-2 Firestore reads
  getMembersUncached(gymId),            // full member collection read (NOT cached)
  getWorkoutProgramsUncached(gymId),    // full programs read (NOT cached)
  getExerciseCatalogUncached(gymId)     // full catalog read (NOT cached)
]);
// Then: another authProfiles scan for slot data
const snapshot = await db.collection("authProfiles").where("defaultGymId","==",gymId).select(...).get();
```

5 Firestore queries, 4 of which are `*Uncached` variants that bypass Next.js cache. Each call reads the full collection. For a gym with 200 members, 50 programs, and 66 exercises this is ~316 document reads per floor map load.

**Fix:** Switch `getMembersUncached` → `getMembers`, cache the floor map server-side with a `cache()` wrapper and a `["floor-map", gymId]` tag, invalidate on membership or program changes.

---

## Section F — Notification Fan-Out (Sequential Writes, No Batching)

**Pattern** throughout `actions/programs.ts`, `actions/pt.ts`, etc.:

```ts
await mirrorGymScopedRecord(db, gymId, "notifications", n1Id, n1Record);
await mirrorGymScopedRecord(db, gymId, "notifications", n2Id, n2Record);
```

Each `mirrorGymScopedRecord` call does 2 writes (root + gym-scoped during transition, will be 1 write after R4 completes). For a PT session booking that generates 3 notifications (owner, member, trainer), this is 6 writes in 3 sequential await chains — each one is a round-trip to Firestore.

**Fix:** Introduce a `batchMirrorGymScopedRecords(db, gymId, collection, records[])` helper in `actions/shared.ts` that uses a single Firestore `batch()` for all notification writes. Reduces N notifications from N round-trips to 1 batch commit.

**B2B2C consideration:** When a gym does a broadcast (e.g. holiday closure notice), the current model requires writing 1 notification document per member. At 500 members, that's 500 writes per broadcast. At scale, this should move to a fan-out-on-read pattern: store 1 broadcast document on the gym, members query for unread broadcasts at login.

---

## Section G — FCM Token Fan-Out

**File:** `src/lib/firebase/actions/shared.ts` (FCM push in `sendPushNotification`)

Based on prior observations (obs 154): FCM push sends to individual tokens stored on user profiles. A gym-wide broadcast requires:
1. Read all member profiles for the gym (to get FCM tokens)
2. Call FCM send-all for each valid token

At 500 members per gym this is 500 reads + 1 FCM call. Currently this is only done for individual event notifications, not broadcasts. No batching concern at today's scale (SHG), but any future "all-gym" notification feature must use FCM Topic subscriptions (`/topics/gym-{gymId}`) rather than individual token enumeration.

**Fix (future-facing):** On member FCM token registration (`fcm-setup.tsx`), subscribe to `/topics/gym-{gymId}` in addition to storing the token on the profile. Gym-wide notifications send to the topic instead of enumerating tokens. Zero reads required.

---

## Section H — `clearUserNotifications`: N Sequential Deletes

**File:** `src/lib/firebase/actions/notifications.ts`

Clearing all notifications for a user currently deletes each document individually (N deletes = N round-trips). For a member with 50 notifications this is 50 sequential Firestore deletes.

**Fix:** Use a Firestore batch delete. Query notification docs, collect refs, `batch.delete(ref)` each, commit once. Reduces N round-trips to 1 batch commit.

---

## Section I — Auth Lookup Chain (Cost on Every Page Load)

**File:** `src/lib/auth.ts` — `requireRole()` / `getCurrentUser()`

The auth lookup path per SSR request:
1. Read `fitsplit-session` cookie
2. Firebase Admin `verifySessionCookie()` — network call to Firebase Auth (cached per process in SDK)
3. Read `authProfiles/{uid}` — Firestore read for role/gymId/memberId

Every SSR page load that calls `requireRole()` pays 1 Firestore read for the auth profile. Next.js `cache()` deduplicates within a single request but not across requests.

**Mitigation already in place:** The session cookie payload embeds `role`, `gymId`, `memberId` as secondary cookies. `requireRole` can be rewritten to trust the signed cookie payload for role/gymId and skip the Firestore read on 90%+ of requests — only re-fetching if `mustChangePassword` or `isActive` needs to be checked live.

**Fix:** Embed `isActive`, `mustChangePassword`, and `gymId` in the session cookie on login. `requireRole()` reads from cookie claims instead of Firestore. Add a `forceRefresh` path for the rare cases (password change, account suspension) where freshness matters. Estimated **1 read saved per SSR page load** — at 1000 page loads/day this is 30,000 reads/month saved.

---

## Section J — `getGymDetail` Member Count Fan-Out

**File:** `src/lib/firebase/read-models/gyms.ts:84`

Every call to `getGymDetail(gymId)` fetches ALL member documents twice (gym-scoped members + root authProfiles filtered by gymId) just to count them:

```ts
const [scopedMembers, rootMembers] = await Promise.all([
  gymCollection(db, doc.id, "members").get(),
  db.collection("authProfiles").where("role","==","member").where("defaultGymId","==",doc.id).get()
]);
const memberIds = new Set([...scopedMembers.docs, ...rootMembers.docs].map(doc => doc.id));
```

For a gym with 300 members this is 600 reads to get a single count.

**Fix:** Read `doc.data().memberCount` from the gym doc. The field is maintained by Cloud Functions (membership activation/deactivation) and by `gyms.ts` billing actions. Zero additional reads required.

---

## Section K — Offline Sync Conflict Gap

**File:** `src/lib/firebase/actions/progress.ts:108` — `syncOfflineLifts`

Two problems:
1. **No gym-scoped mirror**: batch writes only to root `liftLogs`. Inconsistent with `logLiftSet` which mirrors to both.
2. **No conflict detection**: if the same `sessionId` is used across offline sync calls (network blip mid-sync), records are silently overwritten. The `randomUUID()` call inside the batch loop generates a _new_ `liftLogId` per sync call, not a deterministic ID from the offline record — so the same offline log could be written twice as two separate root documents.

**Status 2026-06-28:** Implemented. The sync path now builds stable doc IDs from the offline/client ID when present, falling back to a deterministic composite, and writes directly to `gyms/{gymId}/liftLogs` in the same WriteBatch.

---

## Section L — B2B2C Data Model Gaps

### L1. Single-gym member model
`authProfiles/{uid}.defaultGymId` is a single string — one member, one gym. The B2B2C model (FitSplit sells to gyms; gyms serve members) works fine today, but common gym-chain patterns (shared membership across branches, day-pass visitors) have no data model. If a gym chain wants multiple branches, members need to be reachable from each branch.

**Recommendation:** Add `gymIds: string[]` alongside `defaultGymId` to support multi-gym membership without breaking existing queries. Single-gym remains the default; multi-gym is additive.

### L2. No platform-level billing (gym subscriptions)
The billing system handles member packages/memberships. There is no Firestore schema for FitSplit charging gyms for platform access. The `gyms/{gymId}` document has no subscription tier, billing cycle, or payment method. Onboarding a new gym is a manual admin operation.

**Recommendation:** Add `subscription: { tier: "free"|"starter"|"pro", billedUntil: Timestamp, stripeCustomerId: string }` to the gym doc. Free tier exists already (SHG is essentially free). This enables automated gym onboarding when B2B sales start.

### L3. No tenant resource limits
There are no per-gym limits on member count, storage, API write rate, or notification volume. A single misbehaving gym (or a large gym that outgrows expectations) could spike Firestore costs with no circuit breaker.

**Recommendation:** Add `limits: { maxMembers: number, maxStorageMb: number }` to the gym doc. Enforce in `createMemberProfile` (check member count vs limit). Cloud Functions enforce storage limit on logo upload.

### L4. No multi-region strategy
Firebase project `fitsplit-29215` is deployed to `us-central1` (App Hosting) with functions in `asia-south1`. Firestore is single-region. For an India-first B2B product, Firestore should be in `asia-south1` (Mumbai). Currently all Firestore reads from the App Hosting region (`us-central1`) cross the Atlantic to reach the database.

**Recommendation:** Migrate Firestore to a multi-region bucket (`nam5` for US, or `asia1` for Asia-Pacific) or accept `asia-south1` single-region latency parity if App Hosting moves there too. Check that Firebase App Hosting supports `asia-south1` before migrating.

---

## Section M — Composite Index Coverage

Based on query patterns found in read-models, the following composite indexes must exist (check `firestore.indexes.json`):

| Collection | Fields | Used by |
|---|---|---|
| `notifications` (gym-scoped) | `recipientRole`, `createdAt DESC` | `getOwnerNotifications` |
| `notifications` (gym-scoped) | `recipientId`, `createdAt DESC` | `getMemberNotifications` |
| `contactMessages` (gym-scoped) | `status` | `getUnreadContactMessageCount` |
| `liftLogs` (gym-scoped) | `memberId`, `loggedAt DESC` | progress queries |
| `bodyMetricLogs` (gym-scoped) | `memberId`, `loggedAt DESC` | `getBodyMetricLogsForMember` |
| `dayLogs` (gym-scoped) | `memberId` | `getDayLogsForMember` |
| `attendanceRecords` (gym-scoped) | `memberId`, `checkInAt DESC` | attendance history |
| `authProfiles` | `role`, `defaultGymId` | `getGymDetail`, `getGymFloorLoadMap` |

Missing any of these causes Firestore to reject the query at runtime with a link to create the index. Add all to `firestore.indexes.json` proactively.

---

## Recommended Action Plan

Ranked by cost impact × implementation effort:

### Sprint 1 — High impact, low effort (1–2 days)

**P1.1 — R4 for progress.ts** — Done 2026-06-28  
Remove root writes from `logLiftSet`, `logBodyWeight`, `logDayStatus`, `saveMacroLog`, `logActivity`, `startWorkoutSession`, `endWorkoutSession`, `updateMakeupStatus`. Fix `syncOfflineLifts` to mirror and use deterministic IDs. **Saves ~50% of all write costs.**

**P1.2 — `getGymWorkspaces` and `getGymDetail` use `memberCount`** — Done 2026-06-28  
Replace the 3-collection scan in `getGymWorkspaces` with `gymSnapshot.docs.map(d => ({ ...mapWorkspace(d.id, d.data()), memberCount: d.data().memberCount ?? 0 }))`. Same for `getGymDetail`. **Saves 30K+ reads per admin page load at scale.**

**P1.3 — Fix `syncOfflineLifts` gym-scoped mirror** — Done 2026-06-28  
Add `mirrorGymScopedRecord` or use deterministic IDs. Correctness fix, not just cost.

### Sprint 2 — Medium impact, medium effort (3–5 days)

**P2.1 — Scope progress read-models to gymId**  
Pass `gymId` from member profile to all progress read functions; switch from `collectionGroup` to `gymCollection`. Add composite indexes. Reduces read cost proportional to gym count.

**P2.2 — Batch notification writes**  
Add `batchMirrorGymScopedRecords` helper. Update all multi-notification paths in `programs.ts`, `pt.ts`. Reduces write latency.

**P2.3 — Batch `clearUserNotifications`**  
Switch from sequential deletes to a single Firestore batch.

**P2.4 — Auth profile caching in session cookie**  
Embed `isActive`, `gymId`, `memberId` in session cookie claims. `requireRole()` reads cookie claims instead of Firestore on 90% of requests.

### Sprint 3 — B2B2C foundations (1–2 weeks)

**P3.1 — Add gym subscription schema**  
`subscription.tier`, `subscription.billedUntil` on gym doc. Enforce in `createMemberProfile`.

**P3.2 — FCM topic subscription**  
On FCM token registration, subscribe to `/topics/gym-{gymId}`. Future broadcasts use topic, not token enumeration.

**P3.3 — Per-gym resource limits**  
`limits.maxMembers` on gym doc. Enforce in member creation.

**P3.4 — Remove read-model fallbacks**  
Once all collections confirmed gym-scoped only, delete the root-collection fallback branches in read-models. Reduces code complexity and eliminates accidental double-reads.

**P3.5 — `getGymFloorLoadMap` caching**  
Cache with gym-scoped tag, use cached member/program reads instead of uncached variants.

### Sprint 4 — Long-term architecture (future quarter)

**P4.1 — Multi-gym member model** (`gymIds: string[]` on authProfile)

**P4.2 — Firestore region alignment** (evaluate `asia-south1` for both App Hosting and Firestore)

**P4.3 — Broadcast notification model** (fan-out on read for gym-wide messages)

**P4.4 — Firestore indexes audit** (generate `firestore.indexes.json` from all query patterns above)

---

## Current Estimated Monthly Cost (SHG Pilot, ~50 Active Members)

| Operation | Volume/month | Reads | Writes | Cost |
|---|---|---|---|---|
| Lift logging (30 sets/session, 15 sessions/month) | 22,500 ops | 0 | 45,000 (dual) | $0.081 |
| Admin dashboard (10 loads/day) | 300 loads | 45,000 scan | 0 | $0.027 |
| Member page SSR auth reads | 1,500 req/day | 45,000 | 0 | $0.027 |
| Notifications (20 events/day) | 600 events | 1,200 | 1,200 | $0.003 |
| **Total (approx)** | | | | **~$0.15/mo** |

At B2B2C scale with 100 gyms × 300 members (30K total) with same patterns:
| Same operations at scale | **~$90/mo** |

After applying P1.1 + P1.2 + P2.4: estimated reduction to **~$25/mo** at the same scale.

---

*Generated 2026-06-28. Sprint 1 easy wins implemented 2026-06-28; keep this audit current as the remaining backlog is completed.*
