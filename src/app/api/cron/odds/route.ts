import { NextResponse } from "next/server";
import { fetchEplOdds } from "../../../../lib/odds/ingest";
import { supabaseAdmin } from "../../../../lib/supabase/server";

// Vercel cron calls this every 2h (see vercel.json). Auth: Bearer CRON_SECRET.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const result = await fetchEplOdds(now);
  const db = supabaseAdmin();

  if (!db) {
    // mock mode: nothing persisted, just report what would be stored
    return NextResponse.json({ mode: result.mode, persisted: false, events: result.events.length, creditsUsed: result.creditsUsed });
  }

  let upserted = 0;
  for (const e of result.events) {
    const { data: ev, error } = await db
      .from("events")
      .upsert(
        { external_id: e.externalId, league: e.league, home_team: e.homeTeam, away_team: e.awayTeam, kickoff_time: e.kickoffTime },
        { onConflict: "external_id" }
      )
      .select("id")
      .single();
    if (error || !ev) continue;
    await db.from("odds_snapshots").insert({
      event_id: ev.id,
      captured_at: e.snapshot.capturedAt,
      home: e.snapshot.home,
      draw: e.snapshot.draw,
      away: e.snapshot.away,
    });
    upserted++;
  }
  return NextResponse.json({ mode: result.mode, persisted: true, upserted, creditsUsed: result.creditsUsed });
}
