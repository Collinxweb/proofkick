import { ArrowRight } from "lucide-react";

const pct = (n) => (n == null ? "—" : `${Number(n).toFixed(1)}%`);

export default function StrategyCard({ rank, name, owner, tags, winrate, wins, settled, pending, last10, avgOdds, roi, top }) {
  const roiNum = roi == null ? null : Number(roi);
  return (
    <article className={`rounded-2xl border p-4 ${top ? "border-accent/60 bg-accent/[0.04] shadow-[0_0_30px_-12px_#19d36b]" : "border-white/10 bg-panel"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${top ? "bg-accent text-black" : "bg-white/10 text-white/70"}`}>#{rank}</span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold uppercase text-accent">{owner?.[0] ?? "?"}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{name}</h3>
          <p className="truncate text-xs text-white/50">by @{owner}</p>
        </div>
        <ArrowRight size={18} className="shrink-0 text-white/40" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => <span key={t} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/70">{t}</span>)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/30 p-3">
          <p className="text-xs text-white/50">Win Rate</p>
          <p className="text-2xl font-semibold text-white">{pct(winrate)}</p>
          <p className="text-xs text-white/40">({wins}/{settled}){pending > 0 ? ` · ${pending} pending` : ""}</p>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-white/50">Last 10</p>
            <div className="mt-1 flex gap-1">
              {last10.length ? last10.map((w, i) => <span key={i} className={`h-2 w-2 rounded-full ${w ? "bg-accent" : "bg-white/20"}`} />) : <span className="text-xs text-white/30">—</span>}
            </div>
          </div>
          <div className="flex gap-5">
            <div><p className="text-xs text-white/50">Avg. Odds</p><p className="text-sm font-semibold text-white">{avgOdds == null ? "—" : avgOdds.toFixed(2)}</p></div>
            <div><p className="text-xs text-white/50">ROI</p>
              <p className={`text-sm font-semibold ${roiNum == null ? "text-white" : roiNum >= 0 ? "text-accent" : "text-red-400"}`}>{roiNum == null ? "—" : `${roiNum > 0 ? "+" : ""}${roiNum.toFixed(1)}%`}</p></div>
          </div>
        </div>
      </div>
    </article>
  );
}
