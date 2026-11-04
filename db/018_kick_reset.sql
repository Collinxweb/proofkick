-- Archived rounds are kept (their entries still settle) but are no longer shown as markets.
alter table kick_rounds add column if not exists archived boolean not null default false;
