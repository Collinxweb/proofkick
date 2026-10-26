import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LEAGUES } from "@/lib/leagues";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 100) / 100 : null);

// Daily sync (Vercel cron) or manual: ?secret=CRON_SECRET. Costs 1 odds-API credit per league (6 per run).
export async function GET(req) {
  const u = new URL(req.url);
  const ok = u.searchParams.get("secret") === process.env.CRON_SECRET || req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || !ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const key = process.env.ODDS_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "ODDS_API_KEY is not set in this deployment" }, { status: 500 });
  const db = supabaseAdmin(), report = {};
  let credits = null;
  for (const [sport] of LEAGUES) {
    const r = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${key}`, { cache: "no-store" });
    credits = r.headers.get("x-requests-remaining") ?? credits;
    if (!r.ok) { report[sport] = `HTTP ${r.status}`; continue; }
    const rows = (await r.json()).map((e) => {
      const side = { home: [], draw: [], away: [] };
      for (const b of e.bookmakers ?? []) for (const o of b.markets?.find((m) => m.key === "h2h")?.outcomes ?? []) {
        if (o.name === e.home_team) side.home.push(o.price); else if (o.name === e.away_team) side.away.push(o.price); else if (o.name === "Draw") side.draw.push(o.price);
      }
      return { external_id: e.id, league: sport, home_team: e.home_team, away_team: e.away_team, kickoff_at: e.commence_time,
        odds: { home: avg(side.home), draw: avg(side.draw), away: avg(side.away), books: e.bookmakers?.length ?? 0 }, odds_updated_at: new Date().toISOString() };
    });
    if (!rows.length) { report[sport] = 0; continue; }
    const { error } = await db.from("fixtures").upsert(rows, { onConflict: "external_id" });
    report[sport] = error ? error.message : rows.length;
  }
  return NextResponse.json({ credits_remaining: credits, report });
}
