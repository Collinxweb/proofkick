import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runKickStrategies } from "@/lib/kick/strategy-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/kick-strategies?secret=CRON_SECRET. Run every 10 to 15 minutes from an outside pinger (cron-job.org).
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await runKickStrategies(supabaseAdmin()));
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 300) }, { status: 500 });
  }
}
