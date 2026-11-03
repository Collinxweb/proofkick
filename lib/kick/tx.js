// Runs one testnet transaction for an account-held address: the account signs, the app adds gas and co-signs.
import { Transaction } from "@mysten/sui/transactions";
import { kickClient } from "./chain";
import { custodialKeypair } from "./custodial";
import { sponsorSigner } from "./sponsor";

export async function runAsAccount(userId, address, build) {
  const keypair = custodialKeypair(userId);
  const sponsor = sponsorSigner();
  const tx = new Transaction();
  tx.setSender(address);
  tx.setGasOwner(sponsor.toSuiAddress());
  build(tx);
  const bytes = Buffer.from(await tx.build({ client: kickClient() }));
  const { signature: userSig } = await keypair.signTransaction(bytes);
  const { signature: sponsorSig } = await sponsor.signTransaction(bytes);
  const res = await kickClient().core.executeTransaction({ transaction: bytes, signatures: [userSig, sponsorSig], include: { effects: true, events: true } });
  const done = res.Transaction ?? res.FailedTransaction;
  if (!done?.status?.success) {
    const why = String(done?.status?.error?.message ?? done?.status?.error ?? "unknown reason");
    const err = new Error(why); err.onchain = true; throw err;
  }
  return { digest: done.digest, bytes };
}
