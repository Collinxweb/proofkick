import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openRounds, retryOpenRecords, settleExpired, planAt } from "@/lib/kick/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/kick?secret=CRON_SECRET[&step=open|settle]
// Daily from Vercel cron, and manually for "settle now". Stops at about 50 seconds; re-run if it says "re-run".
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const u = new URL(req.url);
  if (!secret || (u.searchParams.get("secret") !== secret && req.headers.get("authorization") !== `Bearer ${secret}`)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const step = u.searchParams.get("step") ?? "all";
  const now = Date.now();
  const deadline = now + 50_000;
  const db = supabaseAdmin();
  const out = {};
  try {
    if (step === "all" || step === "open") {
      out.retried = await retryOpenRecords(db, deadline);
      out.opened = await openRounds(db, now, deadline);
    }
    if (step === "reset") {
      // First call archives the open rounds (they still settle at expiry) and fixes the new start time.
      // Re-run with the returned start to open the remaining rounds without archiving again.
      const given = u.searchParams.get("start");
      const start = given ? Number(given) : Math.floor(now / 60000) * 60000;
      if (!given) await db.from("kick_rounds").update({ archived: true }).eq("archived", false).eq("state", "open");
      out.start = start;
      out.opened = await openRounds(db, now, deadline, planAt(start));
      return NextResponse.json({ at: new Date(now).toISOString(), ...out });
    }
    if (step === "all" || step === "settle") out.settled = await settleExpired(db, now, deadline);
    return NextResponse.json({ at: new Date(now).toISOString(), ...out });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 300), partial: out }, { status: 500 });
  }
}
