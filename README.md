# FitSplit

FitSplit is a free workout app. Sign up, pick a proven plan, and log every set. There are no gyms, no trainers, no admin roles and no billing: one kind of account, everything free.

## What it does

- **Accounts**: email + password signup, login, logout, password reset, profile (name, body metrics, photo), data export and account deletion.
- **Workouts**: a built-in library of workout splits, a searchable exercise library, per-set logging that works offline, exercise swaps, day completion/skips.
- **Progress**: lift charts, estimated 1RM, consistency calendar, body-weight log, macro and meal tracking.

## Stack

Next.js 16 (App Router, React 19, TypeScript) with Server Actions, Firebase (Auth + Firestore + Storage via the Admin SDK), Dexie for offline logging, Recharts, Radix UI, Zod, Vitest, Playwright. Shared, framework-free code lives in `packages/core` (`@fitsplit/core`).

`mobile/` is an Expo app from the earlier gym product. It is not part of the root build or typecheck and has not been migrated to this simplified model.

## Where things live

| Thing | Location |
|---|---|
| Routes | `src/app` (`/` landing, `/signup`, `/member/*` workout app, `/profile`, legal pages) |
| Built-in exercise library + workout templates | `src/lib/exercise-library.ts` (data in `src/lib/workouts.json` and `packages/core/src/split-library*.{ts,json}`) |
| Auth (signup, login, session, password) | `src/lib/auth.ts`, route protection in `src/proxy.ts` |
| Data reads / writes | `src/lib/firebase/read-models/*`, `src/lib/firebase/actions/*` |
| Firestore layout | `users/{uid}` and `users/{uid}/{liftLogs,dayLogs,bodyMetricLogs,macroLogs,mealLogs,activityLogs,programAssignments,exerciseSwaps}` (see `src/lib/firebase/collections.ts`) |
| Security rules | `firestore.rules`, `storage.rules` (clients never write directly; all writes go through server actions) |

## Running locally

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Three ways to run:

1. **No Firebase at all.** Set `FITSPLIT_LOCAL_MODE=true`. Any email/password signs in as a throwaway local account; the library and plans work, nothing is persisted. Ignored when `NODE_ENV=production`.
2. **Firebase emulators.** Copy `.env.emulator` into `.env.local`, then `firebase emulators:start` and `npm run dev`.
3. **A real Firebase project.** Fill in the `NEXT_PUBLIC_FIREBASE_*` values, `FIREBASE_PROJECT_ID` and credentials (`GOOGLE_APPLICATION_CREDENTIALS`, or `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`). `NEXT_PUBLIC_FIREBASE_API_KEY` is required for email/password sign-in.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:rules` | Firestore rules tests (needs the Firestore emulator) |
| `npm run test:e2e` | Playwright (starts the dev server in local mode) |
| `npm run lint` / `npm run knip` | ESLint / unused-code check |

## Deployment

Firebase App Hosting (`apphosting.yaml`). Deploy rules with `firebase deploy --only firestore,storage`.
