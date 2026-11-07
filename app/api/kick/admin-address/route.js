import { NextResponse } from "next/server";
import { keypairFromEnv } from "@/lib/kick/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?secret=CRON_SECRET -> the wallet address that the deployed KICK_ADMIN_KEY controls. Never returns the key.
// Use it to check the Vercel value without running the reset.
export async function GET(req) {
  if (!process.env.CRON_SECRET || new URL(req.url).searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const raw = process.env.KICK_ADMIN_KEY ?? "";
  try {
    const kp = keypairFromEnv(raw, "KICK_ADMIN_KEY");
    const address = kp.toSuiAddress();
    return NextResponse.json({ address, expected: "0x745c455dbb94ea713c13c8d3cf9c7c6b80cf7a78eb86c710a378087297657f97", matches: address.toLowerCase() === "0x745c455dbb94ea713c13c8d3cf9c7c6b80cf7a78eb86c710a378087297657f97" });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 200), valueLength: raw.length }, { status: 400 });
  }
}
