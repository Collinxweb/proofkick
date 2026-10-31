alter table fixtures add column if not exists closing_odds jsonb;
alter table fixtures add column if not exists closing_at timestamptz;
