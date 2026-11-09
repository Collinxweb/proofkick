// Settles expired pool rounds in batches: several settle_round calls share one transaction.
// If a batch fails, each round in it is retried on its own, so one bad round can't block the rest.
import { Transaction } from "@mysten/sui/transactions";
import { kickConfig } from "./chain";
import { decideRound } from "./rounds";
import { fetchCandles } from "./prices";
import { adminSigner, adminCap, runTestnet, closeBefore, record, KICK_RECEIPT_KIND } from "./ops";

const OUTCOME_CODE = { long: 1, short: 2, void: 0 };
const micro = (p) => BigInt(Math.round(Number(p) * 1e6));

export async function settleBatch(db, nowMs, deadline, batchSize = 4) {
  const { packageId } = kickConfig();
  const { data: due, error } = await db.from("kick_rounds").select("*").eq("kind", "pool").eq("state", "open")
    .lte("expires_at", new Date(nowMs).toISOString()).order("expires_at", { ascending: true }).limit(12);
  if (error) return [{ error: error.message }];

  const report = [];
  const ready = [];
  for (const r of due ?? []) {
    if (!r.chain_object_id) { report.push({ id: r.id, error: "no on-chain round id recorded" }); continue; }
    const candles = await fetchCandles(r.asset);
    const close = closeBefore(candles, Date.parse(r.expires_at));
    if (!close) { report.push({ id: r.id, error: "no closing price yet; re-run later" }); continue; }
    const { data: ents } = await db.from("kick_entries").select("side, stake").eq("round_id", r.id);
    let long = 0, short = 0;
    for (const e of ents ?? []) { if (e.side === "long") long += Number(e.stake); else short += Number(e.stake); }
    const d = decideRound({ openPrice: Number(r.open_price), closePrice: close, longPool: long, shortPool: short });
    ready.push({ r, close, d });
  }

  const settleTx = (group) => {
    const tx = new Transaction();
    for (const x of group) {
      tx.moveCall({
        target: `${packageId}::rounds::settle_round`,
        arguments: [tx.object(adminCap()), tx.object(x.r.chain_object_id), tx.pure.u8(OUTCOME_CODE[x.d.outcome]), tx.pure.u64(micro(x.close)), tx.object.clock()],
      });
    }
    return tx;
  };

  for (let i = 0; i < ready.length; i += batchSize) {
    if (Date.now() > deadline - 25_000) {
      for (const x of ready.slice(i)) report.push({ id: x.r.id, skipped: "time budget used; re-run" });
      break;
    }
    const group = ready.slice(i, i + batchSize);
    const settled = []; // rounds that settled on-chain, with their transaction
    try {
      const done = await runTestnet(settleTx(group), adminSigner());
      for (const x of group) settled.push({ x, digest: done.digest });
    } catch (batchErr) {
      for (const x of group) {
        try {
          const done = await runTestnet(settleTx([x]), adminSigner());
          settled.push({ x, digest: done.digest });
        } catch (e) {
          report.push({ id: x.r.id, error: `settle failed: ${String(e.message).slice(0, 160)}` });
        }
      }
    }

    for (const { x, digest } of settled) {
      const nowIso = new Date(nowMs).toISOString();
      const { error: upErr } = await db.from("kick_rounds").update({
        state: x.d.outcome === "void" ? "void" : "settled", outcome: x.d.outcome, close_price: x.close, settled_at: nowIso, close_snapshot_blob: null,
      }).eq("id", x.r.id);
      if (upErr) { report.push({ id: x.r.id, error: `settled on-chain (${digest}) but NOT saved: ${upErr.message}` }); continue; }

      if (x.d.outcome === "void") {
        await db.from("kick_entries").update({ status: "refunded" }).eq("round_id", x.r.id).eq("status", "open");
      } else {
        await db.from("kick_entries").update({ status: "won" }).eq("round_id", x.r.id).eq("side", x.d.outcome).eq("status", "open");
        await db.from("kick_entries").update({ status: "lost" }).eq("round_id", x.r.id).neq("side", x.d.outcome).eq("status", "open");
      }

      const row = { id: x.r.id, outcome: x.d.outcome, testnet: digest, mainnetReceipt: null };
      report.push(row);
      if (Date.now() < deadline) {
        const snap = { v: 1, kind: "kick-round-settle", round: x.r.id, outcome: x.d.outcome, reason: x.d.reason,
          open_price_micro: micro(x.r.open_price).toString(), close_price_micro: micro(x.close).toString(), testnet_tx: digest, settled_at: nowIso };
        const rec = await record(snap, KICK_RECEIPT_KIND.settle, x.r.id);
        await db.from("kick_rounds").update({ close_snapshot_blob: rec.blobId, close_digest: rec.digest }).eq("id", x.r.id);
        row.mainnetReceipt = rec.digest ?? `failed: ${rec.error}`;
      }
    }
  }
  return report;
}
