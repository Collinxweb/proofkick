import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runTriggers } from "@/lib/strategy/trigger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/triggers?secret=CRON_SECRET  - run after the daily fixtures and stats refresh (or every few hours from a pinger).
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    return NextResponse.json(await runTriggers(supabaseAdmin()));
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 300) }, { status: 500 });
  }
}
