create extension if not exists "pgcrypto";

create table gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null,
  expiry_warning_days integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key,
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('owner', 'member')),
  default_gym_id uuid references gyms(id),
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gym_members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  member_code text,
  joined_at date not null default current_date,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, user_id)
);

create table membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  name text not null,
  duration_months integer,
  duration_days integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (duration_months is not null or duration_days is not null)
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references membership_plans(id),
  start_date date not null,
  end_date date not null,
  duration_months integer,
  duration_days integer,
  payment_reference text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table exercise_library (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  name text not null,
  description text,
  instructions text,
  muscle_group text,
  equipment text,
  video_source text not null default 'none' check (video_source in ('upload', 'youtube', 'vimeo', 'none')),
  video_url text,
  video_storage_path text,
  thumbnail_url text,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workout_programs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  title text not null,
  description text,
  goal text,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  days_per_week integer,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workout_days (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  program_id uuid not null references workout_programs(id) on delete cascade,
  title text not null,
  day_number integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  workout_day_id uuid not null references workout_days(id) on delete cascade,
  exercise_id uuid not null references exercise_library(id),
  sort_order integer not null default 0,
  sets integer,
  reps text,
  duration_seconds integer,
  rest_seconds integer,
  tempo text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table program_assignments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_user_id uuid not null references profiles(id) on delete cascade,
  program_id uuid not null references workout_programs(id),
  assigned_by uuid references profiles(id),
  assigned_at timestamptz not null default now(),
  starts_on date,
  ends_on date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  recipient_user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  related_entity_type text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table notification_events (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  membership_id uuid not null references memberships(id) on delete cascade,
  event_type text not null,
  event_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (membership_id, event_type)
);

create table ai_program_suggestions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_user_id uuid not null references profiles(id) on delete cascade,
  requested_by uuid references profiles(id),
  input_goals jsonb not null default '{}'::jsonb,
  generated_program jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'converted', 'discarded')),
  converted_program_id uuid references workout_programs(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_active_program_assignment_per_member
on program_assignments (gym_id, member_user_id)
where status = 'active';

create index gyms_owner_user_id_idx on gyms(owner_user_id);
create index profiles_default_gym_id_idx on profiles(default_gym_id);
create index gym_members_gym_id_idx on gym_members(gym_id);
create index gym_members_user_id_idx on gym_members(user_id);
create index memberships_gym_id_end_date_idx on memberships(gym_id, end_date);
create index memberships_member_user_id_idx on memberships(member_user_id);
create index exercise_library_gym_id_idx on exercise_library(gym_id);
create index workout_programs_gym_id_idx on workout_programs(gym_id);
create index workout_days_program_id_day_number_idx on workout_days(program_id, day_number);
create index workout_exercises_workout_day_id_sort_order_idx on workout_exercises(workout_day_id, sort_order);
create index program_assignments_member_user_id_status_idx on program_assignments(member_user_id, status);
create index notifications_recipient_user_id_read_at_idx on notifications(recipient_user_id, read_at);
create index notification_events_membership_id_idx on notification_events(membership_id);
create index ai_program_suggestions_member_user_id_idx on ai_program_suggestions(member_user_id);

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
