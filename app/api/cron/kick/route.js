import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openRounds, settleExpired, retryOpenRecords, planAt } from "@/lib/kick/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Only one run at a time. The lock is taken atomically, so two overlapping calls can't both open the same round.
async function takeLock(db, now) {
  const { data, error } = await db.from("kick_job_lock")
    .update({ locked_until: new Date(now + 120_000).toISOString() })
    .eq("name", "daily").lt("locked_until", new Date(now).toISOString()).select("name");
  if (error) throw error;
  return (data ?? []).length > 0;
}
async function releaseLock(db) {
  await db.from("kick_job_lock").update({ locked_until: new Date(0).toISOString() }).eq("name", "daily");
}

// Order: settle expired rounds, open new ones, then write mainnet records with the time left.
// GET ?secret=CRON_SECRET                 -> the scheduled run. Safe to call every 5 minutes.
// GET ?secret=...&step=reset               -> archive open pool rounds, then open a fresh set starting now
// GET ?secret=...&step=reset&start=<ms>    -> open the set at a fixed start, without archiving again
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const now = Date.now();
  const db = supabaseAdmin();
  const step = u.searchParams.get("step") ?? "daily";
  if (!(await takeLock(db, now))) {
    return NextResponse.json({ at: new Date(now).toISOString(), step, skipped: "another run is in progress" });
  }
  try {
    const deadline = now + 40_000;
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
  } finally {
    await releaseLock(db);
  }
}
