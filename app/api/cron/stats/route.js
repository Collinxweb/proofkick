import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LEAGUE_TO_FD } from "@/lib/proof/grade";
import { buildContexts } from "@/lib/stats/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Refreshes team form/stats on upcoming fixtures. The free football-data.org tier allows 10 calls a minute, so calls are spaced.
// Run it by hand (?secret=CRON_SECRET) or from an outside pinger once a day.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const u = new URL(req.url);
  if (!secret || (u.searchParams.get("secret") !== secret && req.headers.get("authorization") !== `Bearer ${secret}`)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const token = process.env.FOOTBALL_DATA_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: "FOOTBALL_DATA_TOKEN is not set in this deployment" }, { status: 500 });
  const db = supabaseAdmin(), report = {};
  let first = true;
  for (const [league, code] of Object.entries(LEAGUE_TO_FD)) {
    const { data: fixtures } = await db.from("fixtures").select("id, league, home_team, away_team, kickoff_at").eq("league", league).gt("kickoff_at", new Date().toISOString()).limit(60);
    if (!fixtures?.length) { report[code] = "no upcoming fixtures"; continue; }
    if (!first) await sleep(6500);
    first = false;
    const r = await fetch(`https://api.football-data.org/v4/competitions/${code}/matches`, { headers: { "X-Auth-Token": token }, cache: "no-store" });
    if (!r.ok) { report[code] = `HTTP ${r.status}`; continue; }
    const ctx = buildContexts((await r.json()).matches ?? [], fixtures);
    const at = new Date().toISOString();
    await Promise.all(Object.entries(ctx).map(([id, c]) => db.from("fixtures").update({ context: { ...c, at } }).eq("id", id)));
    report[code] = `${Object.keys(ctx).length} of ${fixtures.length} fixtures`;
  }
  return NextResponse.json(report);
}
