-- Kick rounds: link each round to its on-chain object. Safe to run once.
alter table kick_rounds add column if not exists chain_object_id text;
