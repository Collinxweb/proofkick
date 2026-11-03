import Link from "next/link";
import { Zap } from "lucide-react";
import Countdown from "@/components/kick/Countdown";
import { PAIR, ICON, pct, fmtPrice } from "@/components/kick/market-style";

// Home summary of the current 24H markets. Shows only rounds that exist; nothing is invented.
export default function LiveMarketsCard({ rounds }) {
  const live = rounds.filter((r) => r.horizon === "24H");
  const latestPerAsset = [];
  for (const r of live) if (!latestPerAsset.some((x) => x.asset === r.asset)) latestPerAsset.push(r);
  return (
    <div className="rounded-3xl border border-accent/30 bg-panel p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-white"><Zap size={16} className="text-accent" />Live KICK markets</p>
        <span className="rounded-full border border-accent/50 px-2.5 py-0.5 text-[10px] text-accent">● Live</span>
      </div>
      <div className="mt-2 divide-y divide-white/10">
        {latestPerAsset.map((r) => {
          const icon = ICON[r.asset] ?? { text: r.asset, tint: "bg-white/20" };
          const change = pct(r.openPrice, r.lastPrice);
          return (
            <div key={r.id} className="flex items-center gap-3 py-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-black ${icon.tint}`}>{icon.text}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{PAIR[r.asset] ?? r.asset}</p>
                <p className="text-xs text-white/70">${fmtPrice(r.lastPrice)} {change != null && <span className={change >= 0 ? "text-accent" : "text-red-400"}>{change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%</span>}</p>
              </div>
              <div className="hidden text-right text-[11px] text-white/50 sm:block">
                <p>Entries close in</p>
                <p className="font-semibold text-white"><Countdown toMs={r.entryMs} /></p>
              </div>
              <Link href="/kick" className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${r.canEnter ? "border-accent text-accent" : "border-white/20 text-white/40"}`}>GREEN</Link>
              <Link href="/kick" className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${r.canEnter ? "border-red-400 text-red-400" : "border-white/20 text-white/40"}`}>RED</Link>
            </div>);
        })}
        {!latestPerAsset.length && <p className="py-4 text-center text-xs text-white/55">No 24H markets are open yet. Rounds open daily at 00:00 UTC.</p>}
      </div>
      <Link href="/kick" className="mt-1 block text-right text-xs font-semibold text-accent">View all markets →</Link>
    </div>
  );
}
