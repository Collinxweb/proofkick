import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { toBase64 } from "@mysten/sui/utils";
import { rpc } from "./rpc";

const keypair = () => Ed25519Keypair.fromSecretKey(process.env.SERVER_SUI_KEY);
export const serverAddress = () => keypair().toSuiAddress();

// Builds the transaction offline (gas set explicitly), signs it, sends it through Tatum.
export async function mintReceipt({ kind, strategyId, recordHash, ref = "", tsMs }) {
  const kp = keypair();
  const sender = kp.toSuiAddress();
  const [price, coins] = await Promise.all([
    rpc("suix_getReferenceGasPrice", []),
    rpc("suix_getCoins", [sender, "0x2::sui::SUI", null, 1]),
  ]);
  const coin = coins.data?.[0];
  if (!coin) throw new Error("Server wallet has no SUI for gas");

  const bytesOf = (s) => Array.from(Buffer.from(s));
  const tx = new Transaction();
  tx.setSender(sender);
  tx.setGasPrice(BigInt(price));
  tx.setGasBudget(20_000_000n);
  tx.setGasPayment([{ objectId: coin.coinObjectId, version: coin.version, digest: coin.digest }]);
  tx.moveCall({
    target: `${process.env.PACKAGE_ID}::receipt::mint`,
    arguments: [
      tx.pure.u8(kind),
      tx.pure.vector("u8", bytesOf(strategyId)),
      tx.pure.vector("u8", Array.from(recordHash)),
      tx.pure.vector("u8", bytesOf(ref)),
      tx.pure.u64(tsMs),
    ],
  });
  const bytes = await tx.build();
  const { signature } = await kp.signTransaction(bytes);
  const res = await rpc("sui_executeTransactionBlock", [
    toBase64(bytes), [signature], { showEffects: true, showObjectChanges: true }, "WaitForLocalExecution",
  ]);
  if (res.effects?.status?.status !== "success") throw new Error(res.effects?.status?.error ?? "Transaction failed");
  const created = res.objectChanges?.find((c) => c.type === "created" && c.objectType.endsWith("::receipt::Receipt"));
  return { digest: res.digest, objectId: created?.objectId };
}
