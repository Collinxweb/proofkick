"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import Avatar, { PRESETS } from "@/components/Avatar";
import { COUNTRIES } from "@/lib/countries";
import { saveProfile } from "@/app/actions";
import { supabaseBrowser } from "@/lib/supabase/client";

async function toJpeg(file) {
  const img = await createImageBitmap(file);
  const m = Math.min(img.width, img.height), c = document.createElement("canvas");
  c.width = c.height = 256;
  c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 256, 256);
  return new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
}
const field = "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-accent";

export default function ProfileGate({ open, userId }) {
  const router = useRouter();
  const [f, setF] = useState({ fullName: "", dob: "", country: "", preset: 0 });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const max = new Date(); max.setFullYear(max.getFullYear() - 18);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const preview = file ? URL.createObjectURL(file) : `preset:${f.preset}`;

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      let avatar = `preset:${f.preset}`;
      if (file) {
        const sb = supabaseBrowser(), path = `${userId}/avatar.jpg`;
        const { error } = await sb.storage.from("avatars").upload(path, await toJpeg(file), { upsert: true, contentType: "image/jpeg" });
        if (error) throw new Error(error.message);
        avatar = `${sb.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      }
      const res = await saveProfile({ fullName: f.fullName, dob: f.dob, country: f.country, avatar });
      if (res?.error) throw new Error(res.error);
      router.refresh();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 sm:items-center">
      <form onSubmit={submit} className="max-h-[94dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl border border-white/10 bg-panel p-5 sm:rounded-3xl">
        <div><h2 className="text-xl font-semibold text-white">Complete your profile</h2><p className="text-sm text-white/50">Required before you continue. You must be 18 or older.</p></div>
        <div className="flex items-center gap-4">
          <Avatar url={preview} name={f.fullName || "?"} size={64} />
          <div className="space-y-2">
            <div className="flex gap-2">{PRESETS.map((_, i) => (
              <button type="button" key={i} onClick={() => { setFile(null); setF({ ...f, preset: i }); }} className={`rounded-full ${!file && f.preset === i ? "ring-2 ring-accent" : ""}`}><Avatar url={`preset:${i}`} name="" size={26} /></button>))}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-accent"><Camera size={16} />Upload a photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          </div>
        </div>
        <input required className={field} placeholder="Full name" value={f.fullName} onChange={set("fullName")} maxLength={60} />
        <label className="block text-xs text-white/50">Date of birth
          <input required type="date" className={`${field} mt-1`} max={max.toISOString().slice(0, 10)} value={f.dob} onChange={set("dob")} /></label>
        <select required className={field} value={f.country} onChange={set("country")}>
          <option value="">Country</option>{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={busy} className="w-full rounded-full bg-accent py-3.5 font-semibold text-black disabled:opacity-50">{busy ? "Saving..." : "Save and continue"}</button>
      </form>
    </div>
  );
}
