import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import BrowseList from "@/components/BrowseList";
import { LEAGUES } from "@/lib/leagues";
import { crestFor, loadCrests } from "@/lib/crests";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const lname = Object.fromEntries(LEAGUES);

export default async function Browse() {
  const [{ data: fx }, crests] = await Promise.all([
    supabaseServer().from("fixtures").select("*").gt("kickoff_at", new Date().toISOString()).order("kickoff_at").limit(80),
    loadCrests(),
  ]);
  // Resolve crest URLs per raw team name so the client only needs a plain lookup.
  const crestByTeam = {};
  for (const f of fx ?? []) {
    crestByTeam[f.home_team] = crestFor(crests, f.home_team);
    crestByTeam[f.away_team] = crestFor(crests, f.away_team);
  }
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-40 pt-5">
      <Link href="/dashboard"><Logo size={32} /></Link>
      <h1 className="mt-8 text-3xl font-semibold text-white">Matches</h1>
      <p className="mt-1 text-sm text-white/55">Upcoming fixtures from the top leagues. Odds are the average across European bookmakers and may differ from your bookmaker.</p>
      <BrowseList fixtures={fx ?? []} crests={crestByTeam} lname={lname} />
      <BottomNav />
    </main>
  );
}
