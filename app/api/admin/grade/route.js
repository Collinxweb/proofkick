import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { settle } from "@/lib/proof/grade";
import { settlePendingSlips } from "@/lib/history/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Demo-slate grading by hand: /api/admin/grade?secret=CRON_SECRET&pick=<pickId>&home=2&away=1   (or fixture=<id>, or &void=1)
// Grades every pending call on the match, then settles every multi that is now final, so slips never lag behind their legs.
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let id = u.searchParams.get("fixture");
  const pickId = u.searchParams.get("pick");
  const isVoid = u.searchParams.get("void") === "1";
  const h = Number(u.searchParams.get("home")), a = Number(u.searchParams.get("away"));
  if (!id && !pickId) return NextResponse.json({ error: "pass fixture=<id> or pick=<pickId>, plus integer home and away (or void=1)" }, { status: 400 });
  if (!isVoid && !(Number.isInteger(h) && Number.isInteger(a) && h >= 0 && a >= 0)) return NextResponse.json({ error: "home and away must be whole numbers" }, { status: 400 });
  const db = supabaseAdmin();
  if (!id && pickId) id = (await db.from("picks").select("fixture_id").eq("id", pickId).maybeSingle()).data?.fixture_id;
  const { data: fx } = await db.from("fixtures").select("id, home_team, away_team, kickoff_at").eq("id", id).maybeSingle();
  if (!fx) return NextResponse.json({ error: "fixture not found" }, { status: 404 });
  if (new Date(fx.kickoff_at) > new Date()) return NextResponse.json({ error: "kick-off has not happened yet" }, { status: 409 });
  if (!isVoid) await db.from("fixtures").update({ status: "finished", home_goals: h, away_goals: a }).eq("id", id);
  const { data: calls } = await db.from("picks").select("id, selection").eq("fixture_id", id).eq("status", "pending");
  let graded = 0;
  for (const c of calls ?? []) {
    const out = isVoid ? { result: "void" } : settle(c.selection, { status: "FINISHED", score: { duration: "REGULAR", fullTime: { home: h, away: a } } });
    const upd = { status: out.result, graded_at: new Date().toISOString(), settled_at: new Date().toISOString(), grader: "manual (demo slate)" };
    if (out.result !== "void") Object.assign(upd, { final_home: h, final_away: a });
    const { error } = await db.from("picks").update(upd).eq("id", c.id).eq("status", "pending");
    if (!error) graded++;
  }
  // Settle every multi that is now final, so the slip result matches its legs.
  const slips = await settlePendingSlips(db);
  return NextResponse.json({ match: `${fx.home_team} vs ${fx.away_team}`, graded, slipsSettled: slips.length, note: "Result blobs and Sui receipts are written by the grading cron, or open /api/cron/grade?secret=... to run it now." });
}
