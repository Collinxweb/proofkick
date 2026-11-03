"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAIR, ICON, pct, fmtPrice } from "@/components/kick/market-style";
import Countdown from "@/components/kick/Countdown";

// One 24H market. GREEN and RED stake KICK on the price closing up or down. Kicks are signed by the account, gas paid by the app.
export default function RoundCard({ r, canKick }) {
  const router = useRouter();
  const [side, setSide] = useState(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const total = r.long + r.short;
  const change = pct(r.openPrice, r.lastPrice);
  const open = r.canEnter;
  const icon = ICON[r.asset] ?? { text: r.asset, tint: "bg-white/20" };

  async function kick() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/kick/enter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ roundId: r.id, side, amount }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ bad: true, text: j.error });
    setMsg({ text: `Kicked ${j.amount} KICK ${side === "long" ? "GREEN" : "RED"}.` });
    setAmount(""); setSide(null);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-accent/25 bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-black ${icon.tint}`}>{icon.text}</span>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-white">{PAIR[r.asset] ?? r.asset}<span className="rounded-full border border-accent/40 px-2 py-0.5 text-[10px] text-accent">{r.horizon}</span></p>
            <p className="text-xl font-semibold text-white">${fmtPrice(r.lastPrice)}</p>
            <p className="text-[11px] text-white/50">Open: ${fmtPrice(r.openPrice)} {change != null && <span className={change >= 0 ? "text-accent" : "text-red-400"}>{change >= 0 ? "▲ +" : "▼ "}{change.toFixed(2)}%</span>}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${open ? "border-accent/50 text-accent" : "border-white/20 text-white/50"}`}>{open ? "● OPEN" : r.state === "open" ? "CLOSED" : r.state.toUpperCase()}</span>
          {open && <p className="mt-2 text-[10px] text-white/50">Entries close in</p>}
          {open && <p className="text-sm font-semibold text-white"><Countdown toMs={r.entryMs} /></p>}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-accent" style={{ width: `${total ? (r.long / total) * 100 : 50}%` }} />
          <div className="h-full bg-red-400" style={{ width: `${total ? (r.short / total) * 100 : 50}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-white/60">
          <span>GREEN {r.impliedLong ?? 50}% · {fmtPrice(r.long)} KICK</span>
          <span>RED {r.impliedShort ?? 50}% · {fmtPrice(r.short)} KICK</span>
        </div>
        <p className="mt-1 text-[10px] text-white/40">Momentum reading: {r.momentumUp != null ? `${r.momentumUp}% up` : "not available"}. An indicator, not a forecast.</p>
      </div>

      {open && canKick && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSide("long")} className={`rounded-full border py-2 text-xs font-semibold ${side === "long" ? "border-accent bg-accent/20 text-accent" : "border-accent/50 text-accent"}`}>GREEN ↑</button>
            <button onClick={() => setSide("short")} className={`rounded-full border py-2 text-xs font-semibold ${side === "short" ? "border-red-400 bg-red-400/15 text-red-400" : "border-red-400/50 text-red-400"}`}>RED ↓</button>
          </div>
          {side && (
            <div className="flex gap-2">
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="KICK to stake" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-accent" />
              <button disabled={busy || !amount} onClick={kick} className="rounded-xl bg-accent px-4 text-sm font-semibold text-black disabled:opacity-40">{busy ? "Kicking…" : "Kick"}</button>
            </div>)}
        </div>)}
      {open && !canKick && <p className="mt-3 text-[11px] text-white/50">Claim testnet KICK below to start kicking.</p>}
      {msg && <p className={`mt-2 break-words text-xs ${msg.bad ? "text-red-400" : "text-white/70"}`}>{msg.text}</p>}
    </div>
  );
}
