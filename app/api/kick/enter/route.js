import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { placeKick } from "@/lib/kick/place";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { roundId, side: "long"|"short", amount }  ->  a manual kick.
export async function POST(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();
  const { data: prof } = await db.from("profiles").select("kick_address").eq("id", user.id).maybeSingle();
  if (!prof?.kick_address) return NextResponse.json({ error: "Claim testnet KICK without a wallet first." }, { status: 400 });
  const { data: round } = await db.from("kick_rounds").select("*").eq("id", body.roundId).maybeSingle();
  if (!round?.chain_object_id) return NextResponse.json({ error: "That round is not open on-chain." }, { status: 404 });
  if (round.kind === "fixed") return NextResponse.json({ error: "This market uses fixed odds. Use the fixed-odds kick." }, { status: 400 });
  const r = await placeKick({ db, userId: user.id, round, side: body.side, amount: body.amount });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, testnetTx: r.testnetTx, receipt: r.receipt, amount: r.amount });
}
