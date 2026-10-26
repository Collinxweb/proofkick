-- Personal fields (name, date of birth, country, wallet) must not be readable with the public key.
revoke select on profiles from anon, authenticated;
grant select (id, handle, avatar_url, caution_accepted_at, profile_completed_at, created_at) on profiles to anon, authenticated;
