-- One daily Kick run at a time. A run takes the lock for two minutes, and releases it when it finishes.
create table if not exists kick_job_lock (
  name text primary key,
  locked_until timestamptz not null default '1970-01-01 00:00:00+00'
);
insert into kick_job_lock (name) values ('daily') on conflict (name) do nothing;
alter table kick_job_lock enable row level security;
