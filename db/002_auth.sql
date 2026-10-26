-- Run after 001_schema.sql
alter table profiles add column if not exists caution_accepted_at timestamptz;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, handle)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 8))
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create policy update_own_profile on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
