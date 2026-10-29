import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import StrategyBuilder from "@/components/StrategyBuilder";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Create() {
  const { data: fixtures } = await supabaseServer().from("fixtures").select("id, league, home_team, away_team, kickoff_at, odds, context")
    .gt("kickoff_at", new Date().toISOString()).order("kickoff_at").limit(300);
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/dashboard"><Logo size={32} /></Link>
      <h1 className="mt-8 text-3xl font-semibold text-white">Create Strategy</h1>
      <p className="mt-1 text-white/55">Build rules once. ProofKick applies them to every match.</p>
      <StrategyBuilder fixtures={fixtures ?? []} />
      <BottomNav />
    </main>
  );
}
