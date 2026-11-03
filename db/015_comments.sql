-- Comments on calls and multis (a multi's comments attach to its first leg). Append-only: no edits, no deletes.
create table if not exists call_comments (
  id uuid primary key default gen_random_uuid(),
  pick_id uuid not null references picks(id),
  user_id uuid not null references profiles(id),
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists call_comments_pick_idx on call_comments (pick_id, created_at);
create or replace function forbid_delete_comment() returns trigger language plpgsql as $$
begin raise exception 'comments cannot be deleted'; end $$;
drop trigger if exists no_delete_comments on call_comments;
create trigger no_delete_comments before delete on call_comments for each row execute function forbid_delete_comment();
alter table call_comments enable row level security;
drop policy if exists "comments read" on call_comments;
create policy "comments read" on call_comments for select using (true);
