import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LEAGUE_TO_FD } from "@/lib/proof/grade";
import { competitionTeams, bestTeam } from "@/lib/crests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const CACHED = "/object/public/crests/";
const DAY = 864e5;

// Team lists per competition: saved for a day, and fetched one at a time with a gap (football-data.org returns 429 to bursts).
async function loadLists(db, token) {
  const { data: saved } = await db.from("competition_teams").select("code, teams, fetched_at");
  const fresh = new Map((saved ?? []).filter((r) => Date.now() - Date.parse(r.fetched_at) < DAY).map((r) => [r.code, r.teams]));
  const lists = [], report = {};
  let fetchedOne = false;
  for (const code of Object.values(LEAGUE_TO_FD)) {
    if (fresh.has(code)) { lists.push(...fresh.get(code)); report[code] = `saved (${fresh.get(code).length})`; continue; }
    if (fetchedOne) await sleep(6500);
    fetchedOne = true;
    try {
      const teams = await competitionTeams(code, token);
      lists.push(...teams);
      report[code] = teams.length;
      await db.from("competition_teams").upsert({ code, teams, fetched_at: new Date().toISOString() });
    } catch (e) {
      report[code] = String(e.message ?? e).slice(0, 80);
    }
  }
  return { lists, report };
}

// Matches each club playing in the next week to its football-data.org team and caches the crest in storage.
// Clubs already cached, or corrected by hand, are skipped, so repeated runs finish the list.
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const token = process.env.FOOTBALL_DATA_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: "FOOTBALL_DATA_TOKEN is not set in this deployment" }, { status: 500 });
  const deadline = Date.now() + 46_000;
  const db = supabaseAdmin();
  const { data: fx } = await db.from("fixtures").select("home_team, away_team").gt("kickoff_at", new Date().toISOString())
    .lt("kickoff_at", new Date(Date.now() + 7 * 864e5).toISOString()).limit(400);
  const names = [...new Set((fx ?? []).flatMap((f) => [f.home_team, f.away_team]))];
  // Read the whole (small) table and compare names here. A long name filter was returning only part of the rows.
  const { data: rows, error: readErr } = await db.from("team_crests").select("name, badge, source");
  if (readErr) return NextResponse.json({ error: `could not read team_crests: ${readErr.message}` }, { status: 500 });
  const wanted = new Set(names);
  const done = new Set((rows ?? []).filter((r) => wanted.has(r.name) && (r.source === "manual" || (r.badge ?? "").includes(CACHED))).map((r) => r.name));
  const todo = names.filter((n) => !done.has(n));
  const report = { clubs: names.length, alreadyDone: done.size, remaining: todo.length, byCompetition: {}, cached: 0, linkOnly: 0, unmatched: [], notes: [] };
  if (!todo.length) return NextResponse.json({ ...report, notes: ["all clubs are done"] });

  const { lists, report: listReport } = await loadLists(db, token);
  report.byCompetition = listReport;

  for (let i = 0; i < todo.length; i += 8) {
    if (Date.now() > deadline) { report.notes.push(`time budget used; re-run to finish (${todo.length - i} left)`); break; }
    await Promise.all(todo.slice(i, i + 8).map(async (name) => {
      const team = bestTeam(name, lists);
      if (!team) { report.unmatched.push(name); return; }
      let badge = team.crest;
      try {
        const img = await fetch(team.crest, { signal: AbortSignal.timeout(8000) });
        if (img.ok) {
          const type = img.headers.get("content-type") ?? "image/png";
          const path = `${slug(name)}.${type.includes("svg") ? "svg" : "png"}`;
          const { error } = await db.storage.from("crests").upload(path, Buffer.from(await img.arrayBuffer()), { upsert: true, contentType: type });
          if (!error) { badge = db.storage.from("crests").getPublicUrl(path).data.publicUrl; report.cached++; }
          else report.notes.push(`${name}: storage ${error.message}`);
        }
      } catch { /* keep the provider link */ }
      if (badge === team.crest) report.linkOnly++;
      const { error: upErr } = await db.from("team_crests").upsert({ name, badge, fd_team_id: team.id, source: "auto", fetched_at: new Date().toISOString() }, { onConflict: "name" });
      if (upErr) report.notes.push(`${name}: ${upErr.message}`);
    }));
  }
  return NextResponse.json(report);
}
