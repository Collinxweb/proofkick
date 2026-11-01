"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleLike } from "@/app/social-actions";

export default function LikeButton({ pickId, count, liked }) {
  const [n, setN] = useState(count), [on, setOn] = useState(liked), [msg, setMsg] = useState("");
  async function click() {
    const r = await toggleLike(pickId);
    if (r?.error) return setMsg(r.error);
    setMsg(""); setOn(r.liked); setN((x) => x + (r.liked ? 1 : -1));
  }
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <button onClick={click} className={`inline-flex items-center gap-1 ${on ? "text-accent" : "text-white/60"}`}><Heart size={14} fill={on ? "currentColor" : "none"} />{n}</button>
      {msg && <span className="text-red-400">{msg}</span>}
    </span>
  );
}
