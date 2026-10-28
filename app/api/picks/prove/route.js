import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { proveProof } from "@/lib/proof/prove";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { pickId }: signed-in owner of the pick, or the cron secret. Safe to call repeatedly.
export async function POST(req) {
  const { pickId } = await req.json().catch(() => ({}));
  if (!pickId) return NextResponse.json({ error: "pickId required" }, { status: 400 });
  const db = supabaseAdmin();
  const secret = process.env.CRON_SECRET;
  const isCron = Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
  if (!isCron) {
    const { data: { user } } = await supabaseServer().auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: own } = await db.from("picks").select("user_id").eq("id", pickId).maybeSingle();
    if (!own || own.user_id !== user.id) return NextResponse.json({ error: "Not your pick." }, { status: 403 });
  }
  return NextResponse.json(await proveProof(db, pickId));
}
