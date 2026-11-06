// Daily Kick operations: open rounds, record them, settle expired ones.
// Every database write is checked and reported. A round that already exists (archived or not) is never opened again.
import { Transaction } from "@mysten/sui/transactions";
import { keypairFromEnv } from "./keys";
import { kickClient, kickConfig } from "./chain";
import { CATALOG, roundStart, roundId, roundWindow, decideRound } from "./rounds";
import { fetchCandles, priceAt, SOURCE } from "./prices";
import { saveBlob } from "../proof/memory";
import { hashOf, toText } from "../proof/snapshot";
import { mintReceipt } from "../sui/anchor";

export const KICK_TAG = "proofkick:kick-round:v1";
export const KICK_RECEIPT_KIND = { open: 10, settle: 11 };
const micro = (p) => BigInt(Math.round(Number(p) * 1e6));
const OUTCOME_CODE = { long: 1, short: 2, void: 0 };

// The rounds to open at a moment: 24H rounds follow the 12:00 UTC schedule, weekly rounds open now.
export function planFor(nowMs) {
  return CATALOG.map((c) => {
    const start = c.horizon === "1W" ? Math.floor(nowMs / 60000) * 60000 : roundStart(c.horizon, nowMs);
    const win = roundWindow(c.horizon, start);
    return { asset: c.asset, horizon: c.horizon, id: roundId(c.asset, c.horizon, start), start, ...win, product: c.asset };
  });
}

// A reset plan: every catalog round starts at `startMs`.
export function planAt(startMs) {
  return CATALOG.map((c) => {
    const win = roundWindow(c.horizon, startMs);
    return { asset: c.asset, horizon: c.horizon, id: roundId(c.asset, c.horizon, startMs), start: startMs, ...win, product: c.asset };
  });
}

// The last closed candle before `ms`, read as the closing price for a round that expires at `ms`.
export function closeBefore(candles, ms) {
  let hit = null;
  for (const c of candles) if (c.t < ms) hit = c; else break;
  return hit ? hit.close : null;
}

