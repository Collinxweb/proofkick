import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, Bell, ArrowRight, Activity, ShieldCheck, Users, FileText } from "lucide-react";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import StrategyCard from "@/components/StrategyCard";
import { supabaseServer } from "@/lib/supabase/server";

const NAMES = { home: "Home Win", draw: "Draw", away: "Away Win", btts_yes: "BTTS", btts_no: "No BTTS" };
function label(sel) {
  const s = String(sel ?? "");
  if (NAMES[s]) return NAMES[s];
  if (s.startsWith("over_")) return `Over ${s.slice(5)}`;
  if (s.startsWith("under_")) return `Under ${s.slice(6)}`;
  return s.replace(/_/g, " ") || "Pick";
}
// Wilson lower bound: ranks by win rate while discounting tiny samples (1/1 should not beat 30/36)
function wilson(w, n) {
  if (!n) return 0;
  const z = 1.96, p = w / n;
  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n);
}

export default async function Dashboard() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: me } = await s.from("profiles").select("handle, caution_accepted_at").eq("id", user.id).single();
  if (!me?.caution_accepted_at) redirect("/caution");

  const [{ count: live }, { data: stats }] = await Promise.all([
    s.from("fixtures").select("id", { count: "exact", head: true }).eq("status", "live"),
    s.from("version_stats").select("*").limit(50),
  ]);
  const top = (stats ?? [])
    .sort((a, b) => wilson(b.wins, b.settled) - wilson(a.wins, a.settled) || b.settled - a.settled)
    .slice(0, 10);
  const ids = top.map((r) => r.strategy_version_id);

  const rules = {};
  let picks = [];
  if (ids.length) {
    const [v, k] = await Promise.all([
      s.from("strategy_versions").select("id, rules").in("id", ids),
      s.from("picks").select("strategy_version_id, status, odds_taken, settled_at").in("strategy_version_id", ids).in("status", ["won", "lost"]).order("settled_at", { ascending: false }).limit(2000),
    ]);
    (v.data ?? []).forEach((r) => (rules[r.id] = r.rules));
    picks = k.data ?? [];
  }
  const rows = top.map((r) => {
    const mine = picks.filter((x) => x.strategy_version_id === r.strategy_version_id);
    const rl = rules[r.strategy_version_id] ?? {};
    const n = (rl.conditions ?? []).length;
    return {
      ...r,
      last10: mine.slice(0, 10).map((x) => x.status === "won").reverse(),
      avgOdds: mine.length ? mine.reduce((a, x) => a + Number(x.odds_taken), 0) / mine.length : null,
      tags: [label(rl.selection), `${n} rule${n === 1 ? "" : "s"}`],
    };
  });

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="flex items-center justify-between px-5 pt-5">
        <Link href="/dashboard"><Logo size={32} /></Link>
        <div className="flex items-center gap-4 text-white/70">
          <Link href="/browse" aria-label="Search"><Search size={20} /></Link>
          <Bell size={20} />
          <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/40 bg-white/10 text-sm font-semibold uppercase text-accent">{me.handle?.[0]}</Link>
        </div>
      </header>

      <section className="relative mt-5 overflow-hidden px-5 pb-6 pt-4">
        <div className="pointer-events-none absolute -right-16 top-2 h-60 w-60 rounded-full bg-accent/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-8 flex h-44 w-44 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#1d2d25,#050807_65%)] ring-1 ring-accent/30 shadow-[0_0_60px_-10px_#19d36b]">
          <img src="/logo.png" alt="" className="w-20 opacity-90" />
        </div>
        <span className="relative inline-block rounded-full border border-accent/50 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-accent">Real strategies. Verified records.</span>
        <h1 className="relative mt-4 text-[clamp(30px,9vw,38px)] font-semibold leading-[1.08] text-white">Smarter Football<br /><span className="text-accent">Predictions.</span></h1>
        <p className="relative mt-3 max-w-[15rem] text-sm text-white/70">Access proven strategies, track real win rates, and follow the best minds in football.</p>
        <Link href="/browse" className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black">Explore Strategies <ArrowRight size={16} /></Link>
        <div className="absolute bottom-6 right-5 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Live matches</p>
          <p className="text-2xl font-semibold text-white">{live ?? 0}</p>
          <p className="text-xs text-white/50">Ongoing</p>
        </div>
      </section>

      <section className="px-5">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-2">
            <Activity size={22} className="text-accent" />
            <div><h2 className="text-lg font-semibold text-white">Live Strategies</h2><p className="text-xs text-white/50">Top performing, ranked by proven win rate.</p></div>
          </div>
          <Link href="/browse" className="flex items-center gap-1 rounded-full border border-accent/40 px-3 py-1.5 text-xs text-accent">View All <ArrowRight size={12} /></Link>
        </div>
        <div className="mt-4 space-y-3">
          {rows.length ? rows.map((r, i) => (
            <StrategyCard key={r.strategy_version_id} rank={i + 1} top={i === 0} name={r.name} owner={r.owner_handle} tags={r.tags}
              winrate={r.winrate_pct} wins={r.wins} settled={r.settled} pending={r.pending} last10={r.last10} avgOdds={r.avgOdds} roi={r.roi_pct} />
          )) : (
            <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center">
              <p className="font-semibold text-white">No strategies yet</p>
              <p className="mt-1 text-sm text-white/55">Real records only. Be the first to publish a strategy and start building yours.</p>
              <Link href="/create" className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black">Create a strategy</Link>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-2 px-5">
        {[[ShieldCheck, "Verified Records", "Real results. No fake claims."], [Users, "Top Analysts", "Follow and learn from experts."], [FileText, "Strategy Library", "Explore, save and share."]].map(([Icon, t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-panel p-3">
            <Icon size={20} className="text-accent" />
            <p className="mt-2 text-xs font-semibold text-white">{t}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-white/50">{d}</p>
          </div>
        ))}
      </section>
      <BottomNav />
    </main>
  );
}
