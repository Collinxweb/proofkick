import { NextResponse } from "next/server";
import { Transaction } from "@mysten/sui/transactions";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { kickClient } from "@/lib/kick/chain";
import { buildClaimKind } from "@/lib/kick/claim";
import { custodialKeypair } from "@/lib/kick/custodial";
import { sponsorSigner, sponsoredToday } from "@/lib/kick/sponsor";
import { dailyCap, hashBytes } from "@/lib/kick/sponsor-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST: a signed-in account without a wallet claims 10,000 testnet KICK to its own account address.
// The account address signs the claim; the app pays gas. One claim per account, enforced here and on-chain.
export async function POST() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const db = supabaseAdmin();
  let claimedHere = false;
  try {
    const keypair = custodialKeypair(user.id);
    const address = keypair.toSuiAddress();
    const { data: prof } = await db.from("profiles").select("kick_address, kick_claimed_at").eq("id", user.id).single();
    if (prof?.kick_claimed_at) return NextResponse.json({ error: "This account already claimed its testnet KICK.", address }, { status: 409 });
    if (!prof?.kick_address) await db.from("profiles").update({ kick_address: address }).eq("id", user.id).is("kick_address", null);

    if ((await sponsoredToday(db, "claim")) >= dailyCap()) {
      return NextResponse.json({ error: "Today's free testnet claims are used up. Try again tomorrow." }, { status: 429 });
    }
    // Reserve the claim before touching the chain, so two requests cannot both claim.
    const { data: reserved } = await db.from("profiles").update({ kick_claimed_at: new Date().toISOString() }).eq("id", user.id).is("kick_claimed_at", null).select("id");
    if (!reserved?.length) return NextResponse.json({ error: "This account already claimed its testnet KICK." }, { status: 409 });
    claimedHere = true;

    const sponsor = sponsorSigner();
    const tx = Transaction.fromKind(await buildClaimKind());
    tx.setSender(address);
    tx.setGasOwner(sponsor.toSuiAddress());
    const bytes = Buffer.from(await tx.build({ client: kickClient() }));
    const { signature: userSig } = await keypair.signTransaction(bytes);
    const { signature: sponsorSig } = await sponsor.signTransaction(bytes);
    await db.from("kick_sponsored_txs").insert({ sender: address, kind: "claim", bytes_hash: hashBytes(bytes) });

    const res = await kickClient().core.executeTransaction({ transaction: bytes, signatures: [userSig, sponsorSig], include: { effects: true } });
    const done = res.Transaction ?? res.FailedTransaction;
    if (!done?.status?.success) {
      const why = String(done?.status?.error?.message ?? done?.status?.error ?? "");
      if (/abort/i.test(why)) return NextResponse.json({ error: "This address already claimed on-chain.", address }, { status: 409 });
      await db.from("profiles").update({ kick_claimed_at: null }).eq("id", user.id); // nothing happened on-chain: allow a retry
      return NextResponse.json({ error: `Claim failed on testnet: ${why.slice(0, 160) || "unknown reason"}` }, { status: 422 });
    }
    return NextResponse.json({ ok: true, address, digest: done.digest });
  } catch (e) {
    if (claimedHere) await db.from("profiles").update({ kick_claimed_at: null }).eq("id", user.id);
    return NextResponse.json({ error: String(e.message ?? e).slice(0, 200) }, { status: 500 });
  }
}
