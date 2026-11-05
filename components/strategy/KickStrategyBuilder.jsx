"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RULE_LABEL, THRESHOLDS, MAX_STRATEGY_STAKE, evaluateKickRule } from "@/lib/kick/strategy-rules";
import Explain from "@/components/Explain";

const ASSET = { BTC: "BTC/USD", ETH: "ETH/USD", PAXG: "XAU/PAXG" };
const chip = (on) => `rounded-full border px-3 py-1.5 text-xs ${on ? "border-accent bg-accent/15 text-accent" : "border-white/15 text-white/70"}`;

// Kick market strategies: choose a market and a rule. When the rule matches while entries are open, the app places one kick for you.
export default function KickStrategyBuilder({ live, mine, canKick }) {
  const router = useRouter();
  const [asset, setAsset] = useState("BTC");
  const [horizon, setHorizon] = useState("24H");
  const [rule, setRule] = useState("momentum");
  const [threshold, setThreshold] = useState(65);
  const [stake, setStake] = useState("50");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Live fit: which rules would match each market right now, using the same readings the runner uses.
  const fits = live.map((r) => ({ ...r, now: evaluateKickRule({ rule, threshold, momentumUp: r.momentumUp, impliedLong: r.impliedLong, impliedShort: r.impliedShort }) }));

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/kick/strategy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asset, horizon, rule, threshold, stake }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ bad: true, text: j.error });
    setMsg({ text: "Strategy saved. It will act when its rule matches during an open entry window." });
    router.refresh();
  }
  async function toggle(id, active) {
    await fetch("/api/kick/strategy", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, active }) });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-panel p-4">
        <div className="flex items-center gap-1 text-sm font-semibold text-white">Live markets right now <Explain text="These are the readings the strategy checks. Momentum comes from recent prices and is an indicator, not a forecast. Implied chance comes from the share of KICK staked on each side." /></div>
        <div className="mt-3 space-y-2">
          {fits.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-white/80">{ASSET[r.asset] ?? r.asset} · {r.horizon}</span>
              <span className="text-white/60">momentum {r.momentumUp ?? "—"}% · {r.canEnter ? "entries open" : "entries closed"}</span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 ${r.now && r.canEnter ? "border-accent text-accent" : "border-white/15 text-white/50"}`}>{!r.canEnter ? "waiting" : r.now ? `would kick ${r.now === "long" ? "GREEN" : "RED"}` : "no match"}</span>
            </div>))}
          {!fits.length && <p className="text-xs text-white/50">No markets are open right now.</p>}
        </div>
        <p className="mt-3 text-[11px] text-white/45">Thresholds are starting points based on the current readings. They have not been back-tested, and no rule guarantees a result.</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-panel p-4">
        <p className="text-sm font-semibold text-white">Build a Kick strategy</p>
        <div><p className="mb-1 text-xs text-white/50">Market</p><div className="flex flex-wrap gap-2">{Object.entries(ASSET).map(([k, n]) => <button key={k} onClick={() => setAsset(k)} className={chip(asset === k)}>{n}</button>)}</div></div>
        <div><p className="mb-1 text-xs text-white/50">Round</p><div className="flex gap-2"><button onClick={() => setHorizon("24H")} className={chip(horizon === "24H")}>24H (entries until 18:00 UTC)</button><button onClick={() => setHorizon("1W")} className={chip(horizon === "1W")}>1W (until the last 24h)</button></div></div>
        <div><p className="mb-1 flex items-center gap-1 text-xs text-white/50">Rule <Explain text="Follow momentum: kick GREEN when momentum is strong upward, RED when strongly downward. Against a crowded pool: kick the side that the crowd is not on, once one side holds the threshold share." /></p>
          <div className="flex flex-col gap-2">{Object.entries(RULE_LABEL).map(([k, n]) => <button key={k} onClick={() => setRule(k)} className={`${chip(rule === k)} text-left`}>{n}</button>)}</div></div>
        <div><p className="mb-1 text-xs text-white/50">Threshold</p><div className="flex flex-wrap gap-2">{THRESHOLDS.map((t) => <button key={t} onClick={() => setThreshold(t)} className={chip(threshold === t)}>{t}%</button>)}</div></div>
        <label className="block text-xs text-white/50">Stake per round (KICK, up to {MAX_STRATEGY_STAKE})
          <input inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-accent" />
        </label>
        <p className="text-[11px] leading-relaxed text-white/50">A strategy places one kick per round, from your testnet account, while entries are open. It can lose its whole stake every round. Testnet play money only, 18+.</p>
        {msg && <p className={`text-xs ${msg.bad ? "text-red-400" : "text-accent"}`}>{msg.text}</p>}
        <button disabled={busy || !canKick} onClick={save} className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-black disabled:opacity-40">{canKick ? (busy ? "Saving…" : "Save strategy") : "Get testnet KICK first"}</button>
      </section>

      <section>
        <p className="mb-2 text-sm font-semibold text-white">Your strategies</p>
        <div className="space-y-2">
          {mine.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-panel p-3 text-xs">
              <div><p className="font-semibold text-white">{ASSET[s.asset]} {s.horizon} · {RULE_LABEL[s.rule]} · {s.threshold}%</p><p className="text-white/50">{s.stake} KICK per round · {s.active ? "active" : "paused"}</p></div>
              <button onClick={() => toggle(s.id, !s.active)} className="rounded-full border border-white/20 px-3 py-1 text-white/80">{s.active ? "Pause" : "Resume"}</button>
            </div>))}
          {!mine.length && <p className="text-xs text-white/50">No Kick strategies yet.</p>}
        </div>
      </section>
    </div>
  );
}
