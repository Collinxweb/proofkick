// Sui anchoring via Tatum's Sui JSON-RPC gateway. Mints a frozen Receipt (proofkick::receipt::mint)
// whose record_hash is the sha256 of the memwal blob id. Package id comes from SUI_PACKAGE_ID
// (Move.toml keeps 0x0). Nothing is anchored unless every env var is present.
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { sha256Hex } from "../memory/snapshot";

export const TATUM_SUI_RPC = "https://sui-mainnet.gateway.tatum.io";

export const RECEIPT_KIND = { test: 0, pickLock: 1, settlement: 2, dailyRoot: 3 } as const;

export interface AnchorInput {
  kind: (typeof RECEIPT_KIND)[keyof typeof RECEIPT_KIND];
  strategyId: string;
  blobId: string;
  refText: string;
  tsMs: number;
}

export type AnchorResult =
  | { status: "anchored"; digest: string; receiptRecordHash: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export function recordHashForBlob(blobId: string): string {
  return sha256Hex(blobId);
}

export function buildMintTx(packageId: string, input: AnchorInput): Transaction {
  const tx = new Transaction();
  const enc = new TextEncoder();
  tx.moveCall({
    target: `${packageId}::receipt::mint`,
    arguments: [
      tx.pure.u8(input.kind),
      tx.pure.vector("u8", Array.from(enc.encode(input.strategyId))),
      tx.pure.vector("u8", Array.from(enc.encode(recordHashForBlob(input.blobId)))),
      tx.pure.vector("u8", Array.from(enc.encode(input.refText))),
      tx.pure.u64(input.tsMs),
    ],
  });
  return tx;
}

/** Mint the receipt on Sui mainnet through Tatum. Returns a digest only when the chain confirms success. */
export async function anchorReceipt(input: AnchorInput): Promise<AnchorResult> {
  const apiKey = process.env.TATUM_API_KEY;
  const packageId = process.env.SUI_PACKAGE_ID;
  const secret = process.env.SUI_ANCHOR_SECRET_KEY;
  if (!apiKey) return { status: "skipped", reason: "TATUM_API_KEY not set" };
  if (!packageId || !/^0x[0-9a-fA-F]{1,64}$/.test(packageId) || /^0x0+$/.test(packageId)) {
    return { status: "skipped", reason: "SUI_PACKAGE_ID not set to a published package id" };
  }
  if (!secret) return { status: "skipped", reason: "SUI_ANCHOR_SECRET_KEY not set" };

  return anchorWithClient(input, { apiKey, packageId, secret });
}

/** Separate so the RPC transport (with x-api-key header) is built in one place. */
async function anchorWithClient(
  input: AnchorInput,
  cfg: { apiKey: string; packageId: string; secret: string },
): Promise<AnchorResult> {
  try {
    const { JsonRpcHTTPTransport } = await import("@mysten/sui/jsonRpc");
    const transport = new JsonRpcHTTPTransport({
      url: TATUM_SUI_RPC,
      rpc: { headers: { "x-api-key": cfg.apiKey } },
    });
    const client = new SuiJsonRpcClient({ transport, network: "mainnet" });
    const signer = Ed25519Keypair.fromSecretKey(cfg.secret);
    const tx = buildMintTx(cfg.packageId, input);
    tx.setSender(signer.toSuiAddress());
    const res = await client.signAndExecuteTransaction({
      transaction: tx,
      signer,
      options: { showEffects: true },
    });
    const status = res.effects?.status.status;
    if (status !== "success") {
      return { status: "failed", error: `tx not successful: ${res.effects?.status.error ?? "unknown"}` };
    }
    return { status: "anchored", digest: res.digest, receiptRecordHash: recordHashForBlob(input.blobId) };
  } catch (e) {
    return { status: "failed", error: (e as Error).message };
  }
}
