# Gym Management Web App

Project name: **FitSplit**

A web application for managing a single gym pilot, built with a path to scale into a multi-gym platform later.

The first version focuses on two roles:

- Gym members, who can log in, view their membership status, and follow assigned workout programs with exercise videos.
- Gym owners, who can manage members, manually assign memberships after offline payment, build workout programs, assign them to members, and track expiry alerts.

The app is designed for a low-cost MVP using free-tier friendly infrastructure:

- Next.js for the web application
- Vercel for hosting
- Supabase for database, authentication, row-level security, file storage, and scheduled jobs
- Claude or another AI provider later for workout program suggestions reviewed by the owner before assignment

## Product Goals

The MVP is intentionally practical and gym-owner friendly. It does not process payments inside the app. The owner collects payment outside the app, then records the membership manually.

Primary goals:

- Give members one clean place to view their membership and assigned workout plan.
- Give owners a dashboard that makes expiring and expired memberships hard to miss.
- Let owners create reusable workout programs with exercise demonstration videos.
- Keep infrastructure simple and affordable for a single-gym pilot.
- Model the data in a way that supports multiple gyms later without a full rewrite.

Non-goals for the initial MVP:

- Online payment collection
- Automated invoicing
- Native mobile apps
- Full CRM functionality
- Trainer payroll or attendance tracking
- Automated AI assignment without owner review

## Tech Stack

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Server Components where useful for dashboard pages
- Client Components for interactive builders, forms, filters, and video embeds

### Backend

- Supabase Postgres
- Supabase Auth
- Supabase Row Level Security
- Supabase Storage
- Supabase Edge Functions or Next.js Route Handlers for server-side actions
- Supabase scheduled jobs or Vercel Cron for expiry checks

### Hosting

- Vercel for the Next.js app
- Supabase hosted project for database, auth, storage, and scheduled tasks

### Future AI Integration

- Claude API or another LLM provider
- AI route generates draft workout programs from member goals
- Drafts are saved for owner review
- Owner edits and approves before assigning to a member

## High-Level Architecture

```text
Member / Owner Browser
        |
        v
Next.js App on Vercel
        |
        |-- Supabase Auth
        |-- Supabase Postgres
        |-- Supabase Storage
        |-- Supabase Edge Functions / RPC
        |
        v
Scheduled Expiry Worker
        |
        v
Notification Records
```

The frontend talks to Supabase using authenticated requests. Supabase Row Level Security protects data based on the signed-in user's role and gym membership.

The app should be designed as a single-gym product at the UI level for the pilot, while the data model includes `gym_id` on core records. This allows the same architecture to support more gyms later.

## User Roles

### Member

A member can:

- Sign in
- View their membership start date, end date, and status
- See expiry warnings when membership is close to ending
- View assigned workout programs
- Watch exercise demonstration videos
- View basic profile information
- Receive in-app notifications

A member cannot:

- Create or edit memberships
- See other members
- Create or edit workout programs
- Assign programs
- Access owner dashboard data

### Owner

An owner can:

- View all members in their gym
- Create, edit, and deactivate member profiles
- Assign memberships after offline payment
- Set membership start date and duration
- See automatically calculated membership end date
- View active, expiring soon, and expired memberships
- Create and edit workout programs
- Create and manage exercise library items
- Upload exercise videos or add YouTube/Vimeo links
- Assign workout programs to members
- See alerts for memberships requiring attention
- View and manage notifications

## Core Features

### 1. Authentication and Profiles

Authentication is handled by Supabase Auth.

After a user signs up or is invited, a matching profile row is created in the `profiles` table. The profile stores the user's role, display name, phone number, and default gym relationship.

Recommended initial flow:

1. Gym owner account is created manually during setup.
2. Owner adds or invites members.
3. Members log in with email/password or magic link.
4. Role-based routing sends owners to `/owner` and members to `/member`.

### 2. Member Dashboard

The member dashboard shows:

- Current membership status
- Membership start and end dates
- Days remaining
- Expiry warning when close to end date
- Assigned workout program
- Workout days and exercises
- Exercise videos
- In-app notifications

