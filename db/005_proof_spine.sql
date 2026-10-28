-- Proof spine: manual picks, Walrus snapshot + Sui anchor pointers, graded results.
alter table picks alter column strategy_version_id drop not null;
alter table picks add column if not exists user_id uuid references profiles(id);
alter table picks add column if not exists source text not null default 'rule';
alter table picks add column if not exists anchor_digest text;
alter table picks add column if not exists anchor_object_id text;
alter table picks add column if not exists result_blob_id text;
alter table picks add column if not exists result_anchor_digest text;
alter table picks add column if not exists final_home int;
alter table picks add column if not exists final_away int;
alter table picks add column if not exists graded_at timestamptz;
do $$ begin
  alter table picks add constraint picks_source_check check (source in ('rule', 'manual'));
exception when duplicate_object then null; end $$;
create unique index if not exists picks_manual_once on picks (user_id, fixture_id, market) where strategy_version_id is null;
create index if not exists picks_user_idx on picks (user_id);
