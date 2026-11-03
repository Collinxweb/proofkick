import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LEAGUE_TO_FD } from "@/lib/proof/grade";
import { competitionTeams, bestCrest } from "@/lib/crests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Loads each competition's team list once (six calls, spaced for the free rate limit), then stores a crest for every
// team playing in the next week that matches a team in those lists.
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const token = process.env.FOOTBALL_DATA_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: "FOOTBALL_DATA_TOKEN is not set in this deployment" }, { status: 500 });
  const db = supabaseAdmin();
  const { data: fx } = await db.from("fixtures").select("home_team, away_team").gt("kickoff_at", new Date().toISOString())
    .lt("kickoff_at", new Date(Date.now() + 7 * 864e5).toISOString()).limit(400);
  const names = [...new Set((fx ?? []).flatMap((f) => [f.home_team, f.away_team]))];
  const report = { teamsToMatch: names.length, byCompetition: {}, stored: 0, unmatched: [] };
  const lists = [];
  let first = true;
  for (const code of Object.values(LEAGUE_TO_FD)) {
    if (!first) await sleep(6500);
    first = false;
    try {
      const teams = await competitionTeams(code, token);
      lists.push(...teams);
      report.byCompetition[code] = teams.length;
    } catch (e) {
      report.byCompetition[code] = String(e.message ?? e).slice(0, 80);
    }
  }
  for (const name of names) {
    const badge = bestCrest(name, lists);
    if (!badge) { report.unmatched.push(name); continue; }
    await db.from("team_crests").upsert({ name, badge, fetched_at: new Date().toISOString() });
    report.stored++;
  }
  return NextResponse.json(report);
}
