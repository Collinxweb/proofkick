import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { kickConfig } from "@/lib/kick/chain";
import { runAsAccount } from "@/lib/kick/tx";
import { sponsoredToday } from "@/lib/kick/sponsor";
import { dailyCap } from "@/lib/kick/sponsor-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RPC = "https://fullnode.testnet.sui.io:443";
const sideCode = (s) => (s === "long" ? 1 : 2);
const toBase = (x) => BigInt(Math.round(Number(x) * 1e6));
const norm = (id) => String(id ?? "").toLowerCase();

async function rpc(method, params) {
  const r = await fetch(RPC, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), cache: "no-store",
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

// Every FixedTicket the account holds, read from the chain (paginated).
async function ownedTickets(owner, structType) {
  const out = [];
  let cursor = null;
  for (let i = 0; i < 10; i++) {
    const res = await rpc("suix_getOwnedObjects", [owner, { filter: { StructType: structType }, options: { showContent: true } }, cursor, 50]);
    for (const o of res.data ?? []) {
      const f = o.data?.content?.fields;
      if (f) out.push({ id: o.data.objectId, round: norm(f.round), side: Number(f.side), stake: String(f.stake), payout: String(f.payout) });
    }
    if (!res.hasNextPage) break;
    cursor = res.nextCursor;
  }
  return out;
}

// POST { entryId } -> withdraws a settled fixed-odds kick: the payout if it won, the stake back if the round was voided.
export async function POST(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const db = supabaseAdmin();

  const { data: entry } = await db.from("kick_entries").select("*").eq("id", b.entryId).eq("user_id", user.id).maybeSingle();
  if (!entry) return NextResponse.json({ error: "That kick was not found on your account." }, { status: 404 });
  const { data: round } = await db.from("kick_rounds").select("*").eq("id", entry.round_id).maybeSingle();
  if (!round || round.kind !== "fixed" || !round.chain_object_id) return NextResponse.json({ error: "Not a fixed-odds kick." }, { status: 400 });
  if (!["settled", "void"].includes(round.state)) return NextResponse.json({ error: "This round has not settled yet." }, { status: 409 });
  if (!["won", "refunded"].includes(entry.status)) return NextResponse.json({ error: "Nothing to withdraw on this kick." }, { status: 400 });
  if (entry.redeemed_testnet_tx) return NextResponse.json({ error: "Already withdrawn." }, { status: 400 });

  const { data: prof } = await db.from("profiles").select("kick_address").eq("id", user.id).maybeSingle();
  if (!prof?.kick_address) return NextResponse.json({ error: "No testnet account found." }, { status: 400 });
  if ((await sponsoredToday(db, "kick")) >= dailyCap()) {
    return NextResponse.json({ error: "Today's free testnet transactions are used up. Try again tomorrow." }, { status: 429 });
  }

  const { packageId } = kickConfig();
  const { data: used } = await db.from("kick_entries").select("ticket_object_id").eq("round_id", round.id).not("ticket_object_id", "is", null);
  const usedIds = new Set((used ?? []).map((x) => x.ticket_object_id));
  const tickets = await ownedTickets(prof.kick_address, `${packageId}::fixed::FixedTicket`);
  const wanted = toBase(entry.stake);
  const ticket = tickets.find((t) => t.round === norm(round.chain_object_id) && t.side === sideCode(entry.side) && BigInt(t.stake) === wanted && !usedIds.has(t.id));
  if (!ticket) {
    return NextResponse.json({ error: `Could not find this kick's ticket on-chain. Send support this entry ID: ${entry.id}` }, { status: 409 });
  }

  let res;
  try {
    res = await runAsAccount(user.id, prof.kick_address, (tx) => {
      tx.moveCall({
        target: `${packageId}::fixed::redeem_fixed`,
        arguments: [tx.object(round.chain_object_id), tx.object(ticket.id)],
      });
    });
  } catch (e) {
    return NextResponse.json({ error: `Withdraw failed on testnet: ${String(e.message).slice(0, 160)}` }, { status: 422 });
  }

  await db.from("kick_entries").update({ ticket_object_id: ticket.id, redeemed_testnet_tx: res.digest }).eq("id", entry.id);
  const paidBase = round.state === "void" ? BigInt(ticket.stake) : BigInt(ticket.payout);
  return NextResponse.json({ ok: true, paid: Number(paidBase) / 1e6, testnetTx: res.digest });
}
