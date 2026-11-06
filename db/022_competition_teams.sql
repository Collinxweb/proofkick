-- Saved team lists per competition, so the logo job does not call football-data.org on every run.
create table if not exists competition_teams (
  code text primary key,
  teams jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table competition_teams enable row level security;
