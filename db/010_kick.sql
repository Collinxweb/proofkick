-- Kick Markets (testnet play money). Separate tables: nothing existing is altered.
-- Mainnet receipts (Walrus snapshot + Sui object) are stored per row; the testnet transaction is kept beside them.

create table if not exists kick_rounds (
  id text primary key,                         -- e.g. BTC-24H-2026-11-04
  asset text not null check (asset in ('BTC','ETH','PAXG')),
  horizon text not null check (horizon in ('24H','1W')),
  product text not null,                        -- price source symbol, e.g. BTC-USD
  opens_at timestamptz not null,
  entry_closes_at timestamptz not null,
  expires_at timestamptz not null,
  open_price numeric(20,8),
  close_price numeric(20,8),
  long_pool numeric(20,6) not null default 0,   -- testnet KICK
  short_pool numeric(20,6) not null default 0,
  state text not null default 'open' check (state in ('open','settling','settled','void')),
  outcome text check (outcome in ('long','short','void')),
  open_snapshot_blob text,                      -- Walrus blob id: opening price, hashed
  open_digest text,                             -- Sui mainnet tx for the round opening
  open_testnet_tx text,
  close_snapshot_blob text,
  close_digest text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists kick_entries (
  id uuid primary key default gen_random_uuid(),
  round_id text not null references kick_rounds(id),
  user_id uuid not null references profiles(id),
  side text not null check (side in ('long','short')),
  stake numeric(20,6) not null check (stake > 0),
  status text not null default 'open' check (status in ('open','won','lost','refunded')),
  payout numeric(20,6),
  kick_testnet_tx text not null,                -- the testnet transaction that moved the stake into escrow
  kick_snapshot_blob text,                      -- Walrus: pick, odds-at-kick (implied %), stake, timestamp
  kick_digest text,                             -- Sui mainnet receipt for this kick
  settle_snapshot_blob text,
  settle_digest text,
  payout_testnet_tx text,
  created_at timestamptz not null default now(),
  unique (round_id, user_id, side)
);

create index if not exists kick_entries_user_idx on kick_entries (user_id, created_at desc);
create index if not exists kick_entries_round_idx on kick_entries (round_id);

alter table kick_rounds enable row level security;
alter table kick_entries enable row level security;
drop policy if exists "kick rounds read" on kick_rounds;
create policy "kick rounds read" on kick_rounds for select using (true);
drop policy if exists "kick entries read" on kick_entries;
create policy "kick entries read" on kick_entries for select using (true);
-- No insert/update policies: only the server (service role) writes these tables.
