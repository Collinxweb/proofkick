import { NextResponse } from "next/server";
import { quoteKeypair } from "@/lib/kick/quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?secret=CRON_SECRET -> the quote signer's public key (32 bytes), to set on-chain with set_quote_key.
export async function GET(req) {
  if (!process.env.CRON_SECRET || new URL(req.url).searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const key = quoteKeypair().getPublicKey().toRawBytes();
  return NextResponse.json({ length: key.length, quoteKey: Array.from(key) });
}
