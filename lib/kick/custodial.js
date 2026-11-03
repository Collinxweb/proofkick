// Account-held testnet keypair. Server-only: never import this from a client component.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { deriveSeed } from "./custodial-rules";

export function custodialKeypair(userId) {
  const master = process.env.KICK_CUSTODIAL_SEED?.trim();
  if (!master) throw new Error("KICK_CUSTODIAL_SEED is not set in this deployment");
  return Ed25519Keypair.fromSecretKey(new Uint8Array(deriveSeed(master, userId)));
}
