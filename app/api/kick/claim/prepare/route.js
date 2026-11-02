import { NextResponse } from "next/server";
import { ADDRESS_RE } from "@/lib/kick/chain";
import { buildClaimKind } from "@/lib/kick/claim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Step 1: returns the claim's content for the wallet to sign. The wallet never sees the gas.
export async function POST(req) {
  const { sender } = await req.json().catch(() => ({}));
  if (!ADDRESS_RE.test(sender ?? "")) return NextResponse.json({ error: "Connect your Sui wallet first." }, { status: 400 });
  try {
    const kind = await buildClaimKind();
    return NextResponse.json({ kind: kind.toString("base64") });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 200) }, { status: 500 });
  }
}
