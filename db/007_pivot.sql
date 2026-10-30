alter table picks add column if not exists grader text;
create table if not exists user_follows (
  follower_id uuid not null references profiles(id),
  followee_id uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
alter table user_follows enable row level security;
drop policy if exists "follows read" on user_follows;
create policy "follows read" on user_follows for select using (true);
create index if not exists user_follows_followee_idx on user_follows (followee_id);
