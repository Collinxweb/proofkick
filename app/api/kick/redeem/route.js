import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { kickConfig } from "@/lib/kick/chain";
import { runAsAccount } from "@/lib/kick/tx";
import { custodialKeypair } from "@/lib/kick/custodial";
import { payoutFor } from "@/lib/kick/rounds";
import { sponsoredToday } from "@/lib/kick/sponsor";
import { dailyCap, hashBytes } from "@/lib/kick/sponsor-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { roundId }  ->  withdraws the account's winnings (or refund) from a settled or voided round.
export async function POST(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();
  try {
    const { data: prof } = await db.from("profiles").select("kick_address").eq("id", user.id).maybeSingle();
    if (!prof?.kick_address) return NextResponse.json({ error: "No testnet account found." }, { status: 400 });
    const address = custodialKeypair(user.id).toSuiAddress();
    const { data: round } = await db.from("kick_rounds").select("*").eq("id", body.roundId).maybeSingle();
    if (!round?.chain_object_id) return NextResponse.json({ error: "Round not found." }, { status: 404 });
    if (!["settled", "void"].includes(round.state)) return NextResponse.json({ error: "This round has not settled yet." }, { status: 409 });
    const { data: mine } = await db.from("kick_entries").select("id, side, stake, payout_testnet_tx").eq("round_id", round.id).eq("user_id", user.id);
    const todo = (mine ?? []).filter((e) => !e.payout_testnet_tx);
    if (!todo.length) return NextResponse.json({ error: "Nothing to withdraw from this round." }, { status: 400 });
    if ((await sponsoredToday(db, "redeem")) >= dailyCap()) return NextResponse.json({ error: "Today's free testnet transactions are used up. Try again tomorrow." }, { status: 429 });

    const { packageId } = kickConfig();
    const { digest, bytes } = await runAsAccount(user.id, address, (tx) => {
      tx.moveCall({ target: `${packageId}::rounds::redeem`, arguments: [tx.object(round.chain_object_id)] });
    });
    await db.from("kick_sponsored_txs").insert({ sender: address, kind: "redeem", bytes_hash: hashBytes(bytes) });

    const outcome = round.state === "void" ? "void" : round.outcome;
    let total = 0;
    for (const e of todo) {
      const payout = payoutFor({ side: e.side, stake: Number(e.stake) }, outcome, Number(round.long_pool), Number(round.short_pool));
      total += payout;
      await db.from("kick_entries").update({ payout, status: outcome === "void" ? "refunded" : payout > 0 ? "won" : "lost", payout_testnet_tx: digest, settle_digest: digest }).eq("id", e.id);
    }
    return NextResponse.json({ ok: true, testnetTx: digest, paid: total });
  } catch (e) {
    return NextResponse.json({ error: e.onchain ? `Withdraw failed on testnet: ${e.message.slice(0, 160)}` : String(e.message ?? e).slice(0, 200) }, { status: e.onchain ? 422 : 500 });
  }
}
