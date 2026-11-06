import Countdown from "@/components/kick/Countdown";
import Spark from "@/components/kick/Spark";
import { PAIR, ICON, fmtPrice } from "@/components/kick/market-style";

// One open kick: stake, entry and current price, potential payout, time left and the market's split.
export default function PositionCard({ p }) {
  const r = p.round;
  const icon = ICON[r.asset] ?? { text: r.asset, tint: "bg-white/20" };
  const total = r.long + r.short;
  const greenPct = total ? Math.round((r.long / total) * 100) : 50;
  const green = p.side === "long";
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-black ${icon.tint}`}>{icon.text}</span>
          <div>
            <p className="text-sm font-semibold text-white">{PAIR[r.asset] ?? r.asset}</p>
            <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${green ? "bg-accent/20 text-accent" : "bg-red-400/20 text-red-400"}`}>{green ? "GREEN ↑" : "RED ↓"}</span>
          </div>
        </div>
        <span className="rounded-full border border-accent/50 px-2.5 py-0.5 text-[10px] text-accent">● OPEN</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div><p className="text-white/50">Entry price</p><p className="font-semibold text-white">${fmtPrice(p.entryPrice)}</p></div>
          <div><p className="text-white/50">Current price</p><p className="font-semibold text-white">${fmtPrice(r.lastPrice)}</p></div>
          <div><p className="text-white/50">Your stake</p><p className="font-semibold text-white">{fmtPrice(p.stake)} KICK</p></div>
          <div><p className="text-white/50">Potential payout</p><p className="font-semibold text-accent">{p.potential == null ? "—" : `${fmtPrice(p.potential)} KICK`}</p></div>
        </div>
        <Spark values={r.spark} />
      </div>
      <div className="mt-3 text-xs text-white/50">Time left <span className="font-semibold text-accent"><Countdown toMs={r.expiresMs} /></span></div>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-accent" style={{ width: `${greenPct}%` }} />
        <div className="h-full bg-red-400" style={{ width: `${100 - greenPct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/50"><span>{greenPct}% GREEN</span><span>{100 - greenPct}% RED</span></div>
    </div>
  );
}
