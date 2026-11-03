// Daily Kick operations: open today's rounds, settle expired ones, and write the receipts.
// Testnet transactions move play money; mainnet receipts and Walrus snapshots record each step.
// Every step is idempotent: re-running opens only missing rounds and settles only open expired ones.
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { kickClient, kickConfig } from "./chain";
import { CATALOG, roundStart, roundId, roundWindow, decideRound } from "./rounds";
import { fetchCandles, priceAt, SOURCE } from "./prices";
import { saveBlob } from "../proof/memory";
import { hashOf, toText } from "../proof/snapshot";
import { mintReceipt } from "../sui/anchor";

export const KICK_TAG = "proofkick:kick-round:v1";
export const KICK_RECEIPT_KIND = { open: 10, settle: 11 }; // mainnet receipt kinds for Kick events
const micro = (p) => BigInt(Math.round(Number(p) * 1e6));
const OUTCOME_CODE = { long: 1, short: 2, void: 0 };

export function planFor(nowMs) {
  return CATALOG.map((c) => {
    const start = roundStart(c.horizon, nowMs);
    const win = roundWindow(c.horizon, start);
    return { asset: c.asset, horizon: c.horizon, id: roundId(c.asset, c.horizon, start), start, ...win, product: c.asset };
  });
}

// The last closed candle before `ms`, read as the closing price for a round that expires at `ms`.
export function closeBefore(candles, ms) {
  let hit = null;
  for (const c of candles) if (c.t < ms) hit = c; else break;
  return hit ? hit.close : null;
}

function adminSigner() {
  const k = process.env.KICK_ADMIN_KEY?.trim();
  if (!k) throw new Error("KICK_ADMIN_KEY is not set in this deployment");
  return Ed25519Keypair.fromSecretKey(k);
}
function adminCap() {
  const id = process.env.KICK_ADMIN_CAP_ID?.trim();
  if (!id) throw new Error("KICK_ADMIN_CAP_ID is not set in this deployment");
  return id;
}

async function runTestnet(tx, signer) {
  tx.setSender(signer.toSuiAddress());
  const res = await kickClient().signAndExecuteTransaction({ transaction: tx, signer, include: { effects: true, objectTypes: true } });
  const done = res.Transaction ?? res.FailedTransaction;
  if (!done?.status?.success) throw new Error(`testnet tx failed: ${done?.status?.error?.message ?? "unknown"}`);
  return done;
}

function createdOfType(done, suffix) {
  const hit = Object.entries(done.objectTypes ?? {}).find(([, t]) => String(t).endsWith(suffix));
  return hit ? hit[0] : null;
}

// Mainnet record: a Walrus snapshot (encrypted, delegate-readable) plus a Sui receipt for its hash.
async function record(snap, kind, roundKey) {
  const hash = hashOf(snap);
  const { blobId } = await saveBlob("kick-system", toText(KICK_TAG, snap));
  let digest = null, error = null;
  try { digest = (await mintReceipt({ kind, strategyId: roundKey, recordHash: hash, ref: blobId, tsMs: Date.now() })).digest; }
  catch (e) { error = String(e.message ?? e).slice(0, 160); }
  return { blobId, digest, error };
}

