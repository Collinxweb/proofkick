import { NextResponse } from "next/server";
import { kickClient } from "@/lib/kick/chain";
import { decideExecute, hashBytes } from "@/lib/kick/sponsor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Submits a claim the user's wallet signed, together with the sponsor's signature. Only transactions prepared here are accepted,
// and each is accepted once: the bytes must match a stored hash that has not been used.
export async function POST(req) {
  const { bytes, signature, sponsorSignature } = await req.json().catch(() => ({}));
  if (!bytes || !signature || !sponsorSignature) return NextResponse.json({ error: "Missing signed transaction." }, { status: 400 });
  const buf = Buffer.from(bytes, "base64");
  const db = supabaseAdmin();
  const { data: row } = await db.from("kick_sponsored_txs").select("id, used_at").eq("bytes_hash", hashBytes(buf)).maybeSingle();
  const decision = decideExecute(row);
  if (!decision.ok) return NextResponse.json({ error: decision.error }, { status: 403 });
  const { data: claimed } = await db.from("kick_sponsored_txs").update({ used_at: new Date().toISOString() }).eq("id", row.id).is("used_at", null).select("id");
  if (!claimed?.length) return NextResponse.json({ error: "This claim was already submitted." }, { status: 409 });
  try {
    const res = await kickClient().core.executeTransaction({ transaction: buf, signatures: [signature, sponsorSignature], include: { effects: true } });
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
