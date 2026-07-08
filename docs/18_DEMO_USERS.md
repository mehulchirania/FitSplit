# 18 · Demo Users & E2E Test Accounts

`Generated: 2026-07-06 · Source: scripts/seed-demo-gyms.mjs live run against fitsplit-29215`

Every demo login on the live Firebase project, grouped by gym, with the E2E
scenario each account is designed to exercise. Seeded by
`npm run seed:demo-gyms` (idempotent — safe to re-run; deterministic doc IDs,
merge writes).

**Login conventions**

- **Members** sign in with their **username** (or phone/email) + **4-digit PIN**.
  The underlying Firebase Auth account is `{memberId}@members.fitsplit.app`
  with password `pin-{PIN}`.
- **Staff** (admin/owner/trainer) sign in with username + password `password`.
  Seeded demo staff have `mustChangePassword: false` so E2E login is frictionless.
- Login lockout: 5 failed attempts → 15 min. Use the exact PINs below.

---

## Platform admin

| Role | Name | ID / username | Password | E2E scenarios |
|---|---|---|---|---|
| admin | FitSplit Admin | `admin-fitsplit` / `admin` | `password` | Cross-gym admin dashboard, gym provisioning, platform summaries, admin inbox |

---

## Gym 1 — Sri Shakthi Hanuman Gym (`shg`) · pilot gym

### Staff

| Role | Name | ID / username | Password | E2E scenarios |
|---|---|---|---|---|
| owner | Santosh SHG | `santosh-shg` | *(unchanged — live pilot credentials, not managed by seed)* | Owner workspace, billing approvals, member management, reports |
| trainer | Ravi Kumar | `shg-trainer-1` | `password` | Trainer views, PT session management |
| trainer | Priya Nair | `shg-trainer-2` | `password` | Trainer views, member visibility rules |

### Members (20)

shg was already at 20 members before the multi-gym seed, so the seed **did not
create or modify any shg member**. Login capability varies by origin:

- `member-aarav` / `member-meera` / `member-kabir` / `member-nisha` — Firebase Auth users exist (`seed:auth`), **PIN `1234`**, username = their email below.
- `member-mehul` — developer's demo member, username `mehulchirania`, PIN `1234`. **Never modified by seeds.**
- The three UUID-id members (Prakhar, Harsh Chirania, Brownie) — created through the real app signup; PINs are whatever was set at signup (not recorded here).
- The twelve `shg-m-*` members — **Firestore-only demo data** from `seed-shg-full.mjs`; they have **no Firebase Auth user and cannot log in**. They exist to populate owner-side lists, charts, billing queues, and notifications.

