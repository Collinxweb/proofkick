// Kick entries shown in feeds. These are testnet play-money kicks; each one is labelled as such.
export async function loadKickFeed(db, userIds) {
  let q = db.from("kick_entries").select("id, user_id, side, stake, status, payout, created_at, kick_rounds(asset, horizon, state, outcome)")
    .order("created_at", { ascending: false }).limit(20);
  if (userIds) {
    if (!userIds.length) return [];
    q = q.in("user_id", userIds);
  }
  const { data } = await q;
  const uids = [...new Set((data ?? []).map((e) => e.user_id))];
  const { data: profs } = uids.length ? await db.from("profiles").select("id, handle, avatar_url").in("id", uids) : { data: [] };
  const by = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
  return (data ?? []).map((e) => ({
    type: "kick", id: e.id, at: e.created_at, handle: by[e.user_id]?.handle ?? "user", avatar: by[e.user_id]?.avatar_url ?? null,
    side: e.side, stake: Number(e.stake), status: e.status, payout: e.payout != null ? Number(e.payout) : null,
    asset: e.kick_rounds?.asset, horizon: e.kick_rounds?.horizon, roundState: e.kick_rounds?.state, outcome: e.kick_rounds?.outcome,
  }));
}