Suggested route:

```text
/member
```

### 3. Owner Dashboard

The owner dashboard shows:

- Total members
- Active memberships
- Expiring soon memberships
- Expired memberships
- Recent notifications
- Members needing attention

Suggested route:

```text
/owner
```

### 4. Member Management

The owner can:

- Add a member
- Edit member details
- View member membership history
- Assign or renew membership
- Assign workout program
- View member-specific notifications

Suggested routes:

```text
/owner/members
/owner/members/[memberId]
```

### 5. Membership Management

The owner manually creates a membership after collecting payment outside the app.

Required inputs:

- Member
- Start date
- Duration type or duration in days/months
- Optional notes

The app calculates:

- End date
- Current status
- Days remaining

Membership status should generally be derived from dates, not manually stored as the source of truth.

Suggested status rules:

- `active`: today is before the expiry warning window and before or equal to end date
- `expiring_soon`: today is within the configured warning window before end date
- `expired`: today is after end date

Default expiry warning window:

```text
7 days before membership end date
```

This can later become configurable per gym.

### 6. Workout Program Builder

The owner can create structured workout programs.

A program contains:

- Program title
- Description
- Goal
- Difficulty level
- Number of days per week
- Ordered workout days
- Exercises inside each workout day

Each workout exercise can include:

- Exercise reference
- Sets
- Reps
- Duration
- Rest period
- Tempo
- Notes
- Sort order

Suggested routes:

```text
/owner/programs
/owner/programs/new
/owner/programs/[programId]/edit
```

### 7. Exercise Library

The exercise library stores reusable exercises.

Each exercise can include:

- Name
- Muscle group
- Equipment
- Instructions
- Video source
- Video URL or uploaded file path
- Owner notes

Supported video sources:

- Supabase Storage upload
- YouTube embed
- Vimeo embed

### 8. Program Assignment

Owners assign workout programs to members.

A member can have:

- One active assigned program in the MVP
- Program assignment history for future reference

The app should preserve the assignment record even if the source program is later edited. In the first MVP, it is acceptable for assignments to reference the live program. Later, program snapshots can be added if exact historical preservation is required.

### 9. Notifications

The MVP should support in-app notifications first.

Notification examples:

- Membership expiring soon
- Membership expired
- New workout program assigned
- Membership renewed

Notification recipients:

- Member
- Owner

Delivery channels for MVP:

- In-app notification list

Future delivery channels:

- Email
- WhatsApp
- SMS
- Push notifications

### 10. Expiry Automation

A scheduled worker runs daily and checks memberships.

Responsibilities:

- Find memberships entering the expiry warning window
- Create owner notifications
- Create member notifications
- Find memberships that expired
- Create expired membership notifications
- Avoid duplicate notifications for the same event

The worker can be implemented using:

- Supabase scheduled job
- Supabase Edge Function
- Vercel Cron hitting a protected Next.js route

Recommended MVP approach:

```text
Vercel Cron -> /api/cron/check-memberships -> Supabase service role query -> notification inserts
```

The route must be protected by a cron secret.

## Database Design

The database uses Supabase Postgres.

Most core tables include:

- `id`
- `gym_id`
- `created_at`
- `updated_at`

Where practical, records should be soft-deactivated instead of deleted, especially for members, memberships, and programs.

## Tables

### `gyms`

Stores gym organizations.

For the pilot, there will usually be one row.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `text` | Gym name |
| `slug` | `text` | Unique gym slug |
| `owner_user_id` | `uuid` | References `auth.users.id` |
| `expiry_warning_days` | `integer` | Default `7` |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Indexes:

- Unique index on `slug`
- Index on `owner_user_id`

### `profiles`

Stores app-level user profile data.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, references `auth.users.id` |
| `full_name` | `text` | User display name |
| `email` | `text` | Email copied from auth for convenience |
| `phone` | `text` | Optional |
| `role` | `text` | `owner` or `member` |
| `default_gym_id` | `uuid` | References `gyms.id` |
| `avatar_url` | `text` | Optional |
| `is_active` | `boolean` | Default `true` |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Constraints:

