import { NextResponse } from "next/server";
import { quoteKeypair } from "@/lib/kick/quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?secret=CRON_SECRET -> the quote signer's public key (32 bytes), to register on-chain.
// Add &format=text to get only the list, as one line, ready to paste into the workflow.
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const key = Array.from(quoteKeypair().getPublicKey().toRawBytes());
  if (u.searchParams.get("format") === "text") {
    return new Response(JSON.stringify(key), { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return NextResponse.json({ length: key.length, quoteKey: key });
}
