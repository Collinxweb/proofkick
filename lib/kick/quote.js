// Fixed-odds quotes: the server prices the kick and signs it, so the contract can check the chance and the expiry.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export const MARGIN_BPS = 300; // 3% house margin
export const QUOTE_TTL_MS = 50_000;

export function quoteKeypair() {
  const k = process.env.KICK_QUOTE_KEY?.trim();
  if (!k) throw new Error("KICK_QUOTE_KEY is not set in this deployment");
  return Ed25519Keypair.fromSecretKey(k);
}

// The exact bytes the contract verifies: round object ID (32 bytes), side (1 byte), chance and expiry (8 bytes each, little-endian).
export function quoteMessage(roundObjectId, side, chanceBps, validUntilMs) {
  const id = Buffer.from(roundObjectId.replace(/^0x/, ""), "hex");
  if (id.length !== 32) throw new Error("round object id must be 32 bytes");
  const s = Buffer.from([side]);
  const c = Buffer.alloc(8); c.writeBigUInt64LE(BigInt(chanceBps));
  const v = Buffer.alloc(8); v.writeBigUInt64LE(BigInt(validUntilMs));
  return Buffer.concat([id, s, c, v]);
}

// Payout at a chance: fair odds with the margin, rounded down. Matches the contract.
export function fixedPayout(stake, chanceBps) {
  return Math.floor((stake * (10000 - MARGIN_BPS)) / chanceBps);
}

// GREEN uses the up reading, RED the down reading. Returned in hundredths of a percent, bounded 1% to 99%.
export function chanceBps(upPct, side) {
  const pct = side === "long" ? upPct : 100 - upPct;
  const clamped = Math.min(99, Math.max(1, pct));
  return Math.round(clamped * 100);
}
