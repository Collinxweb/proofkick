"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/social-actions";

export default function FollowButton({ userId, following }) {
  const router = useRouter();
  const [on, setOn] = useState(following);
  const [busy, setBusy] = useState(false);
  async function click() {
    setBusy(true);
    const r = await toggleFollow(userId);
    setBusy(false);
    if (!r?.error) { setOn(r.following); router.refresh(); }
  }
  return (
    <button onClick={click} disabled={busy} className={`rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50 ${on ? "border border-white/20 text-white/70" : "bg-accent text-black"}`}>
      {on ? "Following" : "Follow"}
    </button>
  );
}
