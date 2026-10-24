-- StratTrack v0.2 schema. Run via Supabase CLI: supabase db push
-- Users are Supabase auth.users; public.profiles mirrors them (wallet address optional).

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  sui_address text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  league text not null,
  home_team text not null,
  away_team text not null,
  kickoff_time timestamptz not null,
  final_home int,
  final_away int,
  status text not null default 'scheduled' check (status in ('scheduled','live','final')),
  created_at timestamptz not null default now()
);

create table if not exists public.odds_snapshots (
  id bigserial primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  captured_at timestamptz not null default now(),
  home numeric(7,2) not null check (home >= 1),
  draw numeric(7,2) not null check (draw >= 1),
  away numeric(7,2) not null check (away >= 1),
  over25 numeric(7,2),
  under25 numeric(7,2),
  btts_yes numeric(7,2),
  btts_no numeric(7,2)
);
create index if not exists odds_snapshots_event_idx on public.odds_snapshots(event_id, captured_at);

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sport text not null default 'soccer',
  league text not null,
  rules jsonb not null default '[]'::jsonb check (jsonb_typeof(rules) = 'array'),
  -- cached stats, recomputed on settlement
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.picks (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  market text not null check (market in ('match_winner','over_under','btts')),
  selection text not null check (selection in ('home','draw','away','over','under','yes','no')),
  odds_at_log numeric(7,2) not null check (odds_at_log >= 1),
  kickoff_time timestamptz not null,
  logged_at timestamptz not null default now(),
  result text not null default 'pending' check (result in ('pending','won','lost','push')),
  settled_at timestamptz,
  -- picks may only be logged before kickoff; enforced here so no client can bypass it.
  constraint picks_before_kickoff check (logged_at < kickoff_time),
  unique (strategy_id, event_id, market)
);

-- Belt-and-braces: reject inserts at/after kickoff even if app code is bypassed.
create or replace function public.enforce_pick_before_kickoff() returns trigger
language plpgsql as $$
begin
  if new.logged_at >= new.kickoff_time then
    raise exception 'pick logged at or after kickoff' using errcode = 'check_violation';
  end if;
  -- kickoff_time must match the event (client cannot shift it)
  if new.kickoff_time <> (select kickoff_time from public.events where id = new.event_id) then
    raise exception 'kickoff_time does not match event' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists picks_before_kickoff_trg on public.picks;
create trigger picks_before_kickoff_trg before insert on public.picks
for each row execute function public.enforce_pick_before_kickoff();

-- Once a pick is settled it is immutable.
create or replace function public.freeze_settled_pick() returns trigger
language plpgsql as $$
begin
  if old.result <> 'pending' and (new.result is distinct from old.result or new.odds_at_log <> old.odds_at_log) then
    raise exception 'settled pick is immutable';
  end if;
  return new;
end $$;

drop trigger if exists picks_freeze_trg on public.picks;
create trigger picks_freeze_trg before update on public.picks
for each row execute function public.freeze_settled_pick();

create table if not exists public.memory_records (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies(id) on delete cascade,
  kind text not null default 'credibility' check (kind in ('credibility')),
  payload jsonb not null,
  memwal_id text,
  mode text not null default 'mock' check (mode in ('mock','live')),
  created_at timestamptz not null default now()
);

create table if not exists public.booking_exports (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid not null references public.picks(id) on delete cascade,
  operator text not null check (operator in ('sportybet','bet9ja')),
  code text not null,
  deep_link text not null,
  mocked boolean not null default true,
  created_at timestamptz not null default now()
);

-- Row level security: owners see their own strategies/picks; events and odds are public read.
alter table public.profiles enable row level security;
alter table public.strategies enable row level security;
alter table public.picks enable row level security;
alter table public.memory_records enable row level security;
alter table public.booking_exports enable row level security;
alter table public.events enable row level security;
alter table public.odds_snapshots enable row level security;

create policy "profiles self" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "events public read" on public.events for select using (true);
create policy "odds public read" on public.odds_snapshots for select using (true);
create policy "strategies owner" on public.strategies for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "picks owner" on public.picks for all using (
  exists (select 1 from public.strategies s where s.id = strategy_id and s.owner_id = auth.uid())
) with check (
  exists (select 1 from public.strategies s where s.id = strategy_id and s.owner_id = auth.uid())
);
create policy "memory owner read" on public.memory_records for select using (
  exists (select 1 from public.strategies s where s.id = strategy_id and s.owner_id = auth.uid())
);
create policy "booking owner" on public.booking_exports for all using (
  exists (select 1 from public.picks p join public.strategies s on s.id = p.strategy_id
          where p.id = pick_id and s.owner_id = auth.uid())
) with check (
  exists (select 1 from public.picks p join public.strategies s on s.id = p.strategy_id
          where p.id = pick_id and s.owner_id = auth.uid())
);

-- Auto-create a profile on signup (email, google, or sui-via-supabase).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
