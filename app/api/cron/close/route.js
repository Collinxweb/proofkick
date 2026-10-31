import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { consensus } from "@/lib/odds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Captures the closing line: the average price in the minutes BEFORE kick-off, only for matches that have locked calls.
// Runs every ~5 minutes from an outside pinger (the free Vercel plan only allows daily crons). Costs 1 odds credit per league
// that has a match kicking off in the next 12 minutes with at least one call; zero credits otherwise.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const u = new URL(req.url);
  if (!secret || (u.searchParams.get("secret") !== secret && req.headers.get("authorization") !== `Bearer ${secret}`)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const key = process.env.ODDS_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "ODDS_API_KEY is not set in this deployment" }, { status: 500 });

  const db = supabaseAdmin(), now = Date.now();
  const { data: due } = await db.from("fixtures").select("id, external_id, league, kickoff_at").is("closing_at", null)
    .gte("kickoff_at", new Date(now).toISOString()).lte("kickoff_at", new Date(now + 12 * 60e3).toISOString());
  if (!due?.length) return NextResponse.json({ due: 0 });
  const { data: called } = await db.from("picks").select("fixture_id").in("fixture_id", due.map((f) => f.id));
  const withCalls = new Set((called ?? []).map((c) => c.fixture_id));
  const todo = due.filter((f) => withCalls.has(f.id));
  const report = { due: due.length, withCalls: todo.length, closed: 0, notes: [] };
  let credits = null;

  for (const league of [...new Set(todo.map((f) => f.league))]) {
    const r = await fetch(`https://api.the-odds-api.com/v4/sports/${league}/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${key}`, { cache: "no-store" });
    credits = r.headers.get("x-requests-remaining") ?? credits;
    if (!r.ok) { report.notes.push(`${league}: HTTP ${r.status}`); continue; }
    const byId = Object.fromEntries((await r.json()).map((e) => [e.id, e]));
    for (const f of todo.filter((x) => x.league === league)) {
      const e = byId[f.external_id];
      if (!e) { report.notes.push(`${f.id}: not in feed`); continue; }
      const odds = consensus(e);
      if (!(odds.home > 1 && odds.draw > 1 && odds.away > 1)) { report.notes.push(`${f.id}: incomplete odds`); continue; }
      await db.from("fixtures").update({ closing_odds: odds, closing_at: new Date().toISOString() }).eq("id", f.id);
      for (const sel of ["home", "draw", "away"]) await db.from("picks").update({ closing_odds: odds[sel] }).eq("fixture_id", f.id).eq("selection", sel).is("closing_odds", null);
      report.closed++;
    }
  }
  report.credits_remaining = credits;
  return NextResponse.json(report);
}