| Name | Member ID | Username | Phone | PIN | Membership state | Program | E2E scenarios |
|---|---|---|---|---|---|---|---|
| Mehul Chirania | `member-mehul` | `mehulchirania` | +91 9688227039 | 1234 | active (Monthly) | `split_04` | Developer's own member account — full member flows |
| Aarav Sharma | `member-aarav` | `aarav@example.com` | +91 98765 43210 | 1234 | — | `split_02` | Core member flows: login, workout logging, progress charts |
| Meera Iyer | `member-meera` | `meera@example.com` | +91 98765 42109 | 1234 | — | `split_01` | Member with expiring-membership history (see memberships) |
| Kabir Khan | `member-kabir` | `kabir@example.com` | +91 98765 41098 | 1234 | — | `split_01` | Member with expired-membership history |
| Nisha Rao | `member-nisha` | `nisha@example.com` | +91 98765 40987 | 1234 | — | `split_02` | Beginner member, long membership |
| Prakhar | `28a39163-…fb57` | `pj@abc.com` | — | *(self-set)* | no membership | — | Real signup account; package purchase flow |
| Harsh Chirania | `90d91255-…5a72` | `abc@example.com` | 9876543210 | *(self-set)* | no membership | `split_04` | Real signup account |
| Brownie | `d4d5ef1b-…6f88` | `brownie` | 9591975658 | *(self-set)* | no membership | `split_01` | Real signup account |
| Arjun Venkat | `shg-m-arjun` | *(no login)* | +91 94400 11001 | — | active (Quarterly) | `split_02` | Owner-side: 8-week lift history, progress charts |
| Divya Krishnamurthy | `shg-m-divya` | *(no login)* | +91 94400 11002 | — | active (Annual) | `split_01` | Owner-side: cardio/toning member with history |
| Surya Prakash | `shg-m-surya` | *(no login)* | +91 94400 11003 | — | expiring soon (PT Monthly) | `split_02` | Owner-side: PT member, completed + scheduled PT sessions |
| Lakshmi Anand | `shg-m-lakshmi` | *(no login)* | +91 94400 11004 | — | active (Quarterly) | `split_01` | Owner-side: standard active member |
| Murugan Selvam | `shg-m-murugan` | *(no login)* | +91 94400 11005 | — | expiring soon (Annual) | `split_03` | Owner-side: PT member expiring soon — renewal + PT queue |
| Preethi Suresh | `shg-m-preethi` | *(no login)* | +91 94400 11006 | — | expiring soon (Monthly) | `split_01` | Owner-side: expiry warning list |
| Ganesan Pillai | `shg-m-ganesan` | *(no login)* | +91 94400 11007 | — | expired (Quarterly) | `split_02` | Owner-side: expired member with old history |
| Kavitha Rajan | `shg-m-kavitha` | *(no login)* | +91 94400 11008 | — | expired (Monthly) | `split_01` | Owner-side: expired member |
| Balaji Natarajan | `shg-m-balaji` | *(no login)* | +91 94400 11009 | — | active (Monthly) | — | Owner-side: no-plan member + pending payment request |
| Sathya Narayanan | `shg-m-sathya` | *(no login)* | +91 94400 11010 | — | active (Quarterly) | — | Owner-side: no-plan member + pending payment request |
| Radhakrishnan Iyer | `shg-m-radha` | *(no login)* | +91 94400 11011 | — | no membership | — | Owner-side: walk-in without membership, pending payment |
| Prema Devi | `shg-m-prema` | *(no login)* | +91 94400 11012 | — | no membership | — | Owner-side: brand-new walk-in, empty states |

---

## Gym 2 — IronCore Fitness (`ironcore-blr`) · Bengaluru

### Staff

| Role | Name | ID / username | Password | E2E scenarios |
|---|---|---|---|---|
| owner | Arvind Rajagopal | `ironcore-owner-1` | `password` | Full owner workspace on a non-pilot gym; tenant isolation vs shg |
| trainer | Meghana Suresh | `ironcore-trainer-1` | `password` | Trainer role on second gym; PT sessions for m-05 / m-15 |

### Members (20)

All 20 have Firebase Auth users. Username = member ID. Auth email = `{memberId}@members.fitsplit.app`, password = `pin-{PIN}`.

