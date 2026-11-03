import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { lookupCrest } from "@/lib/crests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fills missing club crests for teams playing in the next week. About 2 seconds per team to respect the free rate limit.
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = supabaseAdmin();
  const until = new Date(Date.now() + 7 * 864e5).toISOString();
  const { data: fx } = await db.from("fixtures").select("home_team, away_team").gt("kickoff_at", new Date().toISOString()).lt("kickoff_at", until).limit(400);
  const names = [...new Set((fx ?? []).flatMap((f) => [f.home_team, f.away_team]))];
  const { data: have } = await db.from("team_crests").select("name").in("name", names.length ? names : [""]);
  const known = new Set((have ?? []).map((h) => h.name));
  const todo = names.filter((n) => !known.has(n)).slice(0, 20);
  const found = [], missed = [];
  for (const name of todo) {
    try {
      const badge = await lookupCrest(name);
      if (badge) { await db.from("team_crests").upsert({ name, badge, fetched_at: new Date().toISOString() }); found.push(name); }
      else missed.push(name);
    } catch { missed.push(name); }
    await sleep(2000);
  }
  return NextResponse.json({ teams: names.length, alreadyKnown: known.size, found: found.length, missed });
}
