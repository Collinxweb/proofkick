-- Kick strategies: a saved rule that places one kick per round when its condition is met during the entry window.
create table if not exists kick_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  asset text not null check (asset in ('BTC','ETH','PAXG')),
  horizon text not null check (horizon in ('24H','1W')),
  rule text not null check (rule in ('momentum','contrarian')),
  threshold numeric(5,2) not null check (threshold between 50 and 95),
  stake numeric(20,6) not null check (stake > 0 and stake <= 1000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists kick_strategy_runs (
  strategy_id uuid not null references kick_strategies(id),
  round_id text not null references kick_rounds(id),
  side text not null check (side in ('long','short')),
  created_at timestamptz not null default now(),
  primary key (strategy_id, round_id)
);
alter table kick_strategies enable row level security;
alter table kick_strategy_runs enable row level security;
drop policy if exists "kick strategies read" on kick_strategies;
create policy "kick strategies read" on kick_strategies for select using (true);
drop policy if exists "kick strategy runs read" on kick_strategy_runs;
create policy "kick strategy runs read" on kick_strategy_runs for select using (true);
