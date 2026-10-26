import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getClient } from "./client";

const keypair = () => {
  const k = process.env.SERVER_SUI_KEY?.trim();
  if (!k) throw new Error("SERVER_SUI_KEY is not set in this deployment");
  return Ed25519Keypair.fromSecretKey(k);
};
export const serverAddress = () => keypair().toSuiAddress();

function buildTx(sender, { kind, strategyId, recordHash, ref, tsMs }) {
  const bytesOf = (s) => Array.from(Buffer.from(s));
  const tx = new Transaction();
  tx.setSender(sender);
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
  return tx;
}

// The mint creates exactly one object, so any of these identifies the new Receipt.
function receiptIdOf(done) {
  const typed = Object.entries(done.objectTypes ?? {}).find(([, t]) => String(t).endsWith("::receipt::Receipt"));
  if (typed) return typed[0];
  const created = (done.effects?.changedObjects ?? []).filter((c) => c.idOperation === "Created");
  if (created.length === 1) return created[0].objectId;
  for (const e of done.events ?? []) if (e.json?.receipt_id) return e.json.receipt_id;
  return null;
}

// Tries Tatum's gRPC gateway first, then Sui's public node; the result says which one served the write.
export async function mintReceipt({ kind, strategyId, recordHash, ref = "", tsMs, via }) {
  if (!process.env.PACKAGE_ID) throw new Error("PACKAGE_ID is not set in this deployment");
  const signer = keypair();
  const errors = [];
  for (const v of via ? [via] : ["tatum", "public"]) {
    try {
      const result = await getClient(v).signAndExecuteTransaction({
        transaction: buildTx(signer.toSuiAddress(), { kind, strategyId, recordHash, ref, tsMs }),
        signer,
        include: { effects: true, objectTypes: true, events: true },
      });
      const done = result.Transaction ?? result.FailedTransaction;
      if (!done?.status?.success) throw new Error(done?.status?.error?.message ?? "Transaction failed on chain");
      return { via: v, digest: done.digest, objectId: receiptIdOf(done) };
    } catch (e) {
      errors.push(`${v}: ${String(e.message ?? e).slice(0, 160)}`);
    }
  }
  throw new Error(`mint failed -> ${errors.join(" | ")}`);
}
