-- Fixed-odds withdrawals: remember which ticket each kick used, and the transaction that withdrew it.
alter table kick_entries add column if not exists ticket_object_id text;
alter table kick_entries add column if not exists redeemed_testnet_tx text;
