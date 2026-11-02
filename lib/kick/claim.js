// The claim as a transaction kind (its content only, no sender or gas). The wallet signs this; the app adds gas afterwards.
import { Transaction } from "@mysten/sui/transactions";
import { kickClient, kickConfig } from "./chain";

export async function buildClaimKind() {
  const { packageId, faucetId } = kickConfig();
  const tx = new Transaction();
  tx.moveCall({ target: `${packageId}::kick_token::claim`, arguments: [tx.object(faucetId)] });
  return Buffer.from(await tx.build({ client: kickClient(), onlyTransactionKind: true }));
}
