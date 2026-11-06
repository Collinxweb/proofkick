-- Run once after a fresh publish: the new KICK token is claimable again.
update profiles set kick_claimed_at = null where kick_claimed_at is not null;
