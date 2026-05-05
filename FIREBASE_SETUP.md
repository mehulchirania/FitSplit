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
GOOGLE_APPLICATION_CREDENTIALS=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
CRON_SECRET=replace-me
AI_PROVIDER_API_KEY=
```

The `NEXT_PUBLIC_*` values are safe browser config. The Admin values are private server credentials and are required for local actions that create/update Firebase Auth users, write Firestore through the Admin SDK, or set custom claims.

## Local Firebase Admin Setup

For proper local auth, use the same Firebase project as hosting and configure the Firebase Admin SDK locally.

Recommended option:

1. Open Firebase Console -> Project settings -> Service accounts.
2. Generate a new private key for the Firebase Admin SDK.
3. Save the downloaded JSON outside git, for example:

```text
C:\Users\mehul\Documents\FirebaseKeys\fitsplit-29215-service-account.json
```

4. Add this to `.env.local`:

```env
FIREBASE_PROJECT_ID=fitsplit-29215
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\mehul\Documents\FirebaseKeys\fitsplit-29215-service-account.json
```

Alternative option:

Paste these service account fields into `.env.local`:

```env
FIREBASE_PROJECT_ID=fitsplit-29215
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@fitsplit-29215.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

After changing `.env.local`, restart `npm.cmd run dev -- --port 3000`. Next.js only reads environment variables on server startup.

Then seed the demo auth users:

```bash
npm.cmd run seed:auth
```

This creates the demo Firebase Auth accounts and custom claims:

```text
admin / password
titan-owner-1 / password
dummy-gym-owner-1 / password
9688227039 / 123456
```

With Admin configured, local actions such as "Add Gym Owner" will create a Firestore profile and a Firebase Auth user with owner custom claims, matching hosted behavior.

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