- `role in ('owner', 'member')`

Indexes:

- Index on `default_gym_id`
- Index on `role`

### `gym_members`

Connects member profiles to gyms.

This table supports multi-gym membership later, even though the pilot is single-gym.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `user_id` | `uuid` | References `profiles.id` |
| `member_code` | `text` | Optional human-readable member code |
| `joined_at` | `date` | Date member joined gym |
| `status` | `text` | `active`, `inactive`, `archived` |
| `notes` | `text` | Owner-only notes |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Constraints:

- Unique pair of `gym_id` and `user_id`
- `status in ('active', 'inactive', 'archived')`

Indexes:

- Index on `gym_id`
- Index on `user_id`
- Index on `status`

### `membership_plans`

Optional but useful for reusable durations.

Examples:

- 1 month
- 3 months
- 6 months
- 12 months

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `name` | `text` | Plan name |
| `duration_months` | `integer` | Optional |
| `duration_days` | `integer` | Optional |
| `is_active` | `boolean` | Default `true` |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Notes:

- MVP can use either `duration_months` or `duration_days`.
- If both are allowed, validation should ensure at least one is present.

Indexes:

- Index on `gym_id`
- Index on `is_active`

### `memberships`

Stores member membership periods.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `member_user_id` | `uuid` | References `profiles.id` |
| `plan_id` | `uuid` | Optional reference to `membership_plans.id` |
| `start_date` | `date` | Membership start |
| `end_date` | `date` | Calculated membership end |
| `duration_months` | `integer` | Stored for history |
| `duration_days` | `integer` | Stored for history |
| `payment_reference` | `text` | Optional offline payment reference |
| `notes` | `text` | Owner-only notes |
| `created_by` | `uuid` | Owner profile id |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Important:

- Membership status should be calculated from `start_date`, `end_date`, and the gym warning window.
- Avoid relying on a mutable `status` column unless there is a clear audit reason.

Indexes:

- Index on `gym_id`
- Index on `member_user_id`
- Index on `end_date`
- Composite index on `gym_id, end_date`

### `exercise_library`

Stores reusable exercises.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `name` | `text` | Exercise name |
| `description` | `text` | Optional |
| `instructions` | `text` | Form instructions |
| `muscle_group` | `text` | Example: chest, back, legs |
| `equipment` | `text` | Example: dumbbell, barbell, machine |
| `video_source` | `text` | `upload`, `youtube`, `vimeo`, `none` |
| `video_url` | `text` | YouTube/Vimeo URL or public/signed URL |
| `video_storage_path` | `text` | Supabase Storage path for uploads |
| `thumbnail_url` | `text` | Optional |
| `is_active` | `boolean` | Default `true` |
| `created_by` | `uuid` | Owner profile id |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Constraints:

- `video_source in ('upload', 'youtube', 'vimeo', 'none')`

Indexes:

- Index on `gym_id`
- Index on `muscle_group`
- Index on `is_active`

### `workout_programs`

Stores reusable workout program headers.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `title` | `text` | Program title |
| `description` | `text` | Optional |
| `goal` | `text` | Example: fat loss, strength, hypertrophy |
| `difficulty` | `text` | `beginner`, `intermediate`, `advanced` |
| `days_per_week` | `integer` | Optional |
| `is_active` | `boolean` | Default `true` |
| `created_by` | `uuid` | Owner profile id |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Constraints:

- `difficulty in ('beginner', 'intermediate', 'advanced')`

Indexes:

- Index on `gym_id`
- Index on `is_active`
- Index on `difficulty`

### `workout_days`

Stores ordered days or sessions inside a program.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `program_id` | `uuid` | References `workout_programs.id` |
| `title` | `text` | Example: Push Day, Lower Body |
| `day_number` | `integer` | Ordered day number |
| `notes` | `text` | Optional |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Indexes:

- Index on `program_id`
- Composite index on `program_id, day_number`

### `workout_exercises`

