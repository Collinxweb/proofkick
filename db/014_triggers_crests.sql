-- Team crests cache (filled by /api/cron/crests from TheSportsDB). Public read.
create table if not exists team_crests (
  name text primary key,
  badge text not null,
  fetched_at timestamptz not null default now()
);
alter table team_crests enable row level security;
drop policy if exists "crests read" on team_crests;
create policy "crests read" on team_crests for select using (true);
