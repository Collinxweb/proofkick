import { NextResponse } from "next/server";
import { kickClient } from "@/lib/kick/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Submits a claim the wallet has already signed. The server only relays it; it never holds the wallet's key.
export async function POST(req) {
  const { bytes, signature } = await req.json().catch(() => ({}));
  if (!bytes || !signature) return NextResponse.json({ error: "Missing signed transaction." }, { status: 400 });
  try {
    const res = await kickClient().core.executeTransaction({
      transaction: Buffer.from(bytes, "base64"),
      signatures: [signature],
      include: { effects: true },
    });
    const done = res.Transaction ?? res.FailedTransaction;
    if (!done?.status?.success) {
      const why = String(done?.status?.error?.message ?? done?.status?.error ?? "");
      if (/abort/i.test(why)) return NextResponse.json({ error: "This wallet has already claimed its KICK. Each wallet can claim once." }, { status: 409 });
      return NextResponse.json({ error: `Claim failed on testnet: ${why.slice(0, 160) || "unknown reason"}` }, { status: 422 });
    }
    return NextResponse.json({ ok: true, digest: done.digest });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 200) }, { status: 500 });
  }
}
