import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { validateStrategy } from "@/lib/kick/strategy-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A missing table means the database update has not been run yet. Say that in plain words.
function plainDbError(message = "") {
  if (/schema cache|does not exist|could not find the table/i.test(message)) {
    return "Kick strategies need a database update. Run db/019_kick_strategy.sql in the Supabase SQL Editor, then save again.";
  }
  return "The strategy could not be saved. Try again, and if it keeps failing, send support the time you tried.";
}

// POST { asset, horizon, rule, threshold, stake } creates a strategy. PATCH { id, active } pauses or resumes one.
export async function POST(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const db = supabaseAdmin();
  const { data: prof } = await db.from("profiles").select("kick_address").eq("id", user.id).maybeSingle();
  if (!prof?.kick_address) return NextResponse.json({ error: "Get testnet KICK first. Strategies kick from your testnet account." }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const v = validateStrategy(b);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const { data, error } = await db.from("kick_strategies")
    .insert({ user_id: user.id, asset: b.asset, horizon: b.horizon, rule: b.rule, threshold: v.threshold, stake: v.stake })
    .select("id").single();
  if (error) return NextResponse.json({ error: plainDbError(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const { error } = await supabaseAdmin().from("kick_strategies").update({ active: Boolean(b.active) }).eq("id", b.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: plainDbError(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
