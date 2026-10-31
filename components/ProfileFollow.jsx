"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import FollowButton from "@/components/FollowButton";

// The public profile page is cached, so the follow state is looked up in the browser for the signed-in viewer.
export default function ProfileFollow({ userId }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();
      const { data: { user } } = await sb.auth.getUser();
      if (!user || user.id === userId) return;
      const { data } = await sb.from("user_follows").select("followee_id").eq("follower_id", user.id).eq("followee_id", userId).maybeSingle();
      setState({ following: Boolean(data) });
    })();
  }, [userId]);
  return state ? <FollowButton userId={userId} following={state.following} /> : null;
}
