# Firebase Setup

FitSplit is moving fully to Firebase.

## Services

- Firebase Authentication for users and roles
- Cloud Firestore for members, memberships, exercise catalog, workout programs, and notifications
- Firebase Storage for uploaded exercise videos
- Firebase App Hosting for the full-stack Next.js app after Blaze upgrade

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fitsplit-29215.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fitsplit-29215
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=fitsplit-29215
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
CRON_SECRET=replace-me
AI_PROVIDER_API_KEY=
```

The Firebase Admin values come from a service account key. Keep them server-side only.

## Firestore Collections

```text
gyms
profiles
memberships
exerciseCatalog
workoutPrograms
notifications
workoutSplitTemplates
```

## Seed Workout Data

After `.env.local` is configured:

```bash
npm.cmd run seed:firebase
```

This imports `lib/workouts.json` into Firestore.

## Blaze Upgrade

Firebase App Hosting requires Blaze. Until Blaze is enabled, the app can run locally but cannot be hosted as a fully working server-rendered Firebase app.

