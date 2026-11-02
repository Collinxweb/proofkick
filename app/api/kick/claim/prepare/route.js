import { NextResponse } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { kickClient, kickConfig, ADDRESS_RE } from "@/lib/kick/chain";
import { sponsorSigner, dailyCap, sponsoredToday, hashBytes } from "@/lib/kick/sponsor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Builds the claim with the app as gas sponsor, signs it as sponsor, and returns both to the wallet to approve.
export async function POST(req) {
  const { sender } = await req.json().catch(() => ({}));
  if (!ADDRESS_RE.test(sender ?? "")) return NextResponse.json({ error: "Connect your Sui wallet first." }, { status: 400 });
  try {
    const db = supabaseAdmin();
    if ((await sponsoredToday(db, "claim")) >= dailyCap()) {
      return NextResponse.json({ error: "Today's free testnet claims are used up. Try again tomorrow." }, { status: 429 });
    }
    const { packageId, faucetId } = kickConfig();
    const sponsor = sponsorSigner();
    const tx = new Transaction();
    tx.setSender(sender);
    tx.setGasOwner(sponsor.toSuiAddress());
    tx.moveCall({ target: `${packageId}::kick_token::claim`, arguments: [tx.object(faucetId)] });
    const bytes = await tx.build({ client: kickClient() });
    const buf = Buffer.from(bytes);
    const { signature: sponsorSignature } = await sponsor.signTransaction(buf);
    const { error } = await db.from("kick_sponsored_txs").insert({ sender, kind: "claim", bytes_hash: hashBytes(buf) });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bytes: buf.toString("base64"), sponsorSignature });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 200) }, { status: 500 });
  }
}
