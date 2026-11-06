import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import BetsView from "@/components/bets/BetsView";
import Explain from "@/components/Explain";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CALL_COLS, summarize } from "@/lib/calls";
import { loadSlips } from "@/lib/social/data";
import { groupCalls } from "@/lib/social/group";

export const dynamic = "force-dynamic";
const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);

export default async function MyKickCalls() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: calls } = await s.from("picks").select(CALL_COLS).eq("user_id", user.id).order("locked_at", { ascending: false }).limit(100);
  const pickIds = (calls ?? []).map((c) => c.id);
  const slips = await loadSlips(s, pickIds);
  const items = groupCalls({ calls: calls ?? [], slips });
  const { data: crestRows } = await supabaseAdmin().from("team_crests").select("name, badge");
  const crest = Object.fromEntries((crestRows ?? []).map((r) => [r.name, r.badge]));

  // Plain objects for the client view. Everything shown is a real call, multi or result.
  const plain = items.map((it) => {
    if (it.type === "slip") {
      const legs = it.legs.map((l) => ({
        id: l.id, home: l.fixtures?.home_team, away: l.fixtures?.away_team, selection: l.selection, odds: Number(l.odds_taken), status: l.status,
        homeCrest: crest[l.fixtures?.home_team] ?? null, awayCrest: crest[l.fixtures?.away_team] ?? null,
      }));
      return {
        type: "multi", id: it.slip.id, at: it.at, status: it.slip.status, stake: it.slip.stake, grossPayout: it.slip.grossPayout,
        combined: legs.reduce((a, l) => a * l.odds, 1), legs,
      };
    }
    const c = it.c;
    return {
      type: "call", id: c.id, at: c.locked_at, status: c.status, selection: c.selection, odds: Number(c.odds_taken),
      home: c.fixtures?.home_team, away: c.fixtures?.away_team, kickoff: c.fixtures?.kickoff_at,
      homeCrest: crest[c.fixtures?.home_team] ?? null, awayCrest: crest[c.fixtures?.away_team] ?? null,
      finalScore: c.final_home != null ? `${c.final_home}-${c.final_away}` : null, source: c.source, strategy: c.reasoning?.strategy ?? null,
    };
  });

  // Record figures: each one has its own denominator.
  const call = summarize(calls ?? []);
  const settledMultis = slips.filter((x) => x.kind === "multi" && (x.status === "won" || x.status === "lost"));
  const multiWins = settledMultis.filter((x) => x.status === "won").length;
  const stats = {
    callHit: pct(call.hit), callGraded: call.graded, pending: call.pending,
    multiWin: settledMultis.length ? pct(multiWins / settledMultis.length) : "—", multiGraded: settledMultis.length,
    clv: call.clv == null ? "—" : `${call.clv >= 0 ? "+" : ""}${(call.clv * 100).toFixed(1)}%`,
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-4 pb-28 pt-4">
      <header className="flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-1.5">
          <img src="/logo.png" alt="" width={24} height={24} className="shrink-0" />
          <span className="whitespace-nowrap text-base font-bold text-white">Proof<span className="text-accent">Kick</span></span>
        </Link>
        <Link href="/settings" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70 text-xs">⚙</Link>
      </header>

      <section className="mt-5 rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/[0.08] to-transparent p-5">
        <h1 className="text-[clamp(28px,8.5vw,38px)] font-semibold leading-tight text-white">My Kick <span className="text-accent">Calls</span></h1>
        <p className="mt-1 text-sm text-white/60">Track your football picks and view results.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Call hit rate", stats.callHit, `${stats.callGraded} graded`, "Won ÷ graded calls, legs included"],
            ["Multi win rate", stats.multiWin, `${stats.multiGraded} settled`, "Winning multis ÷ settled multis"],
            ["Pending", String(stats.pending), "awaiting result", ""],
            ["Avg CLV", stats.clv, "vs closing line", "Price at call against the closing price"],
          ].map(([label, value, sub, help]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-[10px] text-white/50">{label}{help && <Explain text={help} />}</p>
              <p className="mt-1 text-base font-semibold text-white">{value}</p>
              <p className="text-[10px] text-white/40">{sub}</p>
            </div>))}
        </div>
      </section>

      <section className="mt-6">
        <BetsView items={plain} stats={stats} />
      </section>
      <BottomNav />
    </main>
  );
}
