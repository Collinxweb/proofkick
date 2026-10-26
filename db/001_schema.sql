-- ProofKick schema (Supabase / Postgres)
-- Paste into the Supabase SQL editor and run once. Not yet run against a live database,
-- so expect to fix small syntax issues on the first run.
--
-- Design rules:
--   1. Strategies are immutable versions. Editing rules = new version, fresh record.
--   2. Picks are locked by the DB itself (server clock, before kickoff). No deletes, ever.
--   3. Only settlement fields on a pick can change, and only once.
--   4. Every pick gets a commitment hash. Batches of hashes are anchored on Sui.

create extension if not exists pgcrypto;

-- ---------- identity ----------
create table profiles (
  id uuid primary key references auth.users(id),
  handle text unique not null,
  sui_address text unique,
  created_at timestamptz not null default now()
);

-- ---------- strategies ----------
create table strategies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  name text not null,
  created_at timestamptz not null default now()
);

-- rules example:
-- {"market":"h2h","selection":"home",
--  "conditions":[{"field":"odds","op":"between","value":[1.8,2.3]},
--                {"field":"home_goals_last3","op":">=","value":2}]}
create table strategy_versions (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references strategies(id),
  version int not null,
  rules jsonb not null,
  rules_hash text not null,          -- sha256 of canonical rules JSON, computed in app
  created_at timestamptz not null default now(),
  unique (strategy_id, version)
);

-- ---------- fixtures and odds ----------
create table fixtures (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  league text not null,
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','live','finished','postponed','cancelled')),
  home_goals int,
  away_goals int,
  updated_at timestamptz not null default now()
);
create index fixtures_kickoff_idx on fixtures (kickoff_at);

-- Only store 'lock' and 'close' snapshots to stay inside the odds API credit budget.
create table odds_snapshots (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references fixtures(id),
  bookmaker text not null,
  market text not null,              -- 'h2h', 'totals'
  selection text not null,           -- 'home', 'draw', 'away', 'over_2.5'
  price numeric(8,3) not null check (price > 1),
  kind text not null check (kind in ('lock','close')),
  taken_at timestamptz not null default now()
);
create index odds_snap_idx on odds_snapshots (fixture_id, market, selection, kind);

-- ---------- anchors (created before picks, which reference them) ----------
create table anchors (
  id uuid primary key default gen_random_uuid(),
  merkle_root text not null,
  pick_count int not null,
  sui_tx_digest text,                -- filled once the Sui transaction lands
  created_at timestamptz not null default now(),
  anchored_at timestamptz
);

-- ---------- picks ----------
-- commitment_hash = sha256(canonical_json({strategy_version_id, rules_hash,
--   fixture_external_id, market, selection, odds_taken, locked_at}) + nonce)
-- Computed in the app right after insert (locked_at is set by the DB).
-- Keep the canonical JSON format fixed and documented, or nobody can re-verify it.
create table picks (
  id uuid primary key default gen_random_uuid(),
  strategy_version_id uuid not null references strategy_versions(id),
  fixture_id uuid not null references fixtures(id),
  market text not null,
  selection text not null,
  odds_taken numeric(8,3) not null check (odds_taken > 1),
  lock_snapshot_id uuid references odds_snapshots(id),
  reasoning jsonb not null,          -- which conditions matched, with the values seen
  nonce text not null,
  commitment_hash text,
  locked_at timestamptz not null default now(),
  -- mutable, settlement only
  status text not null default 'pending'
    check (status in ('pending','won','lost','void')),
  closing_odds numeric(8,3),
  settled_at timestamptz,
  -- proof pointers, filled in later
  memory_blob_id text,               -- Walrus Memory blob id
  anchor_id uuid references anchors(id),
  leaf_index int,
  unique (strategy_version_id, fixture_id, market)
);
create index picks_version_idx on picks (strategy_version_id);
create index picks_fixture_idx on picks (fixture_id);

create table follows (
  follower_id uuid not null references profiles(id),
  strategy_id uuid not null references strategies(id),
  created_at timestamptz not null default now(),
  primary key (follower_id, strategy_id)
);

-- ---------- integrity triggers ----------
create or replace function forbid_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'rows in % cannot be deleted', tg_table_name;
end $$;

create trigger no_delete_strategies  before delete on strategies
  for each row execute function forbid_delete();
create trigger no_delete_versions    before delete on strategy_versions
  for each row execute function forbid_delete();
create trigger no_delete_picks       before delete on picks
  for each row execute function forbid_delete();
create trigger no_delete_anchors     before delete on anchors
  for each row execute function forbid_delete();

