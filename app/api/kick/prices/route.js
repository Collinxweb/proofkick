import { NextResponse } from "next/server";
import { ASSETS, fetchCandles } from "@/lib/kick/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Latest hourly close per asset from Kraken. Cached for a minute at the edge.
export async function GET() {
  const keys = Object.keys(ASSETS);
  const results = await Promise.allSettled(keys.map((a) => fetchCandles(a)));
  const out = {};
  keys.forEach((k, i) => {
    const r = results[i];
    const last = r.status === "fulfilled" ? r.value[r.value.length - 1] : null;
    out[k] = last ? { price: last.close, at: last.t } : null;
  });
  return NextResponse.json(out, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
