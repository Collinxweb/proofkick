import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import StrategyBuilder from "@/components/StrategyBuilder";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Strategy() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: fixtures } = await s.from("fixtures").select("id, league, home_team, away_team, kickoff_at, odds, context").gt("kickoff_at", new Date().toISOString()).order("kickoff_at").limit(300);
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/create"><Logo size={32} /></Link>
      <h1 className="mt-6 text-3xl font-semibold text-white">Strategy (optional)</h1>
      <p className="mt-1 text-white/55">A strategy is just one way to choose calls. Your record comes from the calls you lock and how they grade, not from the rules.</p>
      <StrategyBuilder fixtures={fixtures ?? []} />
      <BottomNav />
    </main>
  );
}
