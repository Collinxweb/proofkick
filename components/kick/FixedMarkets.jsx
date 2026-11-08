"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ASSET = { BTC: "BTC/USD", ETH: "ETH/USD", PAXG: "XAU/PAXG" };

// Fixed-odds markets: the chance is quoted when you kick, and the payout is fixed at that moment.
export default function FixedMarkets({ rounds = [], canKick }) {
  const router = useRouter();
  const open = rounds.filter((r) => r.state === "open" && r.canEnter);
  const [sel, setSel] = useState(null);
  const [quote, setQuote] = useState(null);
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function preview(roundId, side) {
    setSel({ roundId, side }); setQuote(null); setMsg(null);
    const r = await fetch("/api/kick/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ roundId, side }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg({ ok: false, text: j.error ?? "Could not get a price." });
    setQuote(j);
  }

  async function kick() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/kick/fixed/enter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ roundId: sel.roundId, side: sel.side, amount }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: j.error ?? "The kick did not go through." });
    setMsg({ ok: true, text: `Kicked ${j.amount} KICK at a ${j.chancePct}% chance. Pays ${j.payout} if it wins.` });
    setSel(null); setQuote(null);
    router.refresh();
  }

  if (!open.length) return null;
  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-white">Fixed odds</p>
      {open.map((r) => (
        <div key={r.id} className="rounded-2xl border border-white/10 bg-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{ASSET[r.asset] ?? r.asset} · 24H</p>
            <span className="text-[10px] text-white/50">Entries close 5 min before expiry</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button disabled={!canKick} onClick={() => preview(r.id, "long")} className="rounded-full border border-accent py-2 text-sm text-accent disabled:opacity-40">GREEN ↑</button>
            <button disabled={!canKick} onClick={() => preview(r.id, "short")} className="rounded-full border border-red-400 py-2 text-sm text-red-400 disabled:opacity-40">RED ↓</button>
          </div>
          {sel?.roundId === r.id && quote && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-white/70">Current chance {quote.chancePct}%. Pays about {quote.payoutPer1000} per 1000 KICK staked, fixed when you kick.</p>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white outline-none focus:border-accent" />
              <button disabled={busy} onClick={kick} className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-black disabled:opacity-50">{busy ? "Kicking…" : "Kick"}</button>
            </div>
          )}
          {sel?.roundId === r.id && !quote && !msg && <p className="mt-3 text-xs text-white/50">Getting the price…</p>}
          {sel?.roundId === r.id && msg && <p className={`mt-3 text-xs ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
        </div>))}
      {!msg && !sel && <p className="text-[11px] text-white/45">Chances move with the price. The chance and payout are fixed at the moment you kick. Play money, testnet.</p>}
      {msg && !sel && <p className={`text-xs ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}
