"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";

// Shares a multi ticket by its public link. Uses the phone's share sheet when available, otherwise WhatsApp, Telegram or X.
export default function ShareSlip({ slipId, text }) {
  const [done, setDone] = useState(false);
  const url = () => `${window.location.origin}/t/${slipId}`;
  async function share() {
    const link = url();
    try {
      if (navigator.share) { await navigator.share({ title: "ProofKick multi", text, url: link }); return; }
      await navigator.clipboard.writeText(`${text} ${link}`);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {}
  }
  const open = (base) => window.open(base(encodeURIComponent(`${text} ${url()}`), encodeURIComponent(url()), encodeURIComponent(text)), "_blank", "noopener");
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-[11px]">
      <button onClick={share} className="flex items-center gap-1 rounded-full border border-accent/50 px-3 py-1.5 font-semibold text-accent"><Share2 size={12} />{done ? "Link copied" : "Share"}</button>
      <button onClick={() => open((t) => `https://wa.me/?text=${t}`)} className="rounded-full border border-white/15 px-3 py-1.5 text-white/70">WhatsApp</button>
      <button onClick={() => open((_, u, x) => `https://t.me/share/url?url=${u}&text=${x}`)} className="rounded-full border border-white/15 px-3 py-1.5 text-white/70">Telegram</button>
      <button onClick={() => open((_, u, x) => `https://twitter.com/intent/tweet?text=${x}&url=${u}`)} className="rounded-full border border-white/15 px-3 py-1.5 text-white/70">X</button>
    </div>
  );
}
