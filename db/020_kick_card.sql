-- The price at the moment of the kick, shown on the kick card. Older kicks have no price and show a dash.
alter table kick_entries add column if not exists entry_price numeric(20,8);
