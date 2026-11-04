"use client";
import { useState } from "react";

// Sends feedback to GitHub issues. Nothing private is sent unless you choose to show your name.
export default function FeedbackForm() {
  const [kind, setKind] = useState("suggestion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showName, setShowName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  async function send(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, title, body, showName }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: j.error });
    setMsg({ ok: true, text: "Thank you. Your feedback is now a GitHub issue.", url: j.url });
    setTitle(""); setBody("");
  }
  const chip = (on) => `rounded-full border px-3 py-1.5 text-xs ${on ? "border-accent bg-accent/15 text-accent" : "border-white/15 text-white/70"}`;
  return (
    <form onSubmit={send} className="space-y-3 rounded-2xl border border-white/10 bg-panel p-4">
      <div><p className="text-sm font-semibold text-white">Feedback and suggestions</p>
        <p className="mt-1 text-xs text-white/50">Sent to our GitHub issues. Anyone can read them, so do not include personal details, keys or account info.</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setKind("suggestion")} className={chip(kind === "suggestion")}>Suggestion</button>
        <button type="button" onClick={() => setKind("bug")} className={chip(kind === "bug")}>Bug</button>
      </div>
      <input required minLength={5} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short title" className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-accent" />
      <textarea required minLength={10} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What happened, or what would help?" className="h-28 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-accent" />
      <label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} />Show my username on the issue</label>
      {msg && <p className={`text-xs ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}{msg.url && <a className="ml-1 underline" href={msg.url} target="_blank" rel="noreferrer">View issue</a>}</p>}
      <button disabled={busy} className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50">{busy ? "Sending..." : "Send feedback"}</button>
    </form>
  );
}
