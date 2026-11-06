import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchCandles } from "@/lib/kick/prices";
import { momentum } from "@/lib/kick/chance";
import { quoteKeypair, quoteMessage, chanceBps, fixedPayout, QUOTE_TTL_MS } from "@/lib/kick/quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST { roundId, side: "long"|"short" } -> a signed quote for one fixed-odds kick, valid for about 50 seconds.
export async function POST(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!["long", "short"].includes(b.side)) return NextResponse.json({ error: "Choose GREEN or RED." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: round } = await db.from("kick_rounds").select("*").eq("id", b.roundId).maybeSingle();
  if (!round || round.kind !== "fixed" || !round.chain_object_id) return NextResponse.json({ error: "Not a fixed-odds round." }, { status: 404 });
  const now = Date.now();
  if (round.state !== "open" || now < Date.parse(round.opens_at) || now >= Date.parse(round.entry_closes_at)) {
    return NextResponse.json({ error: "Kicks are closed for this round." }, { status: 409 });
  }
  const candles = await fetchCandles(round.asset);
  const last = candles.length ? candles[candles.length - 1].close : null;
  const mom = last ? momentum({ candles, openPrice: Number(round.open_price), currentPrice: last }) : { upPct: null };
  if (mom.upPct == null) return NextResponse.json({ error: "Price not available right now. Try again." }, { status: 503 });
  const side = b.side === "long" ? 1 : 2;
  const chance = chanceBps(mom.upPct, b.side);
  const validUntil = now + QUOTE_TTL_MS;
  const sig = await quoteKeypair().sign(quoteMessage(round.chain_object_id, side, chance, validUntil));
  return NextResponse.json({
    side, chanceBps: chance, chancePct: chance / 100, validUntil,
    payoutPer1000: fixedPayout(1000, chance), signature: Array.from(sig),
  });
}
