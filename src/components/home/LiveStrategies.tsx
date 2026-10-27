import { HOME_STRATEGIES } from "../../lib/mock/home";
import { StrategyCard } from "./StrategyCard";

export function LiveStrategies() {
  return (
    <section id="live" className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2BE07E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12h4l3-7 4 14 3-7h4" />
            </svg>
            Live Strategies
          </h2>
          <p className="mt-1 text-sm text-[#9AA7A1]">Top performing strategies, updated in real-time.</p>
        </div>
        <a href="#live" className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#2BE07E]/60">
          View All →
        </a>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {HOME_STRATEGIES.map((s) => (
          <StrategyCard key={s.rank} s={s} />
        ))}
      </div>
    </section>
  );
}
