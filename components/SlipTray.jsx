"use client";
import { useState } from "react";
import { X } from "lucide-react";

const LABEL = { home: "Home", draw: "Draw", away: "Away" };

// Collects legs on the page; nothing is locked until "Lock slip". Each leg is locked as a pick first, then the slip is created.
export default function SlipTray({ legs, onRemove, onDone }) {
  const [stake, setStake] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const combined = legs.reduce((p, l) => p * Number(l.odds), 1);

  async function post(url, body) {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
    return j;
  }

  async function lockSlip() {
    setBusy(true); setMsg(null);
    const pickIds = [];
    try {
      for (const l of legs) {
        const lock = await post("/api/picks/lock", { fixtureId: l.fixtureId, selection: l.selection, note: "" });
        pickIds.push(lock.pickId);
        try { await post("/api/picks/prove", { pickId: lock.pickId }); } catch {}
      }
      const slip = await post("/api/slips", { pickIds, stake: stake.trim() === "" ? null : stake.trim() });
      setMsg({ ok: true, text: `${slip.kind === "multi" ? "Multi" : "Single"} locked${slip.stake ? ` with a stake of ${stake}` : " as a recorded call (no stake)"}.` });
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: `${e.message}. Any legs already locked stay on your record as single calls.` });
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 mx-auto w-full max-w-md md:max-w-2xl px-4">
      <div className="max-h-[60dvh] space-y-3 overflow-y-auto rounded-2xl border border-accent/40 bg-panel p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Your slip · {legs.length} {legs.length === 1 ? "leg" : "legs"}</p>
          {legs.length > 1 && <p className="text-xs text-white/50">Combined odds {combined.toFixed(2)}</p>}
        </div>
        <div className="space-y-1">
          {legs.map((l) => (
            <div key={l.fixtureId} className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-xs">
              <span className="min-w-0 truncate text-white/80">{l.label} · {LABEL[l.selection]} @ {Number(l.odds).toFixed(2)}</span>
              <button onClick={() => onRemove(l.fixtureId)} aria-label="Remove leg" className="ml-2 text-white/50"><X size={14} /></button>
            </div>))}
        </div>
        <label className="block text-[11px] text-white/50">Stake (optional, leave empty to record without money)
          <input inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="e.g. 10.00" className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none focus:border-accent" />
        </label>
        <p className="text-[11px] text-white/40">Locking the slip locks every leg. Results are graded from the match data, and a leg that loses loses the slip.</p>
        {msg && <p className={`text-xs ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
        <button disabled={busy || legs.length < 1} onClick={lockSlip} className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50">{busy ? "Locking..." : "Lock slip"}</button>
      </div>
    </div>
  );
}
