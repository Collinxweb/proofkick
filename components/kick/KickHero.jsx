import Explain from "@/components/Explain";

// Headline stats for the Kick Markets page. Each figure comes from real rounds or the user's settled kicks.
export default function KickHero({ totalRounds, winRate, yourReturn }) {
  const pct = (x) => (x == null ? "—" : `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`);
  const stats = [
    ["Total rounds", String(totalRounds)],
    ["Win rate", winRate == null ? "—" : `${winRate.toFixed(1)}%`],
    ["Your return", pct(yourReturn)],
  ];
  return (
    <section className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/[0.08] to-transparent p-5">
      <h1 className="text-[clamp(28px,8.5vw,38px)] font-semibold leading-tight text-white">Kick <span className="text-accent">Markets</span></h1>
      <p className="mt-1 flex items-center gap-2 text-sm text-white/60">Predict. Play. Track. <span className="rounded-full border border-accent/50 px-2 py-0.5 text-[10px] text-accent">Testnet</span></p>
      <div className="mt-4 grid grid-cols-3 divide-x divide-white/10">
        {stats.map(([k, v]) => (
          <div key={k} className="px-2 text-center">
            <p className="text-base font-semibold text-white">{v}</p>
            <p className="flex items-center justify-center gap-1 text-[11px] text-white/50">{k}{k === "Your return" && <Explain text="Net result on your settled kicks, as a share of what you staked. Play money, and past results do not predict future ones." />}</p>
          </div>))}
      </div>
    </section>
  );
}
