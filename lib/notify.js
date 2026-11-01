// Fan-out of "a caller you follow posted" notifications. Never blocks the call itself.
export async function notifyFollowers(db, userId, { pickId, match, selection }) {
  const [{ data: f }, { data: p }] = await Promise.all([
    db.from("user_follows").select("follower_id").eq("followee_id", userId),
    db.from("profiles").select("handle").eq("id", userId).maybeSingle(),
  ]);
  if (!f?.length) return;
  await db.from("notifications").insert(f.map((x) => ({ user_id: x.follower_id, kind: "call", payload: { handle: p?.handle, pickId, match, selection } })));
}
