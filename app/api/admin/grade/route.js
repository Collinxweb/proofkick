import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { settle } from "@/lib/proof/grade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Demo-slate grading by hand: /api/admin/grade?secret=CRON_SECRET&pick=<pickId>&home=2&away=1   (or fixture=<id>, or &void=1)
// Every call it grades is stamped grader "manual (demo slate)", and that label is written into the result blob.
// Production grading is the football-data.org cron, which stamps "football-data.org".
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let id = u.searchParams.get("fixture");
  const pickId = u.searchParams.get("pick"); // easier on a phone: pass any pick id of the match instead of the fixture id
  const isVoid = u.searchParams.get("void") === "1";
  const h = Number(u.searchParams.get("home")), a = Number(u.searchParams.get("away"));
  if ((!id && !pickId) || (!isVoid && !(Number.isInteger(h) && Number.isInteger(a) && h >= 0 && a >= 0))) return NextResponse.json({ error: "need fixture=<id> or pick=<pickId>, plus integer home and away (or void=1)" }, { status: 400 });
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
  return NextResponse.json({ match: `${fx.home_team} vs ${fx.away_team}`, graded, note: "Result blobs and Sui receipts are written by the grading cron, or open /api/cron/grade?secret=... to run it now." });
}
