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
