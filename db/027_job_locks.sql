-- One lock per job step, so each step runs alone and a stuck step can't block the others.
insert into kick_job_lock (name) values ('settle'), ('open'), ('fixed'), ('records'), ('reset') on conflict (name) do nothing;
