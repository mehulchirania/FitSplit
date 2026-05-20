# FitSplit

FitSplit is a high-fidelity, Firebase-backed gym operations and AI-assisted semi-personal trainer platform. Built to scale, it serves gym workspaces such as Sri Shakthi Hanuman Gym (SHG Gym), Titan Fitness Club, and test environments with robust multi-gym isolation, offline-resilient logging, and deep operational insights.

---

## ⚡ Tech Stack & Architecture

FitSplit leverages a modern, server-centric, high-performance stack:
*   **Framework**: Next.js (App Router, React 19, TypeScript)
*   **Database & Auth**: Cloud Firestore, Firebase Authentication (email/password and 4-digit PIN resolution), and Firebase Storage.
*   **Server Controls**: Next.js Server Actions with strict Firebase Admin role session verification (2-hour secure cookie limits).
*   **AI Engine**: Official `@google/genai` integration with Gemini Flash (`gemini-flash-latest`).
*   **PWA Core**: Native manifest, custom service worker, responsive bottom navigation, and offline-resilient local state management.

---

## ✨ Premium Features & Capabilities

### 🧠 AI Semi-Personal Trainer
*   **Gemini-Powered Smart Swaps**: Members can log sudden injuries or pain points to dynamically request substitute movements. Gemini evaluates the exercise catalog, matches biomechanical requirements, and returns structured alternatives in real-time, falling back gracefully to robust client-side muscle-group heuristics if needed.
*   **Macro Nutrition Coach**: Trainers can prescribe precise daily targets (Calories, Protein, Carbs, Fats, Water Liters, and Custom Advice) directly to member profiles. Members track their daily progress using a glassmorphic dashboard with quick incremental logging (+25g protein, +0.5L water) backed by offline-resilient `localStorage` synchronization.

### 📊 Training Operations Command Center
*   **Gym Floor Traffic Heatmap**: Full-width interactive heatmap displaying real-time member occupancy and equipment stress. The algorithm processes program assignments and preferred member slots to categorize traffic (Quiet 🟢, Moderate 🟡, Crowded 🔴), charts the Top 5 congested exercises in the slot, and offers operational coaching advice to balance the gym floor load.
*   **Geofenced GPS Check-ins**: Members check in to start their workouts using verified GPS boundaries (gym latitude, longitude, and custom radius constraints), creating high-fidelity geofence and attendance logs in Firestore.

### 💼 Workspace Management
*   **Multi-Gym Data Isolation**: Secure multi-tenancy bounds where all reads and mutations (members, custom program builders, catalog requests) are partitioned by the authenticated user's `gymId`.
*   **Roster & Program Builder**: Multi-day custom workout routines supporting exercise lookup, specific set/reps guidelines, catalog requests for new custom equipment, and instant administrative review.
*   **Unified Admin Inbox**: Admin command center displaying landing page contact messages, gym workspace locks, and catalog additions.

---

## 🔑 Demo Login Credentials

### Staff & Admin Logins
Choose the **Staff** login tab for these accounts:

| Role | Username / Email | Password |
|---|---|---|
| Admin | `admin` | `password` |
| Owner (SHG) | `santosh-shg` | `password` |
| Trainer (SHG) | `shg-trainer-1` | `password` |
| Trainer (SHG) | `shg-trainer-2` | `password` |
| Owner (Titan) | `titan-owner-1` | `password` |
| Owner (Dummy) | `dummy-gym-owner-1` | `password` |

### Member Logins
Choose the **Member** login tab (uses 4-digit PINs):

| Mobile / Email | PIN | Registered Name |
|---|---|---|
| `mehulchirania` | `1234` | Mehul Chirania |
| `9688227039` | `1234` | Mobile Account |
| `mehul@example.com` | `1234` | Email Account |
| `aarav@example.com` | `1234` | Aarav |

---

## 🛠️ Local Setup & Development

### 1. Installation & Environment Configuration
Clone the repository and install packages:
```bash
npm install
```

Copy your configuration file `.env.example` to `.env.local` and populate the required Firebase web and admin keys:
```env
# Client Firebase Keys
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fitsplit-29215.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fitsplit-29215
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fitsplit-29215.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=766523780087
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server Firebase Admin Credentials
FIREBASE_PROJECT_ID=fitsplit-29215
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Gemini AI Key
GEMINI_API_KEY=
```

### 2. Run the Development Server
```bash
npm run dev
```

### 3. Verify Code Quality & Build Stability
Run static typing diagnostics and verify production bundling:
```bash
npm run typecheck
npm run build
```

---

## 🚀 Seeding & Maintenance Scripts

Clean and seed database collections when working locally:

```bash
npm run seed:auth             # Create and update Firebase Auth demo accounts
npm run seed:demo             # Refresh Firestore with gyms, members, programs, and mock logs
npm run fix:exercises         # Canonical Title Case cleanup, re-categorize WGER fields, and map videos
npm run patch:videos          # Backfill catalog video URLs from static workout models
npm run backfill:member-access # Repairs missing member usernames and creates missing auth profiles
```

---

## 📂 Key Architecture Map

*   `lib/auth.ts`: Auth guards, server-side session cookies, and login credential resolution.
*   `lib/firebase/actions.ts`: Firestore mutations, custom program updates, and member onboarding.
*   `lib/firebase/read-models.ts`: Reactive query layers, mock fallbacks, and occupancy aggregations.
*   `components/member-workout-console.tsx`: Core member screen displaying workouts, GPS checks, and swaps.
*   `components/macro-progress-panel.tsx`: High-end glassmorphic progressive nutrient logging dashboard.
*   `components/gym-floor-load-map.tsx`: Interactive gym operations equipment congestion heatmap.
*   `firestore.rules`: Security access rules enforcing role and gym-based boundaries.

---

## 📝 Maintenance & Handoff

For comprehensive historical dated updates, architectural logs, or next milestones, please refer directly to **`PROJECT_HANDOFF.md`**.
This project is jointly developed by **Claude** and **Codex**. Please ensure the handoff log is updated after implementing changes.
