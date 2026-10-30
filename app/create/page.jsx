import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import ProfileGate from "@/components/ProfileGate";
import CreateCalls from "@/components/CreateCalls";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Create() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: me } = await s.from("profiles").select("caution_accepted_at, profile_completed_at").eq("id", user.id).single();
  if (!me?.caution_accepted_at) redirect("/caution");
  const [{ data: fx }, { data: mine }] = await Promise.all([
    s.from("fixtures").select("*").gt("kickoff_at", new Date().toISOString()).order("kickoff_at").limit(150),
    s.from("picks").select("fixture_id, selection").eq("user_id", user.id).eq("market", "h2h"),
  ]);
  // Crest columns, if the sync stored them, are passed along; the cards fall back to initials.
  const fixtures = (fx ?? []).filter((f) => f.odds?.home).map((f) => ({
    id: f.id, league: f.league, home_team: f.home_team, away_team: f.away_team, kickoff_at: f.kickoff_at,
    odds: { home: f.odds.home, draw: f.odds.draw, away: f.odds.away },
    hc: f.home_crest ?? f.home_logo ?? f.home_badge ?? null, ac: f.away_crest ?? f.away_logo ?? f.away_badge ?? null,
  }));
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/create"><Logo size={32} /></Link>
      <h1 className="mt-6 text-3xl font-semibold text-white">Make your call</h1>
      <p className="mt-1 text-sm text-white/55">Tap a price to call a match. Your call is timestamped on Sui and saved to Walrus before kick-off. It can't be edited or deleted.</p>
      <CreateCalls fixtures={fixtures} called={Object.fromEntries((mine ?? []).map((p) => [p.fixture_id, p.selection]))} />
      <ProfileGate open={!me.profile_completed_at} userId={user.id} />
      <BottomNav />
    </main>
  );
}
