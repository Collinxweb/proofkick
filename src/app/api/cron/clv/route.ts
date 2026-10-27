// Kickoff CLV capture. Run from the grading cron: for each pending pick whose kickoff has passed,
// take the latest odds snapshot at or before kickoff and store closing_odds + clv_pct.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { closingRow, oddsForSelection, clvFraction, type OddsRow } from "../../../../lib/track/clv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ mode: "mock", persisted: false });

  const nowIso = new Date().toISOString();
  const { data: picks, error } = await db
    .from("picks")
    .select("id, event_id, market, selection, odds_at_log, kickoff_time")
    .is("closing_odds", null)
    .lte("kickoff_time", nowIso)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let captured = 0;
  let missing = 0;
  for (const p of picks ?? []) {
    const { data: rows } = await db
      .from("odds_snapshots")
      .select("captured_at, home, draw, away, over25, under25, btts_yes, btts_no")
      .eq("event_id", p.event_id)
      .lte("captured_at", p.kickoff_time);
    const row = closingRow((rows ?? []) as OddsRow[], p.kickoff_time);
    const closing = row ? oddsForSelection(row, p.market, p.selection) : null;
    if (closing === null) { missing++; continue; }
    const clv = clvFraction(Number(p.odds_at_log), closing);
    await db.from("picks").update({ closing_odds: closing, clv_pct: clv }).eq("id", p.id);
    captured++;
  }
  return NextResponse.json({ captured, missing_closing_odds: missing });
}
