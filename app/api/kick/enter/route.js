import { NextResponse } from "next/server";
import { coinWithBalance } from "@mysten/sui/transactions";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { kickConfig } from "@/lib/kick/chain";
import { kickBalance } from "@/lib/kick/balance";
import { runAsAccount } from "@/lib/kick/tx";
import { validateEntry } from "@/lib/kick/entry-rules";
import { impliedPct, kickState } from "@/lib/kick/rounds";
import { custodialKeypair } from "@/lib/kick/custodial";
import { sponsoredToday } from "@/lib/kick/sponsor";
import { dailyCap, hashBytes } from "@/lib/kick/sponsor-rules";
import { saveBlob } from "@/lib/proof/memory";
import { hashOf, toText } from "@/lib/proof/snapshot";
import { mintReceipt } from "@/lib/sui/anchor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { roundId, side: "long"|"short", amount }  ->  a kick on testnet, with a mainnet receipt for the kick.
export async function POST(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin();
  try {
    const { data: prof } = await db.from("profiles").select("kick_address").eq("id", user.id).maybeSingle();
    if (!prof?.kick_address) return NextResponse.json({ error: "Claim testnet KICK without a wallet first." }, { status: 400 });
    const address = custodialKeypair(user.id).toSuiAddress();
    const { data: round } = await db.from("kick_rounds").select("*").eq("id", body.roundId).maybeSingle();
    if (!round?.chain_object_id) return NextResponse.json({ error: "That round is not open on-chain." }, { status: 404 });
    const opensMs = Date.parse(round.opens_at), entryMs = Date.parse(round.entry_closes_at);
    const now = Date.now();
    const balance = await kickBalance(address);
    const check = validateEntry({ side: body.side, amount: body.amount, balance, state: round.state, opensAt: opensMs, entryClosesAt: entryMs, now });
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    if ((await sponsoredToday(db, "kick")) >= dailyCap()) return NextResponse.json({ error: "Today's free testnet transactions are used up. Try again tomorrow." }, { status: 429 });

    const { packageId } = kickConfig();
    const { digest, bytes } = await runAsAccount(user.id, address, (tx) => {
      const stake = coinWithBalance({ type: `${packageId}::kick_token::KICK_TOKEN`, balance: check.units });
      tx.moveCall({ target: `${packageId}::rounds::kick`, arguments: [tx.object(round.chain_object_id), stake, tx.pure.u8(check.side), tx.object.clock()] });
    });
    await db.from("kick_sponsored_txs").insert({ sender: address, kind: "kick", bytes_hash: hashBytes(bytes) });

    // Pools before this kick, for the receipt's implied chance.
    const { data: prior } = await db.from("kick_entries").select("side, stake").eq("round_id", round.id);
    const p = { long: 0, short: 0 };
    for (const e of prior ?? []) if (e.side === "long") p.long += Number(e.stake); else p.short += Number(e.stake);
    const implied = impliedPct(p.long, p.short);

    const { data: existing } = await db.from("kick_entries").select("id, stake").eq("round_id", round.id).eq("user_id", user.id).eq("side", body.side).maybeSingle();
    if (existing) {
      await db.from("kick_entries").update({ stake: Number(existing.stake) + check.amount, kick_testnet_tx: digest }).eq("id", existing.id);
    } else {
      await db.from("kick_entries").insert({ round_id: round.id, user_id: user.id, side: body.side, stake: check.amount, status: "open", kick_testnet_tx: digest });
    }
    const colum = body.side === "long" ? "long_pool" : "short_pool";
    await db.from("kick_rounds").update({ [colum]: (body.side === "long" ? p.long : p.short) + check.amount }).eq("id", round.id);

    // Mainnet record of this kick: Walrus snapshot plus Sui receipt. Failure here does not undo the kick.
    let receipt = null;
    try {
      const snap = { v: 1, kind: "kick-entry", round: round.id, side: body.side, amount: check.amount, implied_long_pct: implied.long, implied_short_pct: implied.short,
        testnet_tx: digest, account_address: address, at: new Date(now).toISOString() };
      const { blobId } = await saveBlob(user.id, toText("proofkick:kick-entry:v1", snap));
      const mainnet = await mintReceipt({ kind: 12, strategyId: round.id, recordHash: hashOf(snap), ref: blobId, tsMs: now });
      await db.from("kick_entries").update({ kick_snapshot_blob: blobId, kick_digest: mainnet.digest })
        .eq("round_id", round.id).eq("user_id", user.id).eq("side", body.side);
      receipt = mainnet.digest;
    } catch (e) {
      receipt = `failed: ${String(e.message ?? e).slice(0, 120)}`;
    }
    return NextResponse.json({ ok: true, testnetTx: digest, receipt, amount: check.amount });
  } catch (e) {
    return NextResponse.json({ error: e.onchain ? `Kick failed on testnet: ${e.message.slice(0, 160)}` : String(e.message ?? e).slice(0, 200) }, { status: e.onchain ? 422 : 500 });
  }
}
