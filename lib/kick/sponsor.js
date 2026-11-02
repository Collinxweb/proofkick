// Gas sponsorship for Kick testnet transactions. The app's testnet wallet pays gas; the user's wallet still approves.
// Only transactions this server built can be sponsored, and each one can be submitted once (see sponsor-rules.js).
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export { DEFAULT_DAILY_CAP, hashBytes, dailyCap, decideExecute } from "./sponsor-rules";

export function sponsorSigner() {
  const k = process.env.KICK_ADMIN_KEY?.trim();
  if (!k) throw new Error("KICK_ADMIN_KEY is not set in this deployment");
  return Ed25519Keypair.fromSecretKey(k);
}

// Counts sponsored transactions of a kind in the last 24 hours, to enforce the daily cap.
export async function sponsoredToday(db, kind) {
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await db.from("kick_sponsored_txs").select("id", { count: "exact", head: true }).eq("kind", kind).gte("created_at", since);
  return count ?? 0;
}
