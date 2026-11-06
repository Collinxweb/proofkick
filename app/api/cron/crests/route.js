import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LEAGUE_TO_FD } from "@/lib/proof/grade";
import { competitionTeams, bestTeam } from "@/lib/crests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const CACHED = "/object/public/crests/";

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
  const { data: rows } = names.length ? await db.from("team_crests").select("name, badge, source").in("name", names) : { data: [] };
  const done = new Set((rows ?? []).filter((r) => r.source === "manual" || (r.badge ?? "").includes(CACHED)).map((r) => r.name));
  const todo = names.filter((n) => !done.has(n));
  const report = { clubs: names.length, alreadyDone: done.size, remaining: todo.length, byCompetition: {}, cached: 0, linkOnly: 0, unmatched: [], notes: [] };
  if (!todo.length) return NextResponse.json({ ...report, notes: ["all clubs are done"] });

  // Six competition lists at once: well inside the free limit of 10 requests a minute.
  const lists = [];
  await Promise.all(Object.values(LEAGUE_TO_FD).map(async (code) => {
    try { const teams = await competitionTeams(code, token); lists.push(...teams); report.byCompetition[code] = teams.length; }
    catch (e) { report.byCompetition[code] = String(e.message ?? e).slice(0, 80); }
  }));

  // Clubs in parallel batches of 8, stopping before the time limit.
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