create or replace function forbid_update() returns trigger
language plpgsql as $$
begin
  raise exception 'rows in % are immutable', tg_table_name;
end $$;

create trigger no_update_versions before update on strategy_versions
  for each row execute function forbid_update();

-- A pick can only be inserted before kickoff, and the DB sets the lock time.
create or replace function picks_lock_check() returns trigger
language plpgsql as $$
declare ko timestamptz;
begin
  select kickoff_at into ko from fixtures where id = new.fixture_id;
  if ko is null then
    raise exception 'unknown fixture';
  end if;
  if now() >= ko then
    raise exception 'pick must be locked before kickoff';
  end if;
  new.locked_at := now();
  new.status := 'pending';
  new.closing_odds := null;
  new.settled_at := null;
  return new;
end $$;

create trigger picks_lock before insert on picks
  for each row execute function picks_lock_check();

-- After insert, only settlement and proof-pointer fields may change.
create or replace function picks_update_guard() returns trigger
language plpgsql as $$
begin
  if (new.strategy_version_id, new.fixture_id, new.market, new.selection,
      new.odds_taken, new.lock_snapshot_id, new.reasoning, new.nonce, new.locked_at)
     is distinct from
     (old.strategy_version_id, old.fixture_id, old.market, old.selection,
      old.odds_taken, old.lock_snapshot_id, old.reasoning, old.nonce, old.locked_at)
  then
    raise exception 'pick core fields are immutable';
  end if;

  -- commitment hash may be set once, never changed
  if old.commitment_hash is not null
     and new.commitment_hash is distinct from old.commitment_hash then
    raise exception 'commitment_hash is immutable once set';
  end if;

  -- settlement happens once
  if old.status <> 'pending' and new.status is distinct from old.status then
    raise exception 'pick already settled';
  end if;
  return new;
end $$;

create trigger picks_guard before update on picks
  for each row execute function picks_update_guard();

-- ---------- public stats ----------
-- Flat 1-unit staking. Edge vs close = odds_taken / closing_odds - 1.
create view version_stats as
select
  v.id as strategy_version_id,
  s.id as strategy_id,
  s.name,
  v.version,
  p.handle as owner_handle,
  count(k.id) filter (where k.status = 'pending') as pending,
  count(k.id) filter (where k.status in ('won','lost')) as settled,
  count(k.id) filter (where k.status = 'won') as wins,
  round(100.0 * count(k.id) filter (where k.status = 'won')
        / nullif(count(k.id) filter (where k.status in ('won','lost')), 0), 1) as winrate_pct,
  round(sum(case k.status when 'won' then k.odds_taken - 1
                          when 'lost' then -1 else 0 end)::numeric, 2) as units,
  round(100.0 * sum(case k.status when 'won' then k.odds_taken - 1
                                  when 'lost' then -1 else 0 end)
        / nullif(count(k.id) filter (where k.status in ('won','lost')), 0), 1) as roi_pct,
  round(100.0 * avg(k.odds_taken / k.closing_odds - 1)
        filter (where k.closing_odds is not null), 2) as avg_edge_vs_close_pct
from strategy_versions v
join strategies s on s.id = v.strategy_id
join profiles p on p.id = s.owner_id
left join picks k on k.strategy_version_id = v.id
group by v.id, s.id, s.name, v.version, p.handle;

-- Shows every strategy a user has ever made, so nobody can hide the losers.
create view owner_summary as
select
  p.id as owner_id,
  p.handle,
  count(distinct s.id) as strategies_created,
  count(distinct v.id) as versions_created,
  count(k.id) as total_picks
from profiles p
left join strategies s on s.owner_id = p.id
left join strategy_versions v on v.strategy_id = s.id
left join picks k on k.strategy_version_id = v.id
group by p.id, p.handle;

-- ---------- row level security ----------
-- Public read. Writes go through the server with the service role key only,
-- except follows, which users manage themselves.
alter table profiles enable row level security;
alter table strategies enable row level security;
alter table strategy_versions enable row level security;
alter table fixtures enable row level security;
alter table odds_snapshots enable row level security;
alter table picks enable row level security;
alter table anchors enable row level security;
alter table follows enable row level security;

create policy read_all on profiles for select using (true);
create policy read_all on strategies for select using (true);
create policy read_all on strategy_versions for select using (true);
create policy read_all on fixtures for select using (true);
create policy read_all on odds_snapshots for select using (true);
create policy read_all on picks for select using (true);
create policy read_all on anchors for select using (true);
create policy read_all on follows for select using (true);

create policy manage_own_follows on follows for all
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());
