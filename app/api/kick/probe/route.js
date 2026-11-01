import { NextResponse } from "next/server";
import { ASSETS, SOURCE, fetchCandles } from "@/lib/kick/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// /api/kick/probe?secret=CRON_SECRET : checks every Kick price source from the server, and reports what came back.
export async function GET(req) {
  if (!process.env.CRON_SECRET || new URL(req.url).searchParams.get("secret") !== process.env.CRON_SECRET) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const out = { source: SOURCE.name, assets: {} };
  for (const a of Object.keys(ASSETS)) {
    try {
      const c = await fetchCandles(a);
      const last = c[c.length - 1];
      out.assets[a] = { pair: ASSETS[a].pair, candles: c.length, newest: last ? new Date(last.t).toISOString() : null, lastClose: last?.close ?? null, ok: c.length >= 30 };
    } catch (e) { out.assets[a] = { pair: ASSETS[a].pair, ok: false, error: String(e.message ?? e).slice(0, 160) }; }
  }
  out.allOk = Object.values(out.assets).every((x) => x.ok);
  return NextResponse.json(out);
}
