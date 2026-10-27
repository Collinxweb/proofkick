-- v10: memwal snapshots, anchoring, CLV, public statement handles.
-- Apply with: supabase db push (after 0001_init.sql).

-- Public statement handle (used by /u/[username]).
alter table public.profiles add column if not exists username text unique;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

-- Pick-level walrus snapshot + anchoring + CLV.
alter table public.picks add column if not exists reasoning text not null default '';
alter table public.picks add column if not exists memwal_blob_id text;          -- real blob id from memwal, or null
alter table public.picks add column if not exists memwal_status text not null default 'pending'
  check (memwal_status in ('pending','written','skipped','failed'));
alter table public.picks add column if not exists memwal_error text;
alter table public.picks add column if not exists settlement_blob_id text;      -- real blob id for settlement snapshot
alter table public.picks add column if not exists anchor_digest text;           -- sui tx digest, only when chain confirmed
alter table public.picks add column if not exists anchor_status text not null default 'pending'
  check (anchor_status in ('pending','anchored','skipped','failed'));
alter table public.picks add column if not exists anchor_error text;
alter table public.picks add column if not exists closing_odds numeric(7,2);    -- last captured odds at/before kickoff
alter table public.picks add column if not exists clv_pct numeric(8,4);         -- odds_at_log / closing_odds - 1

-- Settlement snapshot payload kept for audit (the blob itself lives in memwal).
create table if not exists public.settlement_records (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid not null unique references public.picks(id) on delete cascade,
  memwal_blob_id text,
  memwal_status text not null check (memwal_status in ('written','skipped','failed')),
  payload_sha256 text,
  error text,
  created_at timestamptz not null default now()
);

-- Keep the immutability trigger from blocking the new anchoring/CLV columns on a settled pick.
create or replace function public.freeze_settled_pick() returns trigger
language plpgsql as $$
begin
  if old.result <> 'pending' and (
       new.result is distinct from old.result
    or new.odds_at_log <> old.odds_at_log
    or new.market <> old.market
    or new.selection <> old.selection
    or new.strategy_id <> old.strategy_id
    or new.event_id <> old.event_id
    or new.logged_at <> old.logged_at
    or new.kickoff_time <> old.kickoff_time
    or new.memwal_blob_id is distinct from old.memwal_blob_id
  ) then
    raise exception 'settled pick is immutable';
  end if;
  return new;
end $$;
