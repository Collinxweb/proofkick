import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSlip } from "@/lib/history/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { pickIds: [...], stake?: "10.00" }  ->  a recorded (no stake) or staked slip of your own locked picks.
export async function POST(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a slip." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const pickIds = Array.isArray(b.pickIds) ? b.pickIds.map(String) : [];
  const r = await createSlip(supabaseAdmin(), user.id, { stake: b.stake ?? null, pickIds });
  if (r.error) return NextResponse.json(r, { status: 422 });
  return NextResponse.json(r);
}
