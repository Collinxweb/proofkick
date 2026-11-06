import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { userHistory } from "@/lib/history/store";
import { recallFor } from "@/lib/history/recall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?fixtureId=&homeTeam=&awayTeam=&selection=home|away  ->  a private note from YOUR OWN settled picks, or null.
// Team-to-win calls only. Nothing here changes a pick, and nothing is shown unless there are at least 3 comparable settled picks.
export async function GET(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ note: null });
  const u = new URL(req.url);
  const candidate = {
    fixtureId: u.searchParams.get("fixtureId"),
    homeTeam: u.searchParams.get("homeTeam"),
    awayTeam: u.searchParams.get("awayTeam"),
    selection: u.searchParams.get("selection"),
  };
  if (!candidate.homeTeam || !candidate.awayTeam || !["home", "away"].includes(candidate.selection)) return NextResponse.json({ note: null });
  const { recallPicks } = await userHistory(supabaseAdmin(), user.id);
  const r = recallFor(candidate, recallPicks);
  if (!r) return NextResponse.json({ note: null });
  return NextResponse.json({ note: r.text, team: r.team, wins: r.wins, settled: r.settled, since: r.since, until: r.until });
}
