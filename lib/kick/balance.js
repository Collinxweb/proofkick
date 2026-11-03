// Testnet KICK balance for an address. Server-only. Returns null on any failure, so pages still render.
import { kickClient, kickConfig, ADDRESS_RE } from "./chain";
import { toKickUnits } from "./balance-rules";

export async function kickBalance(address) {
  if (!ADDRESS_RE.test(address ?? "")) return null;
  try {
    const { packageId } = kickConfig();
    const res = await kickClient().core.getBalance({ owner: address, coinType: `${packageId}::kick_token::KICK_TOKEN` });
    return toKickUnits(res?.balance?.balance ?? res?.balance?.coinBalance ?? res?.balance?.addressBalance ?? null);
  } catch {
    return null;
  }
}
