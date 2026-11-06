-- Round kind: pool rounds (existing) and fixed-odds rounds (new).
alter table kick_rounds add column if not exists kind text not null default 'pool';
alter table kick_rounds drop constraint if exists kick_rounds_kind_check;
alter table kick_rounds add constraint kick_rounds_kind_check check (kind in ('pool','fixed'));
