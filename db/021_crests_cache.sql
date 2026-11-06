-- Club crests: cached copies in storage, plus a source and an optional football-data team id.
-- A row with source = 'manual' is never overwritten by the job, so you can correct a club by hand.
alter table team_crests add column if not exists source text not null default 'auto';
alter table team_crests add column if not exists fd_team_id int;
insert into storage.buckets (id, name, public) values ('crests', 'crests', true) on conflict (id) do nothing;
