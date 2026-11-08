import { NextResponse } from "next/server";
import { coinWithBalance } from "@mysten/sui/transactions";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { kickConfig } from "@/lib/kick/chain";
import { kickBalance } from "@/lib/kick/balance";
import { validateEntry } from "@/lib/kick/entry-rules";
import { runAsAccount } from "@/lib/kick/tx";
import { sponsoredToday } from "@/lib/kick/sponsor";
import { dailyCap, hashBytes } from "@/lib/kick/sponsor-rules";
import { fetchCandles } from "@/lib/kick/prices";
import { momentum } from "@/lib/kick/chance";
import { quoteKeypair, quoteMessage, chanceBps, fixedPayout, QUOTE_TTL_MS } from "@/lib/kick/quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { roundId, side: "long"|"short", amount } -> one fixed-odds kick at the price right now.
export async function POST(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  const { data: prof } = await db.from("profiles").select("kick_address").eq("id", user.id).maybeSingle();
  if (!prof?.kick_address) return NextResponse.json({ error: "Claim testnet KICK without a wallet first." }, { status: 400 });
  const { data: round } = await db.from("kick_rounds").select("*").eq("id", b.roundId).maybeSingle();
  if (!round || round.kind !== "fixed" || !round.chain_object_id) return NextResponse.json({ error: "That is not a fixed-odds market." }, { status: 404 });
  const cfg = process.env.KICK_FIXED_CONFIG_ID?.trim();
  if (!cfg) return NextResponse.json({ error: "Fixed-odds kicks are not set up yet." }, { status: 503 });

  const now = Date.now();
  const candles = await fetchCandles(round.asset);
  const last = candles.length ? candles[candles.length - 1].close : null;
  const mom = last ? momentum({ candles, openPrice: Number(round.open_price), currentPrice: last }) : { upPct: null };
  if (mom.upPct == null) return NextResponse.json({ error: "Price not available right now. Try again." }, { status: 503 });

  const address = prof.kick_address;
  const balance = await kickBalance(address);
  const check = validateEntry({
    side: b.side, amount: b.amount, balance, state: round.state,
    opensAt: Date.parse(round.opens_at), entryClosesAt: Date.parse(round.entry_closes_at), now,
  });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
  if ((await sponsoredToday(db, "kick")) >= dailyCap()) {
    return NextResponse.json({ error: "Today's free testnet transactions are used up. Try again tomorrow." }, { status: 429 });
  }

  const { packageId } = kickConfig();
  const chance = chanceBps(mom.upPct, b.side);
  const validUntil = now + QUOTE_TTL_MS;
  const sig = Array.from(await quoteKeypair().sign(quoteMessage(round.chain_object_id, check.side, chance, validUntil)));

  let res;
  try {
    res = await runAsAccount(user.id, address, (tx) => {
      const stake = coinWithBalance({ type: `${packageId}::kick_token::KICK_TOKEN`, balance: check.units });
      tx.moveCall({
        target: `${packageId}::fixed::kick_fixed`,
        arguments: [
          tx.object(round.chain_object_id),
          tx.object(cfg),
          stake,
          tx.pure.u8(check.side),
          tx.pure.u64(chance),
          tx.pure.u64(validUntil),
          tx.pure.vector("u8", sig),
          tx.object.clock(),
        ],
      });
    });
  } catch (e) {
    return NextResponse.json({ error: `Kick failed on testnet: ${String(e.message).slice(0, 160)}` }, { status: 422 });
  }

  await db.from("kick_sponsored_txs").insert({ sender: address, kind: "kick", bytes_hash: hashBytes(res.bytes) });
  const payout = fixedPayout(check.amount, chance);
  const { error: insErr } = await db.from("kick_entries").insert({
    round_id: round.id, user_id: user.id, side: b.side, stake: check.amount, status: "open",
    kick_testnet_tx: res.digest, entry_price: last, payout,
  });
  if (insErr) {
    return NextResponse.json({ error: `Kick went on-chain (${res.digest}) but was not saved: ${insErr.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, amount: check.amount, chancePct: chance / 100, payout, testnetTx: res.digest });
}