Stores exercises assigned to a workout day.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `workout_day_id` | `uuid` | References `workout_days.id` |
| `exercise_id` | `uuid` | References `exercise_library.id` |
| `sort_order` | `integer` | Order within workout day |
| `sets` | `integer` | Optional |
| `reps` | `text` | Supports ranges like `8-12` |
| `duration_seconds` | `integer` | Optional |
| `rest_seconds` | `integer` | Optional |
| `tempo` | `text` | Optional |
| `notes` | `text` | Optional |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Indexes:

- Index on `workout_day_id`
- Composite index on `workout_day_id, sort_order`
- Index on `exercise_id`

### `program_assignments`

Assigns workout programs to members.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `member_user_id` | `uuid` | References `profiles.id` |
| `program_id` | `uuid` | References `workout_programs.id` |
| `assigned_by` | `uuid` | Owner profile id |
| `assigned_at` | `timestamptz` | Assignment timestamp |
| `starts_on` | `date` | Optional |
| `ends_on` | `date` | Optional |
| `status` | `text` | `active`, `completed`, `cancelled` |
| `notes` | `text` | Optional |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Constraints:

- `status in ('active', 'completed', 'cancelled')`

Indexes:

- Index on `gym_id`
- Index on `member_user_id`
- Index on `program_id`
- Composite index on `member_user_id, status`

MVP rule:

- Only one active assignment per member.

This can be enforced with a partial unique index:

```sql
create unique index one_active_program_assignment_per_member
on program_assignments (gym_id, member_user_id)
where status = 'active';
```

### `notifications`

Stores in-app notifications for owners and members.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `recipient_user_id` | `uuid` | References `profiles.id` |
| `type` | `text` | Notification type |
| `title` | `text` | Short title |
| `body` | `text` | Message body |
| `related_entity_type` | `text` | Example: membership, program |
| `related_entity_id` | `uuid` | Optional |
| `read_at` | `timestamptz` | Null when unread |
| `created_at` | `timestamptz` | Created timestamp |

Suggested notification types:

- `membership_expiring_soon`
- `membership_expired`
- `membership_renewed`
- `program_assigned`

Indexes:

- Index on `recipient_user_id`
- Index on `gym_id`
- Index on `created_at`
- Composite index on `recipient_user_id, read_at`

### `notification_events`

Prevents duplicate scheduled notifications.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `membership_id` | `uuid` | References `memberships.id` |
| `event_type` | `text` | Example: expiring soon, expired |
| `event_date` | `date` | Date the event was generated |
| `created_at` | `timestamptz` | Created timestamp |

Constraints:

- Unique combination of `membership_id`, `event_type`

Indexes:

- Index on `gym_id`
- Index on `membership_id`
- Index on `event_type`

### `ai_program_suggestions`

Future-facing table for Claude-generated draft workout programs.

This table is not required for the first MVP, but the architecture should reserve space for it.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `gym_id` | `uuid` | References `gyms.id` |
| `member_user_id` | `uuid` | References `profiles.id` |
| `requested_by` | `uuid` | Owner profile id |
| `input_goals` | `jsonb` | Member goals and constraints |
| `generated_program` | `jsonb` | AI-generated draft |
| `status` | `text` | `draft`, `converted`, `discarded` |
| `converted_program_id` | `uuid` | Optional reference to `workout_programs.id` |
| `created_at` | `timestamptz` | Created timestamp |
| `updated_at` | `timestamptz` | Updated timestamp |

Constraints:

- `status in ('draft', 'converted', 'discarded')`

Indexes:

- Index on `gym_id`
- Index on `member_user_id`
- Index on `status`

## Entity Relationships

```text
gyms
  -> profiles through owner_user_id
  -> gym_members
  -> memberships
  -> membership_plans
  -> exercise_library
  -> workout_programs
  -> notifications

profiles
  -> gym_members
  -> memberships as member_user_id
  -> program_assignments as member_user_id
  -> notifications as recipient_user_id

workout_programs
  -> workout_days
  -> program_assignments

workout_days
  -> workout_exercises

exercise_library
  -> workout_exercises
```

## Membership Status Calculation

