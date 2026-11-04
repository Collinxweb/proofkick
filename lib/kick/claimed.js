// An account has claimed when the app recorded a claim, or when testnet KICK is already in its address (a wallet claim).
export const hasClaimed = (profile, units) => Boolean(profile?.kick_claimed_at) || (units ?? 0) > 0;
