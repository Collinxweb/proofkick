import { NextResponse } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { kickClient, ADDRESS_RE } from "@/lib/kick/chain";
import { buildClaimKind } from "@/lib/kick/claim";
import { sponsorSigner, sponsoredToday } from "@/lib/kick/sponsor";
import { dailyCap, hashBytes } from "@/lib/kick/sponsor-rules";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Step 2: the app adds gas and signs as sponsor, but only for the exact claim it built. Then the wallet signs the full transaction.
export async function POST(req) {
  const { sender, kind } = await req.json().catch(() => ({}));
  if (!ADDRESS_RE.test(sender ?? "") || !kind) return NextResponse.json({ error: "Missing claim details." }, { status: 400 });
  try {
    const db = supabaseAdmin();
    if ((await sponsoredToday(db, "claim")) >= dailyCap()) {
      return NextResponse.json({ error: "Today's free testnet claims are used up. Try again tomorrow." }, { status: 429 });
    }
    const expected = await buildClaimKind();
    if (!Buffer.from(kind, "base64").equals(expected)) {
      return NextResponse.json({ error: "This is not the claim ProofKick prepared." }, { status: 403 });
    }
    const sponsor = sponsorSigner();
    const tx = Transaction.fromKind(Buffer.from(kind, "base64"));
    tx.setSender(sender);
    tx.setGasOwner(sponsor.toSuiAddress());
    const full = Buffer.from(await tx.build({ client: kickClient() }));
    const { signature: sponsorSignature } = await sponsor.signTransaction(full);
    const { error } = await db.from("kick_sponsored_txs").insert({ sender, kind: "claim", bytes_hash: hashBytes(full) });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bytes: full.toString("base64"), sponsorSignature });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 200) }, { status: 500 });
  }
}