| Name | Member ID / username | Phone | PIN | Membership state | Program | E2E scenarios |
|---|---|---|---|---|---|---|
| Vikram Rao | `ironcore-blr-m-00` | +91 9800024740 | 1747 | active (Annual) | `split_01` | Core member flows: login, workout logging, progress charts |
| Yamini Iyengar | `ironcore-blr-m-01` | +91 9800025977 | 1784 | active (Monthly) | `split_02` | Core member flows |
| Zoya Chowdary | `ironcore-blr-m-02` | +91 9800027214 | 1821 | active (Quarterly) | `split_03` | Core member flows |
| Anand Achari | `ironcore-blr-m-03` | +91 9800028451 | 1858 | active (Annual) | `split_04` | Core member flows |
| Aditya Pillai | `ironcore-blr-m-04` | +91 9800029688 | 1895 | active (Monthly) | `split_01` | Core member flows |
| Bhavana Reddy | `ironcore-blr-m-05` | +91 9800030925 | 1932 | active (PT Monthly) | `split_02` | **PT member** — booking, completed + scheduled sessions |
| Chetan Sharma | `ironcore-blr-m-06` | +91 9800032162 | 1969 | active (Annual) | `split_03` | Core member flows |
| Deepika Gowda | `ironcore-blr-m-07` | +91 9800033399 | 2006 | expiring soon (Quarterly) | `split_04` | **Expiry warning banner, renewal flow** |
| Eshwar Verma | `ironcore-blr-m-08` | +91 9800034636 | 2043 | active (Quarterly) | `split_01` | Core member flows |
| Farida Shetty | `ironcore-blr-m-09` | +91 9800035873 | 2080 | expired (Quarterly) | `split_02` | **Expired-membership UX, renewal + reactivation** |
| Gowtham Devi | `ironcore-blr-m-10` | +91 9800037110 | 2117 | active (Monthly) | `split_03` | Core member flows |
| Harini Naidu | `ironcore-blr-m-11` | +91 9800038347 | 2154 | active (Quarterly) | — | **No plan** — program assignment flow + pending payment request |
| Imran Menon | `ironcore-blr-m-12` | +91 9800039584 | 2191 | active (Annual) | `split_01` | Core member flows |
| Jyothi Prasad | `ironcore-blr-m-13` | +91 9800040821 | 2228 | no membership | — | **Package purchase + payment request flow** (pending request seeded) |
| Karthik Bhat | `ironcore-blr-m-14` | +91 9800042058 | 2265 | active (Quarterly) | `split_03` | Core member flows |
| Lavanya Kumar | `ironcore-blr-m-15` | +91 9800043295 | 2302 | active (PT Monthly) | `split_04` | **PT member** — second PT thread for trainer |
| Manoj Rao | `ironcore-blr-m-16` | +91 9800044532 | 2339 | active (Monthly) | `split_01` | Core member flows |
| Nithya Iyengar | `ironcore-blr-m-17` | +91 9800045769 | 2376 | expiring soon (Quarterly) | `split_02` | Expiry warning flow |
| Om Chowdary | `ironcore-blr-m-18` | +91 9800047006 | 2413 | expired (Monthly) | `split_03` | Expired-membership UX |
| Pallavi Achari | `ironcore-blr-m-19` | +91 9800048243 | 2450 | no membership | — | Walk-in without membership (pending payment request seeded) |

---

## Gym 3 — Pulse Fitness Studio (`pulse-hyd`) · Hyderabad

### Staff

| Role | Name | ID / username | Password | E2E scenarios |
|---|---|---|---|---|
| owner | Rehana Fatima | `pulse-owner-1` | `password` | Third-gym owner workspace; multi-gym admin listing |
| trainer | Sandeep Kaushik | `pulse-trainer-1` | `password` | Trainer role; PT sessions for m-05 / m-15 |

### Members (20)

All 20 have Firebase Auth users. Username = member ID. Auth email = `{memberId}@members.fitsplit.app`, password = `pin-{PIN}`.

