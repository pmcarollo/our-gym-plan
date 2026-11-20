-- Our Gym Plan: private data store.
-- All reads/writes go through the gym-api Edge Function using the service-role key.
-- Never expose the service-role key in the browser.

create table if not exists public.gym_data (
  profile text primary key check (profile in ('Paul', 'Chris')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.gym_data enable row level security;

-- No anon/authenticated policies are intentionally created.
-- The Edge Function uses the service role and is the only app access path.
revoke all on public.gym_data from anon, authenticated;
grant all on public.gym_data to service_role;

insert into public.gym_data (profile, payload)
values ('Paul', '{}'::jsonb), ('Chris', '{}'::jsonb)
on conflict (profile) do nothing;