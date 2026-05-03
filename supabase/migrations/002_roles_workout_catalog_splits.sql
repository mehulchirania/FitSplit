alter table profiles drop constraint if exists profiles_role_check;
alter table profiles
add constraint profiles_role_check check (role in ('admin', 'owner', 'member'));

alter table exercise_library
add column if not exists owner_only boolean not null default true;

alter table workout_programs
add column if not exists split_type text not null default 'custom';

alter table workout_programs drop constraint if exists workout_programs_split_type_check;
alter table workout_programs
add constraint workout_programs_split_type_check
check (split_type in ('ppl_x2', 'ppl_upper_lower', 'bro_split', 'combo_x2', 'custom'));

create table if not exists workout_split_templates (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references gyms(id) on delete cascade,
  name text not null,
  split_type text not null check (split_type in ('ppl_x2', 'ppl_upper_lower', 'bro_split', 'combo_x2', 'custom')),
  description text,
  days_per_week integer not null,
  template_data jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id),
  is_system_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_split_templates_gym_id_idx
on workout_split_templates(gym_id);

create index if not exists workout_split_templates_split_type_idx
on workout_split_templates(split_type);

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.is_active = true
  );
$$;