| Name | Member ID / username | Phone | PIN | Membership state | Program | E2E scenarios |
|---|---|---|---|---|---|---|
| Rakesh Pillai | `pulse-hyd-m-00` | +91 9800049480 | 2487 | active (Quarterly) | `split_01` | Core member flows: login, workout logging, progress charts |
| Sneha Reddy | `pulse-hyd-m-01` | +91 9800050717 | 2524 | active (Annual) | `split_02` | Core member flows |
| Tarun Sharma | `pulse-hyd-m-02` | +91 9800051954 | 2561 | active (Monthly) | `split_03` | Core member flows |
| Uma Gowda | `pulse-hyd-m-03` | +91 9800053191 | 2598 | active (Quarterly) | `split_04` | Core member flows |
| Vikram Verma | `pulse-hyd-m-04` | +91 9800054428 | 2635 | active (Annual) | `split_01` | Core member flows |
| Yamini Shetty | `pulse-hyd-m-05` | +91 9800055665 | 2672 | active (PT Monthly) | `split_02` | **PT member** — booking + session flows |
| Zoya Devi | `pulse-hyd-m-06` | +91 9800056902 | 2709 | active (Quarterly) | `split_03` | Core member flows |
| Anand Naidu | `pulse-hyd-m-07` | +91 9800058139 | 2746 | expiring soon (Quarterly) | `split_04` | **Expiry warning banner, renewal flow** |
| Aditya Menon | `pulse-hyd-m-08` | +91 9800059376 | 2783 | active (Monthly) | `split_01` | Core member flows |
| Bhavana Prasad | `pulse-hyd-m-09` | +91 9800060613 | 2820 | expired (Quarterly) | `split_02` | **Expired-membership UX, renewal + reactivation** |
| Chetan Bhat | `pulse-hyd-m-10` | +91 9800061850 | 2857 | active (Annual) | `split_03` | Core member flows |
| Deepika Kumar | `pulse-hyd-m-11` | +91 9800063087 | 2894 | active (Quarterly) | — | **No plan** — program assignment flow + pending payment request |
| Eshwar Rao | `pulse-hyd-m-12` | +91 9800064324 | 2931 | active (Quarterly) | `split_01` | Core member flows |
| Farida Iyengar | `pulse-hyd-m-13` | +91 9800065561 | 2968 | no membership | — | **Package purchase + payment request flow** (pending request seeded) |
| Gowtham Chowdary | `pulse-hyd-m-14` | +91 9800066798 | 3005 | active (Monthly) | `split_03` | Core member flows |
| Harini Achari | `pulse-hyd-m-15` | +91 9800068035 | 3042 | active (PT Monthly) | `split_04` | **PT member** — second PT thread for trainer |
| Imran Pillai | `pulse-hyd-m-16` | +91 9800069272 | 3079 | active (Annual) | `split_01` | Core member flows |
| Jyothi Reddy | `pulse-hyd-m-17` | +91 9800070509 | 3116 | expiring soon (Quarterly) | `split_02` | Expiry warning flow |
| Karthik Sharma | `pulse-hyd-m-18` | +91 9800071746 | 3153 | expired (Monthly) | `split_03` | Expired-membership UX |
| Lavanya Gowda | `pulse-hyd-m-19` | +91 9800072983 | 3190 | no membership | — | Walk-in without membership (pending payment request seeded) |

---

## What was seeded per new gym

Beyond the accounts above, `seed-demo-gyms.mjs` wrote for each of the two new gyms:

- Gym doc (`gyms/{gymId}`) with owner, location, `expiryWarningDays: 7`, `memberCount: 20`.
- 3 packages: Monthly ₹1,500 · Quarterly ₹4,000 · PT Monthly ₹4,000.
- The predefined `split_01`–`split_04` program catalog copied into `gyms/{gymId}/workoutPrograms` (re-scoped `gymId`/`createdBy`).
- Program assignments (round-robin across the 4 splits, varied assignment dates).
- 1–6 weeks of training history per active member (volume varies by member): lift logs with progressive overload, day logs (`{memberId}_{dayId}_{weekStart}`), attendance records + workout sessions (`{memberId}_{yyyy-mm-dd}`), macro logs (`{memberId}_{date}`), body-metric logs, activity logs.
- Payment requests: 3 pending (m-11, m-13, m-19) + 3 approved historical.
- PT sessions: 4 completed + 1 scheduled for each PT member (m-05, m-15).
- Owner notifications: expiring/expired/no-plan/payment-request alerts.
- `usernames/` and `phones/` registry docs for every account.

Re-run any time with `npm run seed:demo-gyms` — all writes are idempotent merges keyed by deterministic IDs.
