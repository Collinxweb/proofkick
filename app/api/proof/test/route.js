import { NextResponse } from "next/server";
import { hashRecord, hex } from "@/lib/proof/hash";
import { mintReceipt, serverAddress } from "@/lib/sui/anchor";
import { readReceipt } from "@/lib/sui/read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary smoke test: /api/proof/test?secret=CRON_SECRET  (add &verify=<objectId> to re-read one). Delete once real anchoring ships.
export async function GET(req) {
  const u = new URL(req.url);
  if (u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const verify = u.searchParams.get("verify");
    if (verify) return NextResponse.json({ receipt: await readReceipt(verify) });
    const record = { app: "proofkick", test: true, at: Date.now() };
    const recordHash = hashRecord(record);
    const out = await mintReceipt({ kind: 0, strategyId: "test", recordHash, tsMs: Date.now() });
    const receipt = out.objectId ? await readReceipt(out.objectId) : null;
    return NextResponse.json({
      server: serverAddress(), ...out, hash: hex(recordHash),
      onchainMatches: receipt?.recordHash === hex(recordHash), immutable: receipt?.immutable, receipt,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e), stack: String(e.stack ?? "").split("\n").slice(0, 6) }, { status: 500 });
  }
}
