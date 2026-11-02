-- Slips: a recorded or staked call, single (one leg) or multi (several legs).
-- Existing picks are NOT changed. A pick with no slip is treated as a recorded single.
-- Settled legs and slips cannot be deleted; core fields cannot change once settled.
-- Corrections are append-only rows in grade_corrections, so the original result is always preserved.

create table if not exists slips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  kind text not null check (kind in ('single','multi')),
  stake numeric(20,2) check (stake is null or stake > 0),   -- null = recorded call, no money
  status text not null default 'pending' check (status in ('pending','won','lost','void')),
  gross_payout numeric(20,2),
  net_units numeric(20,2),
  original_status text check (original_status in ('won','lost','void')),   -- set once, on first correction
  original_gross_payout numeric(20,2),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists slip_legs (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid not null references slips(id),
  pick_id uuid not null unique references picks(id),   -- a pick belongs to at most one slip
  position int not null,
  result text not null default 'pending' check (result in ('pending','won','lost','void')),  -- grade at settlement
  applied_odds numeric(8,3),
  unique (slip_id, position)
);

create table if not exists grade_corrections (
  id uuid primary key default gen_random_uuid(),
  slip_leg_id uuid not null references slip_legs(id),
  previous_result text not null check (previous_result in ('pending','won','lost','void')),
  new_result text not null check (new_result in ('won','lost','void')),
  reason text not null check (length(reason) between 3 and 300),
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists slips_user_idx on slips (user_id, created_at desc);
create index if not exists slip_legs_slip_idx on slip_legs (slip_id);
create index if not exists grade_corrections_leg_idx on grade_corrections (slip_leg_id, created_at desc);

create or replace function forbid_delete_slip_rows() returns trigger language plpgsql as $$
begin raise exception 'rows in % cannot be deleted', tg_table_name; end $$;
drop trigger if exists no_delete_slips on slips;
create trigger no_delete_slips before delete on slips for each row execute function forbid_delete_slip_rows();
drop trigger if exists no_delete_slip_legs on slip_legs;
create trigger no_delete_slip_legs before delete on slip_legs for each row execute function forbid_delete_slip_rows();
drop trigger if exists no_delete_corrections on grade_corrections;
create trigger no_delete_corrections before delete on grade_corrections for each row execute function forbid_delete_slip_rows();

create or replace function slips_guard() returns trigger language plpgsql as $$
begin
  if old.status <> 'pending' and (new.stake is distinct from old.stake or new.kind is distinct from old.kind or new.user_id is distinct from old.user_id) then
    raise exception 'stake and kind are locked once a slip is settled';
  end if;
  return new;
end $$;
drop trigger if exists slips_guard_trg on slips;
create trigger slips_guard_trg before update on slips for each row execute function slips_guard();

create or replace function slip_legs_guard() returns trigger language plpgsql as $$
begin
  if new.slip_id is distinct from old.slip_id or new.pick_id is distinct from old.pick_id then
    raise exception 'a leg cannot move between slips or change its pick';
  end if;
  return new;
end $$;
drop trigger if exists slip_legs_guard_trg on slip_legs;
create trigger slip_legs_guard_trg before update on slip_legs for each row execute function slip_legs_guard();

alter table slips enable row level security;
alter table slip_legs enable row level security;
alter table grade_corrections enable row level security;
drop policy if exists "slips read" on slips;
create policy "slips read" on slips for select using (true);
drop policy if exists "slip legs read" on slip_legs;
create policy "slip legs read" on slip_legs for select using (true);
drop policy if exists "corrections read" on grade_corrections;
create policy "corrections read" on grade_corrections for select using (true);
-- No insert/update policies: only the server (service role) writes these tables.
