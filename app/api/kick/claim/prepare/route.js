import { NextResponse } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { kickClient, kickConfig, ADDRESS_RE } from "@/lib/kick/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Builds the unsigned claim transaction for the wallet that will sign it. Nothing is signed or sent here.
export async function POST(req) {
  const { sender } = await req.json().catch(() => ({}));
  if (!ADDRESS_RE.test(sender ?? "")) return NextResponse.json({ error: "Connect your Sui wallet first." }, { status: 400 });
  try {
    const { packageId, faucetId } = kickConfig();
    const tx = new Transaction();
    tx.setSender(sender);
    tx.moveCall({ target: `${packageId}::kick_token::claim`, arguments: [tx.object(faucetId)] });
    const bytes = await tx.build({ client: kickClient() });
    return NextResponse.json({ bytes: Buffer.from(bytes).toString("base64") });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 200) }, { status: 500 });
  }
}
