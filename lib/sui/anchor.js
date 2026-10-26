import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { rpc } from "./rpc";

const keypair = () => {
  const k = process.env.SERVER_SUI_KEY?.trim();
  if (!k) throw new Error("SERVER_SUI_KEY is not set in this deployment");
  return Ed25519Keypair.fromSecretKey(k);
};
export const serverAddress = () => keypair().toSuiAddress();

let client;
// Writes go through the SDK's gRPC client (public JSON-RPC is switched off); it picks gas coin, price and budget itself.
const grpc = () =>
  (client ??= new SuiGrpcClient({ baseUrl: process.env.SUI_GRPC_URL?.trim() || "https://fullnode.mainnet.sui.io:443", network: "mainnet" }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Finds the created Receipt object by reading the transaction back through Tatum.
async function receiptIdFromTatum(digest) {
  for (let i = 0; i < 6; i++) {
    try {
      const tx = await rpc("sui_getTransactionBlock", [digest, { showObjectChanges: true }]);
      const hit = tx.objectChanges?.find((c) => c.type === "created" && c.objectType?.endsWith("::receipt::Receipt"));
      if (hit) return hit.objectId;
    } catch {}
    await sleep(1200);
  }
  return null;
}

export async function mintReceipt({ kind, strategyId, recordHash, ref = "", tsMs }) {
  let step = "build";
  try {
    if (!process.env.PACKAGE_ID) throw new Error("PACKAGE_ID is not set in this deployment");
    const signer = keypair();
    const bytesOf = (s) => Array.from(Buffer.from(s));
    const tx = new Transaction();
    tx.setSender(signer.toSuiAddress());
    tx.moveCall({
      target: `${process.env.PACKAGE_ID.trim()}::receipt::mint`,
      arguments: [
        tx.pure.u8(kind),
        tx.pure.vector("u8", bytesOf(strategyId)),
        tx.pure.vector("u8", Array.from(recordHash)),
        tx.pure.vector("u8", bytesOf(ref)),
        tx.pure.u64(tsMs),
      ],
    });
    step = "execute";
    const result = await grpc().signAndExecuteTransaction({ transaction: tx, signer, include: { effects: true } });
    const done = result.Transaction ?? result.FailedTransaction;
    if (!done?.status?.success) throw new Error(done?.status?.error?.message ?? "Transaction failed");
    step = "lookup via Tatum";
    const objectId = await receiptIdFromTatum(done.digest);
    return { digest: done.digest, objectId };
  } catch (e) {
    const err = new Error(`[${step}] ${e.message}`);
    err.stack = e.stack;
    throw err;
  }
}
