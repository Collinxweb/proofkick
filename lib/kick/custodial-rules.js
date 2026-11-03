// Pure derivation rule (no SDK), so it can be tested. The seed never leaves the server.
import { createHmac } from "node:crypto";

export function deriveSeed(masterSecret, userId) {
  if (!masterSecret || masterSecret.length < 32) throw new Error("KICK_CUSTODIAL_SEED must be at least 32 characters");
  return createHmac("sha256", masterSecret).update(`kick-testnet:${userId}`).digest(); // 32 bytes
}
