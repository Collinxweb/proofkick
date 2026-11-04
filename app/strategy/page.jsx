import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import StrategyBuilder from "@/components/StrategyBuilder";
import StrategyTabs from "@/components/strategy/StrategyTabs";
import KickStrategyBuilder from "@/components/strategy/KickStrategyBuilder";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadRounds } from "@/lib/kick/markets/load";

export const dynamic = "force-dynamic";

export default async function Strategy() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) redirect("/");
  const db = supabaseAdmin();
  const { data: account } = await db.from("profiles").select("kick_address").eq("id", user.id).maybeSingle();
  const [{ data: fixtures }, live, { data: mine }] = await Promise.all([
    supabaseServer().from("fixtures").select("id, league, home_team, away_team, kickoff_at, odds, context").gt("kickoff_at", new Date().toISOString()).order("kickoff_at").limit(300),
    loadRounds(db, Date.now()),
    db.from("kick_strategies").select("id, asset, horizon, rule, threshold, stake, active").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const kickLive = live.filter((r) => r.horizon === "24H" || r.horizon === "1W");
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-4 pb-28 pt-4">
      <Link href="/dashboard"><Logo size={28} /></Link>
      <h1 className="mt-5 text-2xl font-semibold text-white">Strategies</h1>
      <p className="mt-1 text-sm text-white/55">Rules that act for you. A rule only acts when its condition is met and entries are open.</p>
      <div className="mt-5">
        <StrategyTabs
          kick={<KickStrategyBuilder live={kickLive} mine={mine ?? []} canKick={Boolean(account?.kick_address)} />}
          football={<StrategyBuilder fixtures={fixtures ?? []} />}
        />
      </div>
      <BottomNav />
    </main>
  );
}
