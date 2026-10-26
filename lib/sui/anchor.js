import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { toBase64 } from "@mysten/sui/utils";
import { rpc } from "./rpc";

const keypair = () => {
  const k = process.env.SERVER_SUI_KEY?.trim();
  if (!k) throw new Error("SERVER_SUI_KEY is not set in this deployment");
  return Ed25519Keypair.fromSecretKey(k);
};
export const serverAddress = () => keypair().toSuiAddress();

// Builds the transaction offline (gas set explicitly), signs it, sends it through Tatum.
export async function mintReceipt({ kind, strategyId, recordHash, ref = "", tsMs }) {
  let step = "keypair";
  const notes = [];
  if (!process.env.PACKAGE_ID) throw new Error("PACKAGE_ID is not set in this deployment");
  try {
  const kp = keypair();
  const sender = kp.toSuiAddress();
  step = "gas lookup";
  const [price, coins] = await Promise.all([
    rpc("suix_getReferenceGasPrice", [], { fallback: true, notes }),
    rpc("suix_getCoins", [sender, "0x2::sui::SUI", null, 1], { fallback: true, notes }),
  ]);
  const coin = coins.data?.[0];
  if (!coin) throw new Error("Server wallet has no SUI for gas");

  step = "build";
  const bytesOf = (s) => Array.from(Buffer.from(s));
  const tx = new Transaction();
  tx.setSender(sender);
  tx.setGasPrice(BigInt(price));
  tx.setGasBudget(20_000_000n);
  tx.setGasPayment([{ objectId: coin.coinObjectId, version: String(coin.version), digest: coin.digest }]);
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
  step = "sign";
  const { signature } = await kp.signTransaction(bytes);
  step = "execute";
  const res = await rpc("sui_executeTransactionBlock", [
    toBase64(bytes), [signature], { showEffects: true, showObjectChanges: true }, "WaitForLocalExecution",
  ]);
  if (res.effects?.status?.status !== "success") throw new Error(res.effects?.status?.error ?? "Transaction failed");
  const created = res.objectChanges?.find((c) => c.type === "created" && c.objectType.endsWith("::receipt::Receipt"));
  return { digest: res.digest, objectId: created?.objectId, notes };
  } catch (e) {
    const err = new Error(`[${step}] ${e.message}`);
    err.stack = e.stack;
    throw err;
  }
}