function adminSigner() {
  const kp = keypairFromEnv(process.env.KICK_ADMIN_KEY, "KICK_ADMIN_KEY");
  const owner = (process.env.KICK_ADMIN_ADDRESS ?? "0x745c455dbb94ea713c13c8d3cf9c7c6b80cf7a78eb86c710a378087297657f97").toLowerCase();
  const derived = kp.toSuiAddress().toLowerCase();
  if (derived !== owner) {
    throw new Error(`KICK_ADMIN_KEY controls ${derived}, but the admin objects belong to ${owner}. Set KICK_ADMIN_KEY to the key of ${owner}.`);
  }
  return kp;
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

// Opens rounds on-chain and saves each one. The mainnet record is NOT done here, so it cannot hold up the next round:
// retryOpenRecords writes it afterwards.
export async function openRounds(db, nowMs, deadline, plan = planFor(nowMs)) {
  const { packageId } = kickConfig();
  const report = [];
  for (const p of plan) {
    if (Date.now() > deadline - 20_000) { report.push({ id: p.id, skipped: "time budget used; re-run" }); continue; }
    // Any row with this ID, archived or not, means the round exists: it is never opened again.
    const { data: existing, error: readErr } = await db.from("kick_rounds").select("id").eq("id", p.id).maybeSingle();
    if (readErr) { report.push({ id: p.id, error: `could not check for existing round: ${readErr.message}` }); continue; }
    if (existing) { report.push({ id: p.id, skipped: "already exists" }); continue; }
    if (p.horizon === "1W") {
      const { data: active } = await db.from("kick_rounds").select("id").eq("asset", p.asset).eq("horizon", "1W").eq("state", "open").gt("expires_at", new Date(nowMs).toISOString()).limit(1);
      if (active?.length) { report.push({ id: p.id, skipped: "a live weekly round exists for this asset" }); continue; }
    }
    const candles = await fetchCandles(p.asset);
    const openPrice = priceAt(candles, p.start);
    if (!openPrice) { report.push({ id: p.id, error: "no price at round start" }); continue; }

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
    let done;
    try { done = await runTestnet(tx, adminSigner()); }
    catch (e) { report.push({ id: p.id, error: `on-chain open failed: ${String(e.message).slice(0, 160)}` }); continue; }

    const chainId = createdOfType(done, "::rounds::Round");
    const { error: insErr } = await db.from("kick_rounds").insert({
      id: p.id, asset: p.asset, horizon: p.horizon, product: SOURCE.name,
      opens_at: new Date(p.start).toISOString(), entry_closes_at: new Date(p.entryClosesAt).toISOString(), expires_at: new Date(p.expiresAt).toISOString(),
      open_price: openPrice, state: "open", open_testnet_tx: done.digest, chain_object_id: chainId,
    });
    if (insErr) { report.push({ id: p.id, error: `opened on-chain (${done.digest}) but NOT saved: ${insErr.message}`.slice(0, 260) }); continue; }
    report.push({ id: p.id, opened: true, testnet: done.digest, chainObject: chainId });
  }
  return report;
}

// Writes the mainnet record for rounds that opened without one.
export async function retryOpenRecords(db, deadline) {
  const { data: rows, error } = await db.from("kick_rounds").select("*").is("open_snapshot_blob", null).eq("state", "open").limit(10);
  if (error) return [{ error: error.message }];
  const report = [];
  for (const r of rows ?? []) {
    if (Date.now() > deadline) break;
    const snap = { v: 1, kind: "kick-round-open", round: r.id, asset: r.asset, horizon: r.horizon, opens_ms: Date.parse(r.opens_at), entry_close_ms: Date.parse(r.entry_closes_at),
      expires_ms: Date.parse(r.expires_at), open_price_micro: micro(r.open_price).toString(), testnet_tx: r.open_testnet_tx, chain_object: r.chain_object_id, retried: true };
    const rec = await record(snap, KICK_RECEIPT_KIND.open, r.id);
    const { error: upErr } = await db.from("kick_rounds").update({ open_snapshot_blob: rec.blobId, open_digest: rec.digest }).eq("id", r.id);
    report.push({ id: r.id, mainnetReceipt: rec.digest ?? `failed: ${rec.error}`, saved: !upErr });
  }
  return report;
}

async function poolsFor(db, roundId) {
  const { data } = await db.from("kick_entries").select("side, stake").eq("round_id", roundId);
  let long = 0, short = 0;
  for (const e of data ?? []) { if (e.side === "long") long += Number(e.stake); else short += Number(e.stake); }
  return { long, short };
}

// Settles one expired round. Returns a report entry, including the reason if it could not settle.
async function settleOne(db, r, nowMs, { packageId }) {
  if (!r.chain_object_id) return { id: r.id, error: "no on-chain round id recorded" };
  const expiresMs = Date.parse(r.expires_at);
  const candles = await fetchCandles(r.asset);
  const closePrice = closeBefore(candles, expiresMs);
  if (!closePrice) return { id: r.id, error: "no closing price yet; re-run later" };
  const pools = await poolsFor(db, r.id);
  const d = decideRound({ openPrice: Number(r.open_price), closePrice, longPool: pools.long, shortPool: pools.short });
  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::rounds::settle_round`,
    arguments: [tx.object(adminCap()), tx.object(r.chain_object_id), tx.pure.u8(OUTCOME_CODE[d.outcome]), tx.pure.u64(micro(closePrice)), tx.object.clock()],
  });
  const done = await runTestnet(tx, adminSigner());
  const now = new Date(nowMs).toISOString();
  const { error: upErr } = await db.from("kick_rounds").update({ state: d.outcome === "void" ? "void" : "settled", outcome: d.outcome, close_price: closePrice, settled_at: now, close_snapshot_blob: null }).eq("id", r.id);
  if (upErr) return { id: r.id, error: `settled on-chain (${done.digest}) but NOT saved: ${upErr.message}` };
  // Entry grades: winners on the winning side, losers on the other side, refunds if the round is voided.
  if (d.outcome === "void") {
    await db.from("kick_entries").update({ status: "refunded" }).eq("round_id", r.id).eq("status", "open");
  } else {
    await db.from("kick_entries").update({ status: "won" }).eq("round_id", r.id).eq("side", d.outcome).eq("status", "open");
    await db.from("kick_entries").update({ status: "lost" }).eq("round_id", r.id).neq("side", d.outcome).eq("status", "open");
  }
  const snap = { v: 1, kind: "kick-round-settle", round: r.id, outcome: d.outcome, reason: d.reason, open_price_micro: micro(r.open_price).toString(),
    close_price_micro: micro(closePrice).toString(), long_pool: pools.long, short_pool: pools.short, testnet_tx: done.digest, settled_at: now };
  const rec = await record(snap, KICK_RECEIPT_KIND.settle, r.id);
  await db.from("kick_rounds").update({ close_snapshot_blob: rec.blobId, close_digest: rec.digest }).eq("id", r.id);
  return { id: r.id, outcome: d.outcome, testnet: done.digest, mainnetReceipt: rec.digest ?? `failed: ${rec.error}` };
}

// Settles every round whose expiry has passed. Each round is independent: one failure does not stop the others.
export async function settleExpired(db, nowMs, deadline) {
  const cfg = kickConfig();
  const { data: due, error } = await db.from("kick_rounds").select("*").eq("state", "open").lte("expires_at", new Date(nowMs).toISOString()).limit(20);
  if (error) return [{ error: error.message }];
  const report = [];
  for (const r of due ?? []) {
    if (Date.now() > deadline - 20_000) { report.push({ id: r.id, skipped: "time budget used; re-run" }); continue; }
    try { report.push(await settleOne(db, r, nowMs, cfg)); }
    catch (e) { report.push({ id: r.id, error: String(e.message ?? e).slice(0, 200) }); }
  }
  return report;
}
