alter table profiles add column if not exists bio text;
grant select (bio) on profiles to anon, authenticated;
create unique index if not exists profiles_handle_lower on profiles (lower(handle));
alter table fixtures add column if not exists context jsonb;
