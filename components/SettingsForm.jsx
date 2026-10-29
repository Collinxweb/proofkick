"use client";
import { useState } from "react";
import Link from "next/link";
import { saveSettings } from "@/app/settings-actions";

const field = "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-accent";

export default function SettingsForm({ initial }) {
  const [handle, setHandle] = useState(initial.handle ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const res = await saveSettings({ handle, bio });
    setBusy(false);
    setMsg(res?.error ? { bad: true, text: res.error } : { text: `Saved. Your public page is /s/${res.handle}` });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-xs text-white/50">Username
        <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-black/40 focus-within:border-accent">
          <span className="pl-4 text-white/40">@</span>
          <input required className="w-full bg-transparent px-2 py-3 text-white outline-none" value={handle} maxLength={20} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
        </div></label>
      <p className="-mt-2 text-xs text-white/40">3 to 20 characters. Changing it changes the link of your public statement.</p>
      <label className="block text-xs text-white/50">Bio
        <textarea className={`${field} mt-1 h-28 resize-none`} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people how you pick matches" /></label>
      <p className="-mt-2 text-right text-xs text-white/40">{bio.length}/160</p>
      {msg && <p className={`text-sm ${msg.bad ? "text-red-400" : "text-accent"}`}>{msg.text}</p>}
      <button disabled={busy} className="w-full rounded-full bg-accent py-3.5 font-semibold text-black disabled:opacity-50">{busy ? "Saving..." : "Save"}</button>
      <Link href="/profile" className="block text-center text-sm text-white/50 underline">Back to profile</Link>
    </form>
  );
}
