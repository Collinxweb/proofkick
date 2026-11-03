// Loads slips (multis) and the likes and comments for a set of calls. Reads use the signed-in user's session.
export async function loadSlips(s, pickIds) {
  if (!pickIds.length) return [];
  const { data: links } = await s.from("slip_legs").select("slip_id").in("pick_id", pickIds);
  const slipIds = [...new Set((links ?? []).map((l) => l.slip_id))];
  if (!slipIds.length) return [];
  const [{ data: slips }, { data: legs }] = await Promise.all([
    s.from("slips").select("id, kind, stake, status, gross_payout").in("id", slipIds),
    s.from("slip_legs").select("slip_id, position, picks(id, user_id, selection, odds_taken, status, locked_at, fixtures(home_team, away_team, kickoff_at, league))").in("slip_id", slipIds),
  ]);
  return (slips ?? []).map((sl) => ({
    id: sl.id, kind: sl.kind, stake: sl.stake, status: sl.status, grossPayout: sl.gross_payout,
    legs: (legs ?? []).filter((l) => l.slip_id === sl.id).map((l) => ({ position: l.position, pick: l.picks })),
  }));
}

export async function loadSocial(s, pickIds, userId) {
  const likes = {}, comments = {};
  if (!pickIds.length) return { likes, comments };
  const [{ data: lk }, { data: cm }] = await Promise.all([
    s.from("call_likes").select("pick_id, user_id").in("pick_id", pickIds),
    s.from("call_comments").select("id, pick_id, body, created_at, profiles(handle, avatar_url)").in("pick_id", pickIds).order("created_at", { ascending: true }).limit(500),
  ]);
  for (const l of lk ?? []) {
    const e = (likes[l.pick_id] ??= { count: 0, liked: false });
    e.count++;
    if (l.user_id === userId) e.liked = true;
  }
  for (const c of cm ?? []) {
    (comments[c.pick_id] ??= []).push({ id: c.id, body: c.body, at: c.created_at, handle: c.profiles?.handle ?? "user", avatar: c.profiles?.avatar_url ?? null });
  }
  return { likes, comments };
}
