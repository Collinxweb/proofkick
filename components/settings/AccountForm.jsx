"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import Avatar, { PRESETS } from "@/components/Avatar";
import { COUNTRIES } from "@/lib/countries";
import { saveAccount } from "@/app/settings-actions";
import { supabaseBrowser } from "@/lib/supabase/client";

const field = "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-accent";

async function toJpeg(file) {
  const img = await createImageBitmap(file);
  const m = Math.min(img.width, img.height), c = document.createElement("canvas");
  c.width = c.height = 256;
  c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 256, 256);
  return new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
}

// One form for everything about the account: photo, name, date of birth, country, username and bio.
export default function AccountForm({ userId, initial }) {
  const router = useRouter();
  const max = new Date(); max.setFullYear(max.getFullYear() - 18);
  const [f, setF] = useState({
    handle: initial.handle ?? "", bio: initial.bio ?? "", fullName: initial.fullName ?? "", dob: initial.dob ?? "", country: initial.country ?? "",
    preset: /^preset:\d$/.test(initial.avatar ?? "") ? Number(initial.avatar.slice(7)) : 0,
  });
  const [file, setFile] = useState(null);
  const [keep, setKeep] = useState(Boolean(initial.avatar?.startsWith("http")));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: k === "handle" ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") : e.target.value });
  const preview = file ? URL.createObjectURL(file) : keep ? initial.avatar : `preset:${f.preset}`;

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      let avatar = keep && !file ? initial.avatar : `preset:${f.preset}`;
      if (file) {
        const sb = supabaseBrowser(), path = `${userId}/avatar.jpg`;
        const { error } = await sb.storage.from("avatars").upload(path, await toJpeg(file), { upsert: true, contentType: "image/jpeg" });
        if (error) throw new Error(error.message);
        avatar = `${sb.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      }
      const res = await saveAccount({ handle: f.handle, bio: f.bio, fullName: f.fullName, dob: f.dob, country: f.country, avatar });
      if (res?.error) throw new Error(res.error);
      setMsg({ ok: true, text: `Saved. Your public page is /u/${res.handle}` });
      router.refresh();
    } catch (x) { setMsg({ ok: false, text: x.message }); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar url={preview} name={f.handle || "?"} size={64} />
        <div className="space-y-2">
          <div className="flex gap-2">{PRESETS.map((_, i) => (
            <button type="button" key={i} onClick={() => { setFile(null); setKeep(false); setF({ ...f, preset: i }); }} className={`rounded-full ${!file && !keep && f.preset === i ? "ring-2 ring-accent" : ""}`}><Avatar url={`preset:${i}`} name="" size={26} /></button>))}</div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-accent"><Camera size={16} />Upload a photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setKeep(false); }} /></label>
        </div>
      </div>
      <label className="block text-xs text-white/50">Full name<input required maxLength={60} className={`${field} mt-1`} value={f.fullName} onChange={set("fullName")} /></label>
      <label className="block text-xs text-white/50">Date of birth (18 or older)<input required type="date" max={max.toISOString().slice(0, 10)} className={`${field} mt-1`} value={f.dob} onChange={set("dob")} /></label>
      <label className="block text-xs text-white/50">Country
        <select required className={`${field} mt-1`} value={f.country} onChange={set("country")}>
          <option value="">Choose a country</option>{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select></label>
      <label className="block text-xs text-white/50">Username
        <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-black/40 focus-within:border-accent">
          <span className="pl-4 text-white/40">@</span>
          <input required minLength={3} maxLength={20} className="w-full bg-transparent px-2 py-3 text-white outline-none" value={f.handle} onChange={set("handle")} />
        </div>
        <span className="mt-1 block text-[11px] text-white/40">3 to 20 letters, numbers or underscores. Changing it changes your public link.</span>
      </label>
      <label className="block text-xs text-white/50">Bio
        <textarea maxLength={160} className={`${field} mt-1 h-24 resize-none`} value={f.bio} onChange={set("bio")} placeholder="Tell people how you pick matches" />
        <span className="mt-1 block text-right text-[11px] text-white/40">{f.bio.length}/160</span>
      </label>
      {msg && <p className={`text-sm ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
      <button disabled={busy} className="w-full rounded-full bg-accent py-3.5 font-semibold text-black disabled:opacity-50">{busy ? "Saving..." : "Save profile"}</button>
    </form>
  );
}
