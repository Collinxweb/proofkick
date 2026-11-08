import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openRounds, settleExpired, retryOpenRecords, planAt } from "@/lib/kick/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Order matters: settle the expired rounds first, then open new ones, then write mainnet records with whatever time is left.
// GET ?secret=CRON_SECRET                 -> the daily run: settle, open, record
// GET ?secret=...&step=reset               -> archive open rounds, then open a fresh set starting now
// GET ?secret=...&step=reset&start=<ms>    -> open the set at a fixed start, without archiving again
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const now = Date.now();
  const deadline = now + 40_000;
  const db = supabaseAdmin();
  const step = u.searchParams.get("step") ?? "daily";
  const out = { at: new Date(now).toISOString(), step };

  if (step === "reset") {
    const given = u.searchParams.get("start");
    if (!given) {
      const { error } = await db.from("kick_rounds").update({ archived: true }).eq("state", "open").eq("archived", false).eq("kind", "pool");
      if (error) return NextResponse.json({ error: `could not archive: ${error.message}` }, { status: 500 });
      out.archived = true;
    }
    const start = given ? Number(given) : Math.floor(now / 60000) * 60000;
    out.start = start;
    out.opened = await openRounds(db, now, deadline, planAt(start));
    out.records = await retryOpenRecords(db, deadline);
    return NextResponse.json(out);
  }

  out.settled = await settleExpired(db, now, deadline);
  out.opened = await openRounds(db, now, deadline);
  out.records = await retryOpenRecords(db, deadline);
  return NextResponse.json(out);
}
