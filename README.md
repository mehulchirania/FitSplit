# FitSplit

FitSplit is a gym management web app for the Titan V2 Fitness pilot gym.

It supports owner/admin workflows for members, memberships, exercise catalogs, and workout programs, plus a member-facing portal for assigned workouts and membership status.

## Stack

- Next.js App Router
- React
- TypeScript
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Security Rules
- Firebase App Hosting after Blaze upgrade

## Current Features

- Admin workspace page
- Titan V2 Fitness pilot workspace
- Owner dashboard
- Member management
- Membership status calculation
- Owner-only exercise catalog
- Workout split templates from `lib/workouts.json`
- Custom workout plan builder
- Member dashboard
- Dark mode
- Firebase-ready server actions and read models

## Workout Splits

Workout data comes from:

```text
lib/workouts.json
```

Included split templates:

- PPL x 2
- PPL + Upper/Lower
- Bro Split
- Modified Arnold Split x 2
- Custom User Routine

## Firebase Collections

```text
gyms
profiles
memberships
exerciseCatalog
workoutPrograms
notifications
workoutSplitTemplates
```

## Local Setup

Install dependencies:

```bash
npm.cmd install
```

Run locally:

```bash
npm.cmd run dev
```

Build:

```bash
npm.cmd run build
```

## Firebase Setup

See:

```text
FIREBASE_SETUP.md
```

Seed Firestore after Firebase Admin env vars are configured:

```bash
npm.cmd run seed:firebase
```

Deploy Firebase rules:

```bash
firebase deploy --only firestore,storage
```

## Hosting

The app uses Next.js server actions for Firebase Admin writes. For a fully working hosted app, deploy with Firebase App Hosting after upgrading the Firebase project to Blaze.

