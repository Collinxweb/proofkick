create table if not exists call_likes (
  user_id uuid not null references profiles(id),
  pick_id uuid not null references picks(id),
  created_at timestamptz not null default now(),
  primary key (user_id, pick_id)
);
alter table call_likes enable row level security;
drop policy if exists "likes read" on call_likes;
create policy "likes read" on call_likes for select using (true);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  kind text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
alter table notifications enable row level security;
drop policy if exists "notif read own" on notifications;
create policy "notif read own" on notifications for select using (user_id = auth.uid());
alter publication supabase_realtime add table notifications;
