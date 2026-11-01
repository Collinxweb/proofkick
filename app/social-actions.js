"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function toggleFollow(userId) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return { error: "Sign in first." };
  if (user.id === userId) return { error: "You can't follow yourself." };
  const db = supabaseAdmin();
  const { data: ex } = await db.from("user_follows").select("follower_id").eq("follower_id", user.id).eq("followee_id", userId).maybeSingle();
  if (ex) {
    await db.from("user_follows").delete().eq("follower_id", user.id).eq("followee_id", userId);
    return { following: false };
  }
  const { error } = await db.from("user_follows").insert({ follower_id: user.id, followee_id: userId });
  return error ? { error: error.message } : { following: true };
}

// Likes exist only on graded calls (so nobody can pump a call before the result) and never on your own.
export async function toggleLike(pickId) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return { error: "Sign in first." };
  const db = supabaseAdmin();
  const { data: p } = await db.from("picks").select("user_id, status, fixtures(home_team, away_team)").eq("id", pickId).maybeSingle();
  if (!p) return { error: "Call not found." };
  if (p.user_id === user.id) return { error: "You can't like your own call." };
  if (!["won", "lost"].includes(p.status)) return { error: "You can like a call once it has been graded." };
  const { data: ex } = await db.from("call_likes").select("pick_id").eq("user_id", user.id).eq("pick_id", pickId).maybeSingle();
  if (ex) { await db.from("call_likes").delete().eq("user_id", user.id).eq("pick_id", pickId); return { liked: false }; }
  const { error } = await db.from("call_likes").insert({ user_id: user.id, pick_id: pickId });
  if (error) return { error: error.message };
  const { data: me } = await db.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  await db.from("notifications").insert({ user_id: p.user_id, kind: "like", payload: { handle: me?.handle, pickId, match: `${p.fixtures?.home_team} vs ${p.fixtures?.away_team}` } });
  return { liked: true };
}

export async function markNotificationsRead() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return;
  await supabaseAdmin().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
}