// Opens today's rounds. Also retries the mainnet record for any round that opened without one.
export async function openRounds(db, nowMs, deadline) {
  const { packageId } = kickConfig();
  const report = [];
  for (const p of planFor(nowMs)) {
    if (Date.now() > deadline) { report.push({ id: p.id, skipped: "time budget used; re-run" }); continue; }
    const { data: existing } = await db.from("kick_rounds").select("id").eq("id", p.id).maybeSingle();
    if (existing) continue;
    const candles = await fetchCandles(p.asset);
    const openPrice = priceAt(candles, p.start);
    if (!openPrice) { report.push({ id: p.id, error: "no price at round start" }); continue; }
    const signer = adminSigner();
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::rounds::open_round`,
      arguments: [
        tx.object(adminCap()),
        tx.pure.vector("u8", Array.from(Buffer.from(p.id))),
        tx.pure.u64(BigInt(p.start)),
        tx.pure.u64(BigInt(p.entryClosesAt)),
        tx.pure.u64(BigInt(p.expiresAt)),
        tx.pure.u64(micro(openPrice)),
      ],
    });
    const done = await runTestnet(tx, signer);
    const chainId = createdOfType(done, "::rounds::Round");
    await db.from("kick_rounds").insert({
      id: p.id, asset: p.asset, horizon: p.horizon, product: SOURCE.name,
      opens_at: new Date(p.start).toISOString(), entry_closes_at: new Date(p.entryClosesAt).toISOString(), expires_at: new Date(p.expiresAt).toISOString(),
      open_price: openPrice, state: "open", open_testnet_tx: done.digest, chain_object_id: chainId,
    });
    const snap = { v: 1, kind: "kick-round-open", round: p.id, asset: p.asset, horizon: p.horizon, opens_ms: p.start, entry_close_ms: p.entryClosesAt,
      expires_ms: p.expiresAt, open_price_micro: micro(openPrice).toString(), price_source: SOURCE.name, testnet_tx: done.digest, chain_object: chainId };
    const r = await record(snap, KICK_RECEIPT_KIND.open, p.id);
    await db.from("kick_rounds").update({ open_snapshot_blob: r.blobId, open_digest: r.digest }).eq("id", p.id);
    report.push({ id: p.id, opened: true, testnet: done.digest, mainnetReceipt: r.digest ?? `failed: ${r.error}` });
  }
  return report;
}

// Retries mainnet records for rounds that opened but whose record step did not finish.
export async function retryOpenRecords(db, deadline) {
  const { data: rows } = await db.from("kick_rounds").select("*").is("open_snapshot_blob", null).eq("state", "open").limit(10);
  const report = [];
  for (const r of rows ?? []) {
    if (Date.now() > deadline) break;
    const snap = { v: 1, kind: "kick-round-open", round: r.id, asset: r.asset, horizon: r.horizon, opens_ms: Date.parse(r.opens_at), entry_close_ms: Date.parse(r.entry_closes_at),
      expires_ms: Date.parse(r.expires_at), open_price_micro: micro(r.open_price).toString(), testnet_tx: r.open_testnet_tx, chain_object: r.chain_object_id, retried: true };
    const rec = await record(snap, KICK_RECEIPT_KIND.open, r.id);
    await db.from("kick_rounds").update({ open_snapshot_blob: rec.blobId, open_digest: rec.digest }).eq("id", r.id);
    report.push({ id: r.id, retried: true, mainnetReceipt: rec.digest ?? `failed: ${rec.error}` });
  }
  return report;
}

async function poolsFor(db, roundId) {
  const { data } = await db.from("kick_entries").select("side, stake").eq("round_id", roundId);
  let long = 0, short = 0;
  for (const e of data ?? []) { if (e.side === "long") long += Number(e.stake); else short += Number(e.stake); }
  return { long, short };
}

// Settles rounds whose expiry has passed. The contract re-checks direction, timing and one-sided pools.
export async function settleExpired(db, nowMs, deadline) {
  const { packageId } = kickConfig();
  const { data: due } = await db.from("kick_rounds").select("*").eq("state", "open").lte("expires_at", new Date(nowMs).toISOString()).limit(20);
  const report = [];
  for (const r of due ?? []) {
    if (Date.now() > deadline) { report.push({ id: r.id, skipped: "time budget used; re-run" }); continue; }
    if (!r.chain_object_id) { report.push({ id: r.id, error: "no on-chain round id recorded" }); continue; }
    const expiresMs = Date.parse(r.expires_at);
    const candles = await fetchCandles(r.asset);
    const closePrice = closeBefore(candles, expiresMs);
    if (!closePrice) { report.push({ id: r.id, error: "no closing price yet; re-run later" }); continue; }
    const pools = await poolsFor(db, r.id);
    const d = decideRound({ openPrice: Number(r.open_price), closePrice, longPool: pools.long, shortPool: pools.short });
    const signer = adminSigner();
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::rounds::settle_round`,
      arguments: [tx.object(adminCap()), tx.object(r.chain_object_id), tx.pure.u8(OUTCOME_CODE[d.outcome]), tx.pure.u64(micro(closePrice)), tx.object.clock()],
    });
    const done = await runTestnet(tx, signer);
    const now = new Date(nowMs).toISOString();
    await db.from("kick_rounds").update({ state: d.outcome === "void" ? "void" : "settled", outcome: d.outcome, close_price: closePrice, settled_at: now, close_snapshot_blob: null }).eq("id", r.id);
    const snap = { v: 1, kind: "kick-round-settle", round: r.id, outcome: d.outcome, reason: d.reason, open_price_micro: micro(r.open_price).toString(),
      close_price_micro: micro(closePrice).toString(), long_pool: pools.long, short_pool: pools.short, testnet_tx: done.digest, settled_at: now };
    // Entry grades: winners on the winning side, losers on the other side, refunds if the round is voided.
    if (d.outcome === "void") {
      await db.from("kick_entries").update({ status: "refunded" }).eq("round_id", r.id).eq("status", "open");
    } else {
      await db.from("kick_entries").update({ status: "won" }).eq("round_id", r.id).eq("side", d.outcome).eq("status", "open");
      await db.from("kick_entries").update({ status: "lost" }).eq("round_id", r.id).neq("side", d.outcome).eq("status", "open");
    }
    const rec = await record(snap, KICK_RECEIPT_KIND.settle, r.id);
    await db.from("kick_rounds").update({ close_snapshot_blob: rec.blobId, close_digest: rec.digest }).eq("id", r.id);
    report.push({ id: r.id, outcome: d.outcome, testnet: done.digest, mainnetReceipt: rec.digest ?? `failed: ${rec.error}` });
  }
  return report;
}
