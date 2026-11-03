"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";

const ASSET = { BTC: "Bitcoin", ETH: "Ethereum", PAXG: "Gold (PAXG)" };
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }));
const clock = (ms) => new Date(ms).toISOString().slice(11, 16) + " UTC";

export default function RoundCard({ r, canKick }) {
  const router = useRouter();
  const [side, setSide] = useState(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const total = r.long + r.short;

  async function kick() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/kick/enter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ roundId: r.id, side, amount }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ bad: true, text: j.error });
    setMsg({ text: `Kicked ${j.amount} KICK ${side === "long" ? "GREEN" : "RED"}. Testnet tx ${j.testnetTx.slice(0, 10)}…${j.receipt && !j.receipt.startsWith("failed") ? ` · mainnet receipt ${j.receipt.slice(0, 10)}…` : ""}` });
    setAmount(""); setSide(null);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>{ASSET[r.asset] ?? r.asset} · {r.horizon}</span>
        <span>{r.state === "open" ? (r.canEnter ? `Entries close ${clock(r.entryMs)}` : r.reason) : `${r.state}${r.outcome ? ` · ${r.outcome}` : ""}`}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <p className="text-lg font-semibold text-white">${fmt(r.lastPrice)}</p>
        <p className="text-[11px] text-white/50">Opened at ${fmt(r.openPrice)}</p>
      </div>

      <div className="mt-3">
        <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-accent" style={{ width: `${total ? (r.long / total) * 100 : 50}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-white/60">
          <span>GREEN {r.impliedLong ?? 50}% · {fmt(r.long)} KICK</span>
          <span>RED {r.impliedShort ?? 50}% · {fmt(r.short)} KICK</span>
        </div>
        <p className="mt-1 text-[10px] text-white/40">Implied chance from the pools. Momentum reading: {r.momentumUp != null ? `${r.momentumUp}% up` : "not available"} (an indicator, not a forecast).</p>
      </div>

      {r.canEnter && canKick && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSide("long")} className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold ${side === "long" ? "border-accent bg-accent/20 text-accent" : "border-white/15 text-white/70"}`}><ArrowUp size={14} />GREEN</button>
            <button onClick={() => setSide("short")} className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold ${side === "short" ? "border-red-400 bg-red-400/15 text-red-400" : "border-white/15 text-white/70"}`}><ArrowDown size={14} />RED</button>
          </div>
          <div className="flex gap-2">
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="KICK to stake" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-accent" />
            <button disabled={busy || !side || !amount} onClick={kick} className="rounded-xl bg-accent px-4 text-sm font-semibold text-black disabled:opacity-40">{busy ? "Kicking…" : "Kick"}</button>
          </div>
          <p className="text-[10px] text-white/40">Winners share the pool in proportion to their stake. A tie or a round with only one side is refunded.</p>
        </div>)}
      {msg && <p className={`mt-2 break-words text-xs ${msg.bad ? "text-red-400" : "text-white/70"}`}>{msg.text}</p>}
    </div>
  );
}
