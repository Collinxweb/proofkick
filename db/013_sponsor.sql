-- Sponsored (gas-paid-by-app) Kick transactions. Each server-built transaction is recorded once and can be submitted once.
create table if not exists kick_sponsored_txs (
  id uuid primary key default gen_random_uuid(),
  sender text not null,
  kind text not null check (kind in ('claim')),
  bytes_hash text not null unique,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists kick_sponsored_txs_day_idx on kick_sponsored_txs (kind, created_at);
alter table kick_sponsored_txs enable row level security;
-- No policies: only the server (service role) reads or writes this table.
