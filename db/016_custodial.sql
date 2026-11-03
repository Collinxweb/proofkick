-- Account-held testnet addresses for users without a wallet. The address is derived from a server secret, not stored.
alter table profiles add column if not exists kick_address text;
alter table profiles add column if not exists kick_claimed_at timestamptz;
create unique index if not exists profiles_kick_address_key on profiles (kick_address) where kick_address is not null;
