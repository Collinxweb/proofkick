import { NextResponse } from "next/server";
import { hashRecord, hex } from "@/lib/proof/hash";
import { mintReceipt, serverAddress } from "@/lib/sui/anchor";
import { readReceipt } from "@/lib/sui/read";
import { rpc } from "@/lib/sui/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Temporary smoke test: /api/proof/test?secret=CRON_SECRET  (add &verify=<objectId> to re-read one). Delete once real anchoring ships.
export async function GET(req) {
  const u = new URL(req.url);
  if (u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (u.searchParams.get("env")) {
    const names = ["SUI_NETWORK", "SUI_RPC_URL", "TATUM_API_KEY", "SERVER_SUI_KEY", "PACKAGE_ID", "CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY"];
    return NextResponse.json(Object.fromEntries(names.map((n) => [n, Boolean(process.env[n])])));
  }
  if (u.searchParams.get("diag")) {
    const addr = (() => { try { return serverAddress(); } catch { return "0x0"; } })();
    const probes = [["sui_getChainIdentifier", []], ["sui_getLatestCheckpointSequenceNumber", []], ["suix_getReferenceGasPrice", []], ["suix_getBalance", [addr]], ["suix_getCoins", [addr, "0x2::sui::SUI", null, 1]]];
    const out = {};
    for (const [m, p] of probes) { try { await rpc(m, p); out[m] = "ok"; } catch (e) { out[m] = String(e.message); } }
    return NextResponse.json({ server: addr, methods: out });
  }
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
