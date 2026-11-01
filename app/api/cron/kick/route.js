import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openRounds, retryOpenRecords, settleExpired } from "@/lib/kick/ops";

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
    if (step === "all" || step === "settle") out.settled = await settleExpired(db, now, deadline);
    return NextResponse.json({ at: new Date(now).toISOString(), ...out });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 300), partial: out }, { status: 500 });
  }
}