Membership status can be calculated in SQL, server code, or a database view.

Suggested logic:

```text
if today > end_date:
  expired
else if today >= end_date - expiry_warning_days:
  expiring_soon
else:
  active
```

Recommended database view:

```sql
create view membership_status_view as
select
  m.*,
  case
    when current_date > m.end_date then 'expired'
    when current_date >= (m.end_date - (g.expiry_warning_days || ' days')::interval)::date then 'expiring_soon'
    else 'active'
  end as computed_status,
  (m.end_date - current_date) as days_remaining
from memberships m
join gyms g on g.id = m.gym_id;
```

## Row Level Security Strategy

RLS should be enabled on all app tables.

### General Rules

- Owners can read and manage records for gyms they own.
- Members can read only their own member-facing records.
- Members cannot read owner-only notes.
- Service role can run scheduled expiry checks.

### Owner Access

Owners should be able to:

- Read their gym
- Read all members in their gym
- Create and update memberships for their gym
- Create and update programs for their gym
- Create and update exercises for their gym
- Assign programs to members in their gym
- Read notifications addressed to them

### Member Access

Members should be able to:

- Read their own profile
- Read their own gym membership link
- Read their own memberships
- Read their active program assignments
- Read assigned workout programs, days, exercises, and exercise videos
- Read and update their own notifications as read

Members should not be able to:

- Create memberships
- Update membership dates
- Read other member records
- Read owner-only notes
- Create or edit programs
- Create or edit exercise library records

### Suggested Helper Functions

Use Postgres helper functions to simplify policies:

```sql
is_gym_owner(gym_id uuid)
is_gym_member(gym_id uuid)
current_user_role()
```

These functions can check `auth.uid()` against `profiles`, `gyms`, and `gym_members`.

## Storage Design

Use Supabase Storage for uploaded exercise videos and optional thumbnails.

Recommended buckets:

```text
exercise-videos
exercise-thumbnails
profile-avatars
```

### Exercise Video Paths

Suggested path format:

```text
gyms/{gym_id}/exercises/{exercise_id}/{filename}
```

### Storage Access

Owners:

- Can upload videos for their gym
- Can update or replace exercise videos

Members:

- Can view videos attached to assigned workout programs

For private buckets, use signed URLs generated by server-side code.

For the MVP, public exercise videos may be acceptable if the gym owner is comfortable with it, but private storage is safer.

## Video Embeds

The app should normalize YouTube and Vimeo URLs before embedding.

Examples:

- YouTube watch URL -> YouTube embed URL
- YouTube short URL -> YouTube embed URL
- Vimeo page URL -> Vimeo player URL

Validation should reject unsupported URLs.

Supported sources:

```text
upload
youtube
vimeo
none
```

## Suggested Routes

### Public Routes

```text
/
/login
/signup
/forgot-password
```

### Member Routes

```text
/member
/member/workout
/member/membership
/member/notifications
/member/profile
```

### Owner Routes

```text
/owner
/owner/members
/owner/members/new
/owner/members/[memberId]
/owner/programs
/owner/programs/new
/owner/programs/[programId]/edit
/owner/exercises
/owner/exercises/new
/owner/exercises/[exerciseId]/edit
/owner/notifications
/owner/settings
```

### API Routes

```text
/api/cron/check-memberships
/api/videos/signed-url
/api/ai/program-suggestion
```

## Suggested Next.js Structure

