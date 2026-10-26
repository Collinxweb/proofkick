import { NextResponse } from "next/server";
import { hashRecord, hex } from "@/lib/proof/hash";
import { mintReceipt, serverAddress, safe } from "@/lib/sui/anchor";
import { readReceipt } from "@/lib/sui/read";
import { getClient } from "@/lib/sui/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const within = (p, ms = 8000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

// Temporary smoke test. ?secret=CRON_SECRET  plus one of: env=1 | diag=1 | verify=<objectId> | (nothing = mint). Optional mode=web|native.
export async function GET(req) {
  const u = new URL(req.url);
  if (u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const mode = u.searchParams.get("mode") || undefined;
  if (u.searchParams.get("env")) {
    const names = ["TATUM_API_KEY", "SERVER_SUI_KEY", "PACKAGE_ID", "CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "SUI_GRPC_MODE"];
    return NextResponse.json(Object.fromEntries(names.map((n) => [n, Boolean(process.env[n])])));
  }
  if (u.searchParams.get("diag")) {
    const probes = [["sui_getObject", ["0x6"]], ["sui_multiGetObjects", [["0x6"]]], ["sui_getProtocolConfig", []], ["sui_getTotalTransactionBlocks", []],
      ["sui_getTransactionBlock", ["11111111111111111111111111111111"]], ["sui_executeTransactionBlock", ["", [], null, null]], ["sui_dryRunTransactionBlock", [""]],
      ["suix_getReferenceGasPrice", []], ["suix_getCoins", ["0x0"]]];
    const out = {};
    for (const [m, p] of probes) {
      try { await rpc(m, p); out[m] = "offered (ok)"; } catch (e) {
        const msg = String(e.message);
        out[m] = /HTTP 404|not found/i.test(msg) ? "NOT OFFERED by Tatum" : `offered (${msg.slice(0, 60)})`;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    let server = null; try { server = serverAddress(); } catch {}
    return NextResponse.json({ server, methods: out });
  }
  try {
    const verify = u.searchParams.get("verify");
    if (verify) return NextResponse.json({ receipt: await readReceipt(verify, mode) });
    const record = { app: "proofkick", test: true, at: Date.now() };
    const recordHash = hashRecord(record);
    const out = await mintReceipt({ kind: 0, strategyId: "test", recordHash, tsMs: Date.now(), mode });
    let receipt = null, readError;
    if (out.objectId) { try { receipt = await readReceipt(out.objectId, mode); } catch (e) { readError = String(e.message).slice(0, 200); } }
    return NextResponse.json({
      server: serverAddress(), ...out, hash: hex(recordHash),
      onchainMatches: receipt?.recordHash === hex(recordHash), immutable: receipt?.immutable, receipt, readError,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e), stack: String(e.stack ?? "").split("\n").slice(0, 6) }, { status: 500 });
  }
}
