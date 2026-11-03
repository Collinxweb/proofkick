"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { addComment } from "@/app/social-actions";
import Avatar from "@/components/Avatar";

export default function CommentThread({ pickId, comments = [] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await addComment(pickId, text);
    setBusy(false);
    if (r?.error) return setErr(r.error);
    setText("");
    router.refresh();
  }

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs text-white/60">
        <MessageCircle size={14} />{comments.length} {comments.length === 1 ? "comment" : "comments"}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-xs">
              <Avatar url={c.avatar} name={c.handle} size={18} />
              <p className="min-w-0"><Link href={`/u/${c.handle}`} className="font-semibold text-white">@{c.handle}</Link> <span className="text-white/75">{c.body}</span></p>
            </div>))}
          <form onSubmit={send} className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={280} placeholder="Add a comment"
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-accent" />
            <button disabled={busy || !text.trim()} className="rounded-full bg-accent px-3 text-xs font-semibold text-black disabled:opacity-40">Send</button>
          </form>
          {err && <p className="text-[11px] text-red-400">{err}</p>}
        </div>)}
    </div>
  );
}
