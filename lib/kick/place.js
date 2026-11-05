// The one place a kick is placed: checks, the on-chain kick (signed by the account, gas by the app), the entry record and receipts.
import { coinWithBalance } from "@mysten/sui/transactions";
import { kickConfig } from "./chain";
import { kickBalance } from "./balance";
import { runAsAccount } from "./tx";
import { validateEntry } from "./entry-rules";
import { impliedPct } from "./rounds";
import { custodialKeypair } from "./custodial";
import { sponsoredToday } from "./sponsor";
import { dailyCap, hashBytes } from "./sponsor-rules";
import { saveBlob } from "../proof/memory";
import { hashOf, toText } from "../proof/snapshot";
import { mintReceipt } from "../sui/anchor";
import { fetchCandles } from "./prices";

export async function placeKick({ db, userId, round, side, amount }) {
  const address = custodialKeypair(userId).toSuiAddress();
  const now = Date.now();
  const balance = await kickBalance(address);
  const check = validateEntry({ side, amount, balance, state: round.state, opensAt: Date.parse(round.opens_at), entryClosesAt: Date.parse(round.entry_closes_at), now });
  if (!check.ok) return { ok: false, status: 400, error: check.error };
  if ((await sponsoredToday(db, "kick")) >= dailyCap()) return { ok: false, status: 429, error: "Today's free testnet transactions are used up. Try again tomorrow." };

  const entryPrice = await fetchCandles(round.asset).then((c) => (c.length ? c[c.length - 1].close : null)).catch(() => null);
  const { packageId } = kickConfig();
  let digest, bytes;
  try {
    ({ digest, bytes } = await runAsAccount(userId, address, (tx) => {
      const stake = coinWithBalance({ type: `${packageId}::kick_token::KICK_TOKEN`, balance: check.units });
      tx.moveCall({ target: `${packageId}::rounds::kick`, arguments: [tx.object(round.chain_object_id), stake, tx.pure.u8(check.side), tx.object.clock()] });
    }));
  } catch (e) {
    return { ok: false, status: 422, error: `Kick failed on testnet: ${String(e.message).slice(0, 160)}` };
  }
  await db.from("kick_sponsored_txs").insert({ sender: address, kind: "kick", bytes_hash: hashBytes(bytes) });

  const { data: prior } = await db.from("kick_entries").select("side, stake").eq("round_id", round.id);
  const p = { long: 0, short: 0 };
  for (const e of prior ?? []) if (e.side === "long") p.long += Number(e.stake); else p.short += Number(e.stake);
  const implied = impliedPct(p.long, p.short);

  const { data: existing } = await db.from("kick_entries").select("id, stake").eq("round_id", round.id).eq("user_id", userId).eq("side", side).maybeSingle();
  if (existing) {
    await db.from("kick_entries").update({ stake: Number(existing.stake) + check.amount, kick_testnet_tx: digest }).eq("id", existing.id);
  } else {
    await db.from("kick_entries").insert({ round_id: round.id, user_id: userId, side, stake: check.amount, status: "open", kick_testnet_tx: digest, entry_price: entryPrice });
  }
  const column = side === "long" ? "long_pool" : "short_pool";
  await db.from("kick_rounds").update({ [column]: (side === "long" ? p.long : p.short) + check.amount }).eq("id", round.id);

  let receipt = null;
  try {
    const snap = { v: 1, kind: "kick-entry", round: round.id, side, amount: check.amount, implied_long_pct: implied.long, implied_short_pct: implied.short, testnet_tx: digest, account_address: address, at: new Date(now).toISOString() };
    const { blobId } = await saveBlob(userId, toText("proofkick:kick-entry:v1", snap));
    const mainnet = await mintReceipt({ kind: 12, strategyId: round.id, recordHash: hashOf(snap), ref: blobId, tsMs: now });
    await db.from("kick_entries").update({ kick_snapshot_blob: blobId, kick_digest: mainnet.digest }).eq("round_id", round.id).eq("user_id", userId).eq("side", side);
    receipt = mainnet.digest;
  } catch (e) {
    receipt = `failed: ${String(e.message ?? e).slice(0, 120)}`;
  }
  return { ok: true, amount: check.amount, testnetTx: digest, receipt, side, entryPrice };
}
