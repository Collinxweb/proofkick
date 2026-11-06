"use client";
import { useState } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

const LABEL = { home: "Home", draw: "Draw", away: "Away" };

// The multi tray. Collapsed, it shows only the number of selections. Opened, it lists them all and locks the slip.
// Locking is done in steps. Proofs are slow, so they run in the background and never fail the lock.
export default function SlipTray({ legs, onRemove, onDone }) {
  const [open, setOpen] = useState(false);
  const [stake, setStake] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [msg, setMsg] = useState(null);
  const combined = legs.reduce((p, l) => p * Number(l.odds), 1);

  async function post(url, body) {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? `server returned ${r.status}`);
    return j;
  }

  async function lockSlip() {
    setBusy(true); setMsg(null);
    const pickIds = [];
    let current = "Locking";
    try {
      for (const l of legs) {
        current = `Locking ${l.label}`;
        setStep(current);
        const lock = await post("/api/picks/lock", { fixtureId: l.fixtureId, selection: l.selection, note: "" });
        pickIds.push(lock.pickId);
      }
      current = "Creating the multi";
      setStep(current);
      const slip = await post("/api/slips", { pickIds, stake: stake.trim() === "" ? null : stake.trim() });
      for (const id of pickIds) {
        fetch("/api/picks/prove", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pickId: id }) }).catch(() => {});
      }
      setMsg({ ok: true, text: `${slip.kind === "multi" ? "Multi" : "Single"} locked${slip.stake ? ` with a stake of ${stake}` : " as a recorded call (no stake)"}. Proofs are saving in the background.` });
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: `${current} failed: ${e.message}. Any legs already locked stay on your record as single calls.` });
    }
    setStep("");
    setBusy(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 mx-auto w-full max-w-md md:max-w-2xl px-4">
      <div className="rounded-2xl border border-accent/40 bg-panel shadow-xl">
        <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-4 text-left">
          <span className="text-sm font-semibold text-white">Multi · {legs.length} {legs.length === 1 ? "selection" : "selections"}</span>
          <span className="flex items-center gap-2 text-xs text-white/60">
            {legs.length > 1 && `Combined ${combined.toFixed(2)}`}
            {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        </button>
        {open && (
          <div className="max-h-[55dvh] space-y-3 overflow-y-auto px-4 pb-4">
            <div className="space-y-1">
              {legs.map((l) => (
                <div key={l.fixtureId} className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-xs">
                  <span className="min-w-0 truncate text-white/80">{l.label} · {LABEL[l.selection]} @ {Number(l.odds).toFixed(2)}</span>
                  <button onClick={() => onRemove(l.fixtureId)} aria-label="Remove selection" className="ml-2 text-white/50"><X size={14} /></button>
                </div>))}
            </div>
            <label className="block text-[11px] text-white/50">Stake (optional, leave empty to record without money)
              <input inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="e.g. 10.00" className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none focus:border-accent" />
            </label>
            <p className="text-[11px] text-white/40">Locking the multi locks every selection. A selection that loses loses the multi.</p>
            {busy && step && <p className="text-xs text-white/60">{step}…</p>}
            {msg && <p className={`text-xs ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
            <button disabled={busy || legs.length < 1} onClick={lockSlip} className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50">{busy ? "Locking…" : "Lock multi"}</button>
          </div>)}
      </div>
    </div>
  );
}
