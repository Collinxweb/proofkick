import { HOME_STAT } from "./mockData";

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-8 pt-10 sm:pt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(25,211,107,0.22),transparent_60%),radial-gradient(ellipse_at_0%_100%,rgba(25,211,107,0.10),transparent_50%)]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2">
        <div>
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold tracking-widest text-accent">
            REAL STRATEGIES. VERIFIED RECORDS.
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Smarter Football
            <br />
            <span className="text-accent">Predictions.</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-white/60">
            Access proven strategies, track real win rates, and follow the best minds in football.
          </p>
          <a
            href="#live"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-ink shadow-[0_0_30px_rgba(25,211,107,0.35)] transition hover:brightness-110"
          >
            Explore Strategies
            <span aria-hidden>→</span>
          </a>
        </div>

        <div className="relative mx-auto flex w-full max-w-sm items-center justify-center">
          <div className="flex h-56 w-56 items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(25,211,107,0.2),#07090a_70%)] ring-1 ring-accent/20 sm:h-72 sm:w-72">
            <svg viewBox="0 0 120 120" className="h-32 w-32 sm:h-40 sm:w-40" aria-hidden>
              <circle cx="60" cy="60" r="54" fill="#E8F5EE" />
              <path d="M60 30l16 11-6 19H50l-6-19z" fill="#07090a" />
              <path d="M44 41L30 36M76 41l14-5M50 60l-12 8M70 60l12 8M55 79l-4 14M65 79l4 14" stroke="#07090a" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="absolute -bottom-4 left-0 rounded-2xl border border-white/10 bg-panel/95 px-4 py-3 shadow-xl backdrop-blur sm:-left-6">
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              LIVE MATCHES
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{HOME_STAT.liveMatches}</span>
              <span className="text-xs text-white/60">{HOME_STAT.label}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
