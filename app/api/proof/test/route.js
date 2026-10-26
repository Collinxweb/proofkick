import { NextResponse } from "next/server";
import { hashRecord, hex } from "@/lib/proof/hash";
import { mintReceipt, serverAddress } from "@/lib/sui/anchor";
import { readReceipt } from "@/lib/sui/read";
import { getClient } from "@/lib/sui/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const within = (p, ms = 8000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

// Temporary smoke test: ?secret=CRON_SECRET plus one of env=1 | diag=1 | verify=<objectId> | nothing (mints). Optional via=tatum|public.
export async function GET(req) {
  const u = new URL(req.url);
  if (u.searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const via = ["tatum", "public"].includes(u.searchParams.get("via")) ? u.searchParams.get("via") : undefined;

  if (u.searchParams.get("env")) {
    const names = ["TATUM_API_KEY", "SERVER_SUI_KEY", "PACKAGE_ID", "CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY"];
    return NextResponse.json(Object.fromEntries(names.map((n) => [n, Boolean(process.env[n])])));
  }

  if (u.searchParams.get("diag")) {
    let addr = "0x0";
    try { addr = serverAddress(); } catch {}
    const tests = {
      getObject: (c) => c.core.getObject({ objectId: "0x6" }),
      referenceGasPrice: (c) => c.core.getReferenceGasPrice(),
      listCoins: (c) => c.core.listCoins({ owner: addr, coinType: "0x2::sui::SUI" }),
    };
    const results = {};
    for (const v of ["tatum", "public"]) {
      results[v] = {};
      for (const [name, fn] of Object.entries(tests)) {
        try { await within(fn(getClient(v))); results[v][name] = "ok"; } catch (e) { results[v][name] = String(e.message ?? e).slice(0, 90); }
        await sleep(400);
      }
    }
    return NextResponse.json({ server: addr, results });
  }

  try {
    const verify = u.searchParams.get("verify");
    if (verify) return NextResponse.json({ receipt: await readReceipt(verify, via) });
    const record = { app: "proofkick", test: true, at: Date.now() };
    const recordHash = hashRecord(record);
    const out = await mintReceipt({ kind: 0, strategyId: "test", recordHash, tsMs: Date.now(), via });
    let receipt = null, readError = null;
    for (let i = 0; i < 4 && out.objectId && !receipt; i++) {
      try { receipt = await readReceipt(out.objectId, out.via); } catch (e) { readError = String(e.message ?? e).slice(0, 160); }
      if (!receipt) await sleep(1200);
    }
    return NextResponse.json({
      server: serverAddress(), ...out, hash: hex(recordHash),
      onchainMatches: receipt?.recordHash === hex(recordHash), immutable: receipt?.immutable, receipt, readError,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e), stack: String(e.stack ?? "").split("\n").slice(0, 5) }, { status: 500 });
  }
}