```text
app/
  (auth)/
    login/
    signup/
  member/
    page.tsx
    workout/
    membership/
    notifications/
    profile/
  owner/
    page.tsx
    members/
    programs/
    exercises/
    notifications/
    settings/
  api/
    cron/
      check-memberships/
    videos/
      signed-url/
    ai/
      program-suggestion/

components/
  auth/
  dashboard/
  memberships/
  workouts/
  exercises/
  notifications/
  ui/

lib/
  supabase/
  auth/
  memberships/
  workouts/
  videos/
  notifications/
  ai/

types/
  database.ts
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
AI_PROVIDER_API_KEY=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for browser use.
- `SUPABASE_SERVICE_ROLE_KEY` must only be used server-side.
- `CRON_SECRET` protects scheduled routes.
- `AI_PROVIDER_API_KEY` is only needed when the AI feature is added.

## Notification Workflow

### Expiring Soon

1. Daily cron runs.
2. Query active memberships where `end_date` is within the warning window.
3. Check `notification_events` to avoid duplicate event creation.
4. Create notification for the member.
5. Create notification for the owner.
6. Insert notification event.

### Expired

1. Daily cron runs.
2. Query memberships where `end_date` is before today.
3. Check `notification_events`.
4. Create notification for the member.
5. Create notification for the owner.
6. Insert notification event.

## AI Program Suggestion Workflow

The AI feature should be owner-controlled.

Suggested flow:

1. Owner opens a member profile.
2. Owner clicks "Generate draft program".
3. Owner enters or confirms:
   - Fitness goal
   - Experience level
   - Available days per week
   - Injury constraints
   - Equipment access
   - Preferred workout duration
4. Server route sends structured prompt to Claude.
5. AI returns structured JSON.
6. App saves the response in `ai_program_suggestions`.
7. Owner reviews and edits the draft.
8. Owner converts draft into a real `workout_program`.
9. Owner assigns the final program to the member.

Important:

- AI should never assign a program directly to a member.
- Owner review is required before assignment.
- AI output should be validated before saving.

## MVP Build Phases

### Phase 1: Foundation

- Create Next.js app
- Configure Tailwind
- Configure Supabase client
- Set up Auth
- Create database schema
- Add RLS policies
- Create owner and member layouts

### Phase 2: Memberships

- Owner member list
- Member detail page
- Create membership form
- End date calculation
- Membership status display
- Member membership dashboard

### Phase 3: Workouts

- Exercise library
- Video upload/link support
- Workout program builder
- Workout day and exercise ordering
- Program assignment
- Member workout view

### Phase 4: Notifications

- Notification table
- Member notification list
- Owner notification list
- Daily expiry cron
- Duplicate event prevention

### Phase 5: Polish and Pilot Readiness

- Empty states
- Loading states
- Form validation
- Error handling
- Basic analytics/logging
- Seed data
- Deployment to Vercel
- Supabase production project setup

### Phase 6: AI Draft Programs

- Add AI program suggestion route
- Add structured prompt and JSON schema
- Save draft suggestions
- Owner review/edit screen
- Convert draft into workout program

## Security Considerations

- Enable RLS on every app table.
- Never expose service role keys to the browser.
- Protect cron routes with `CRON_SECRET`.
- Validate all uploaded file types and sizes.
- Normalize and validate video URLs.
- Avoid storing payment card data.
- Keep owner-only notes hidden from members.
- Use signed URLs for private videos when possible.
- Log AI requests without storing sensitive health details unnecessarily.

## Free Tier Considerations

This architecture is suitable for a single-gym pilot on free tiers if usage is modest.

Potential limits to monitor:

- Supabase database size
- Supabase storage size for uploaded videos
- Supabase bandwidth
- Vercel function execution
- Vercel cron frequency

To reduce storage usage:

- Prefer YouTube/Vimeo embeds when acceptable.
- Compress uploaded videos before upload.
- Set upload size limits.
- Use thumbnails for dashboard previews.

## Future Enhancements

- Online payments
- Membership plan pricing
- Email notifications
- WhatsApp reminders
- Attendance tracking
- Body measurement progress tracking
- Workout completion tracking
- Trainer accounts
- Multi-gym owner accounts
- Member progress photos
- Exercise comments or feedback
- Program templates marketplace
- AI workout adjustment based on member feedback

## Initial Success Criteria

The MVP is successful when:

- Owner can add members.
- Owner can assign and renew memberships.
- Owner can clearly see active, expiring soon, and expired members.
- Member can log in and see their membership dates.
- Owner can create workout programs with exercise videos.
- Owner can assign a program to a member.
- Member can view the assigned program and watch exercise videos.
- Expiry notifications are generated reliably.
- The system can support the pilot gym without paid infrastructure.
