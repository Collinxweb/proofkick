import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openFixedRounds, settleFixedExpired } from "@/lib/kick/fixed-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET ?secret=CRON_SECRET&step=all|settle|open. Run once a day at 12:06 UTC from an outside pinger.
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const step = u.searchParams.get("step") ?? "all";
  const now = Date.now();
  const deadline = now + 34_000;
  const db = supabaseAdmin();
  const out = { at: new Date(now).toISOString(), step };
  if (step === "settle" || step === "all") out.settled = await settleFixedExpired(db, now, deadline);
  if (step === "open" || step === "all") out.opened = await openFixedRounds(db, now, deadline);
  return NextResponse.json(out);
}
