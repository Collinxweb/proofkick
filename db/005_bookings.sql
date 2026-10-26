-- Manual bookings: a user selects fixtures on /browse and books them as one slip.
-- Separate from strategy `picks` so the rules engine and pick lock triggers stay untouched.
-- Run once in the Supabase SQL editor after 004_privacy.sql.

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  operator text not null check (operator in ('sportybet','bet9ja')),
  code text not null,
  combined_odds numeric(8,2) not null,
  mocked boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists bookings_user_idx on bookings (user_id, created_at desc);

create table if not exists booking_picks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  fixture_id uuid not null references fixtures(id),
  selection text not null check (selection in ('home','draw','away')),
  odds numeric(8,3) not null check (odds > 1),
  created_at timestamptz not null default now()
);
create index if not exists booking_picks_booking_idx on booking_picks (booking_id);

-- Bookings are append-only, like picks.
create trigger no_delete_bookings before delete on bookings
  for each row execute function forbid_delete();
create trigger no_delete_booking_picks before delete on booking_picks
  for each row execute function forbid_delete();

alter table bookings enable row level security;
alter table booking_picks enable row level security;

-- Owners read their own slips. Inserts go through the server action with the service role.
create policy read_own_bookings on bookings for select using (user_id = auth.uid());
create policy read_own_booking_picks on booking_picks for select using (
  exists (select 1 from bookings b where b.id = booking_id and b.user_id = auth.uid())
);
grant select on bookings, booking_picks to authenticated;
