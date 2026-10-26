export default function StrategyCard({ s }) {
  const pct = ((s.wins / s.total) * 100).toFixed(1);
  const top = s.rank === 1;
  return (
    <article
      className={`rounded-2xl border p-4 sm:p-5 ${
        top ? "border-accent/60 bg-panel shadow-[0_0_40px_rgba(25,211,107,0.12)]" : "border-white/10 bg-panel"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            top ? "bg-accent text-ink" : "bg-white/10 text-white"
          }`}
        >
          #{s.rank}
        </span>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-ink">
          {s.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-bold text-white">{s.name}</h3>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-label="verified" className="shrink-0 text-accent">
              <circle cx="12" cy="12" r="11" fill="currentColor" />
              <path d="m7 12.5 3 3 7-7" fill="none" stroke="#07090a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-xs text-white/50">@{s.handle}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.tags.map((t) => (
              <span key={t} className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-white/60">{s.description}</p>

      <div className="mt-4 grid grid-cols-[1.2fr_1fr] gap-3">
        <div className="rounded-xl bg-ink p-3">
          <div className="text-[10px] font-semibold tracking-widest text-white/50">WIN RATE</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-accent">{pct}%</span>
            <span className="text-xs text-white/50">
              ({s.wins}/{s.total})
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1" aria-label="last 10 results">
            {s.last10.map((w, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${w ? "bg-accent" : "bg-white/15"}`} />
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold tracking-widest text-white/50">AVG ODDS</div>
            <div className="text-lg font-bold text-white">{s.avgOdds.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold tracking-widest text-white/50">ROI</div>
            <div className="text-lg font-bold text-accent">+{s.roiPct.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </article>
  );
}
