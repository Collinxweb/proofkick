// Kick testnet chain access. Testnet only; the mainnet record path is separate (lib/sui).
import { SuiGrpcClient } from "@mysten/sui/grpc";

const TESTNET_RPC = "https://fullnode.testnet.sui.io:443";

export function kickConfig() {
  const packageId = process.env.NEXT_PUBLIC_KICK_PACKAGE_ID?.trim();
  const faucetId = process.env.NEXT_PUBLIC_KICK_FAUCET_ID?.trim();
  if (!packageId || !faucetId) throw new Error("Kick is not configured: set NEXT_PUBLIC_KICK_PACKAGE_ID and NEXT_PUBLIC_KICK_FAUCET_ID in Vercel.");
  return { packageId, faucetId };
}

export function kickClient() {
  return new SuiGrpcClient({ network: "testnet", baseUrl: process.env.KICK_TESTNET_RPC?.trim() || TESTNET_RPC });
}

export const ADDRESS_RE = /^0x[0-9a-fA-F]{64}$/;
