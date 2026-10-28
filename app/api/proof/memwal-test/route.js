import { NextResponse } from "next/server";
import { health, recallTest, saveRaw, memwalConfigured } from "@/lib/proof/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Temporary: /api/proof/memwal-test?secret=CRON_SECRET  ->  health, one write, one read back.
export async function GET(req) {
  if (new URL(req.url).searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!memwalConfigured()) return NextResponse.json({ error: "MEMWAL_DELEGATE_KEY and MEMWAL_ACCOUNT_ID must both be set" }, { status: 500 });
  const out = {};
  try {
    out.health = await health();
    const w = await saveRaw("pk-test", `proofkick:test\n{"at":${Date.now()}}`);
    out.write = { blob_id: w.blob_id, namespace: w.namespace };
    const r = await recallTest("pk-test", "proofkick test");
    out.read = { total: r.total, first: r.results?.[0]?.text?.slice(0, 60) ?? null };
  } catch (e) { out.error = String(e.message ?? e); out.name = e.name; }
  return NextResponse.json(out);
}
