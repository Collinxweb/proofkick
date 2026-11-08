// Fixed-odds rounds: open one per market per day, then settle them at expiry from the price.
// The house cap (KICK_FIXED_HOUSE_CAP, default 5000) is the most the house can mint on one round.
import { Transaction } from "@mysten/sui/transactions";
import { kickConfig } from "./chain";
import { roundStart, roundId } from "./rounds";
import { fetchCandles, priceAt, SOURCE } from "./prices";
import { adminSigner, adminCap, runTestnet, createdOfType, closeBefore } from "./ops";

const ASSETS = ["BTC", "ETH", "PAXG"];
const HOUR = 3600e3;
const CUTOFF_MS = 5 * 60e3;
const OUTCOME = { void: 0, long: 1, short: 2 };
const micro = (p) => BigInt(Math.round(Number(p) * 1e6));
const houseCap = () => BigInt(Math.round(Number(process.env.KICK_FIXED_HOUSE_CAP ?? 5000) * 1e6));

// Fixed round IDs carry an F- prefix, so they never collide with pool rounds.
export const fixedId = (asset, startMs) => `F-${roundId(asset, "24H", startMs)}`;

export async function openFixedRounds(db, nowMs, deadline) {
  const { packageId } = kickConfig();
  const start = roundStart("24H", nowMs);
  const expires = start + 24 * HOUR;
  const cutoff = expires - CUTOFF_MS;
  const report = [];
  for (const asset of ASSETS) {
    const id = fixedId(asset, start);
    if (Date.now() > deadline - 20_000) { report.push({ id, skipped: "time budget used; re-run" }); continue; }
    const { data: existing, error: readErr } = await db.from("kick_rounds").select("id").eq("id", id).maybeSingle();
    if (readErr) { report.push({ id, error: `could not check for existing round: ${readErr.message}` }); continue; }
    if (existing) { report.push({ id, skipped: "already exists" }); continue; }
    const candles = await fetchCandles(asset);
    const openPrice = priceAt(candles, start);
    if (!openPrice) { report.push({ id, error: "no price at round start" }); continue; }

    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::fixed::open_fixed_round`,
      arguments: [
        tx.object(adminCap()),
        tx.pure.vector("u8", Array.from(Buffer.from(id))),
        tx.pure.u64(BigInt(cutoff)),
        tx.pure.u64(BigInt(expires)),
        tx.pure.u64(micro(openPrice)),
        tx.pure.u64(houseCap()),
      ],
    });
    let done;
    try { done = await runTestnet(tx, adminSigner()); }
    catch (e) { report.push({ id, error: `on-chain open failed: ${String(e.message).slice(0, 160)}` }); continue; }

    const chainId = createdOfType(done, "::fixed::FixedRound");
    const { error: insErr } = await db.from("kick_rounds").insert({
      id, kind: "fixed", asset, horizon: "24H", product: SOURCE.name,
      opens_at: new Date(start).toISOString(), entry_closes_at: new Date(cutoff).toISOString(), expires_at: new Date(expires).toISOString(),
      open_price: openPrice, state: "open", open_testnet_tx: done.digest, chain_object_id: chainId,
    });
    if (insErr) { report.push({ id, error: `opened on-chain (${done.digest}) but NOT saved: ${insErr.message}`.slice(0, 260) }); continue; }
    report.push({ id, opened: true, testnet: done.digest, chainObject: chainId });
  }
  return report;
}

// Settles every expired fixed round. Compares prices in micro-units, the same way the contract does.
export async function settleFixedExpired(db, nowMs, deadline) {
  const { packageId } = kickConfig();
  const faucet = process.env.NEXT_PUBLIC_KICK_FAUCET_ID?.trim();
  if (!faucet) return [{ error: "NEXT_PUBLIC_KICK_FAUCET_ID is not set in this deployment" }];
  const { data: due, error } = await db.from("kick_rounds").select("*").eq("kind", "fixed").eq("state", "open")
    .lte("expires_at", new Date(nowMs).toISOString()).limit(20);
  if (error) return [{ error: error.message }];
  const report = [];
  for (const r of due ?? []) {
    if (Date.now() > deadline - 20_000) { report.push({ id: r.id, skipped: "time budget used; re-run" }); continue; }
    try {
      if (!r.chain_object_id) { report.push({ id: r.id, error: "no on-chain round id recorded" }); continue; }
      const candles = await fetchCandles(r.asset);
      const close = closeBefore(candles, Date.parse(r.expires_at));
      if (!close) { report.push({ id: r.id, error: "no closing price yet; re-run later" }); continue; }
      const mOpen = micro(r.open_price), mClose = micro(close);
      const outcome = mClose > mOpen ? "long" : mClose < mOpen ? "short" : "void";

      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::fixed::settle_fixed`,
        arguments: [
          tx.object(adminCap()),
          tx.object(r.chain_object_id),
          tx.object(faucet),
          tx.pure.u8(OUTCOME[outcome]),
          tx.pure.u64(mClose),
          tx.object.clock(),
        ],
      });
      const done = await runTestnet(tx, adminSigner());

      const { error: upErr } = await db.from("kick_rounds").update({
        state: outcome === "void" ? "void" : "settled", outcome, close_price: close, settled_at: new Date(nowMs).toISOString(),
      }).eq("id", r.id);
      if (upErr) { report.push({ id: r.id, error: `settled on-chain (${done.digest}) but NOT saved: ${upErr.message}` }); continue; }

      if (outcome === "void") {
        await db.from("kick_entries").update({ status: "refunded" }).eq("round_id", r.id).eq("status", "open");
      } else {
        await db.from("kick_entries").update({ status: "won" }).eq("round_id", r.id).eq("side", outcome).eq("status", "open");
        await db.from("kick_entries").update({ status: "lost" }).eq("round_id", r.id).neq("side", outcome).eq("status", "open");
      }
      report.push({ id: r.id, outcome, testnet: done.digest });
    } catch (e) {
      report.push({ id: r.id, error: String(e.message ?? e).slice(0, 200) });
    }
  }
  return report;
}
