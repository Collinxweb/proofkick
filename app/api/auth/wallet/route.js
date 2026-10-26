import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stateless nonce: timestamp + HMAC, valid for 5 minutes.
const mac = (ts) => crypto.createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").update(String(ts)).digest("hex").slice(0, 32);
const nonceOk = (n) => {
  const [ts, m] = String(n).split(".");
  const age = Date.now() - Number(ts);
  return Boolean(m) && m === mac(ts) && age >= -1000 && age < 5 * 60 * 1000;
};

export async function GET() {
  const ts = Date.now();
  return NextResponse.json({ nonce: `${ts}.${mac(ts)}` });
}

export async function POST(req) {
  try {
    const { address, message, signature } = await req.json();
    const m = /^ProofKick sign-in\nAddress: (0x[0-9a-f]{64})\nNonce: (\S+)$/.exec(message ?? "");
    if (!m || m[1] !== address || !nonceOk(m[2])) return NextResponse.json({ error: "Sign-in request expired. Please try again." }, { status: 400 });
    const pk = await verifyPersonalMessageSignature(new TextEncoder().encode(message), signature);
    if (pk.toSuiAddress() !== address) return NextResponse.json({ error: "Signature does not match this wallet." }, { status: 401 });

    const db = supabaseAdmin();
    const email = `${address.slice(2)}@wallet.proofkick.app`;
    const { error: ce } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { sui_address: address } });
    if (ce && !/already|registered|exists/i.test(ce.message)) throw ce;
    const { data: link, error: le } = await db.auth.admin.generateLink({ type: "magiclink", email });
    if (le) throw le;
    const s = supabaseServer();
    const hash = link.properties.hashed_token;
    let { error: ve } = await s.auth.verifyOtp({ token_hash: hash, type: "magiclink" });
    if (ve) ({ error: ve } = await s.auth.verifyOtp({ token_hash: hash, type: "email" }));
    if (ve) throw ve;
    const { data: { user } } = await s.auth.getUser();
    if (user) await db.from("profiles").update({ sui_address: address }).eq("id", user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e.message ?? e) }, { status: 500 });
  }
}
