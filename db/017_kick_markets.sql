-- Kick markets: allow entry and redeem transactions in the sponsored-transaction log, and index entries by account.
alter table kick_sponsored_txs drop constraint if exists kick_sponsored_txs_kind_check;
alter table kick_sponsored_txs add constraint kick_sponsored_txs_kind_check check (kind in ('claim','kick','redeem'));
create index if not exists kick_entries_user_round_idx on kick_entries (user_id, round_id);
