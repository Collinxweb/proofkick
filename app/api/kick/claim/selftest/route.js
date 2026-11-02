import { NextResponse } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { kickClient, kickConfig } from "@/lib/kick/chain";
import { sponsorSigner } from "@/lib/kick/sponsor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Diagnostic only: runs the claim for the app's own admin wallet, with no user wallet and no sponsorship.
// If this works, the contract is fine and the problem is in the wallet step. Open with ?secret=CRON_SECRET.
export async function GET(req) {
  if (!process.env.CRON_SECRET || new URL(req.url).searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const { packageId, faucetId } = kickConfig();
    const signer = sponsorSigner();
    const tx = new Transaction();
    tx.setSender(signer.toSuiAddress());
    tx.moveCall({ target: `${packageId}::kick_token::claim`, arguments: [tx.object(faucetId)] });
    const res = await kickClient().signAndExecuteTransaction({ transaction: tx, signer, include: { effects: true } });
    const done = res.Transaction ?? res.FailedTransaction;
    return NextResponse.json({
      address: signer.toSuiAddress(),
      success: Boolean(done?.status?.success),
      error: done?.status?.error ?? null,
      digest: done?.digest ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 400) }, { status: 500 });
  }
}
