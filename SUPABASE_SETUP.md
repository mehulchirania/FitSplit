# Supabase Setup

FitSplit now has Supabase write actions for:

- Creating members and their first membership
- Adding owner-only catalog exercises
- Saving custom workout programs

## 1. Create Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CRON_SECRET=replace-me
AI_PROVIDER_API_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.

## 2. Run Migrations

Apply these SQL files in Supabase SQL Editor or with the Supabase CLI:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_roles_workout_catalog_splits.sql
```

## 3. Restart The Dev Server

After adding `.env.local`, restart Next.js:

```bash
npm.cmd run dev
```

## 4. Test Writes

Use these pages:

```text
/owner/members
/owner/exercises
/owner/programs
```

The members and exercise catalog pages show a badge:

- `Reading from Supabase`
- `Using mock seed data`

If the app is still showing mock data, check that `.env.local` is present and the migrations ran successfully.

## 5. Seed The Workout Catalog And Splits

After migrations and env vars are ready:

```bash
npm.cmd run seed:supabase
```

This imports `lib/workouts.json` into Supabase as:

- owner-only catalog exercises
- workout programs
- workout days
- workout exercise rows
- workout split templates

## Current Persistence Notes

- The app auto-creates a Titan V2 Fitness gym row if missing.
- The app auto-creates a temporary owner profile with id `00000000-0000-0000-0000-000000000001` for local development writes.
- JSON workout catalog exercises are mirrored into Supabase automatically when used in a saved custom plan.
- Real Supabase Auth and RLS enforcement should be the next security step before production use.
