import { bcs } from "@mysten/sui/bcs";
import { getClient } from "./client";
import { hex } from "../proof/hash";

const Receipt = bcs.struct("Receipt", {
  id: bcs.Address, kind: bcs.u8(), strategy_id: bcs.vector(bcs.u8()), record_hash: bcs.vector(bcs.u8()), ref: bcs.vector(bcs.u8()), ts_ms: bcs.u64(),
});
// Type strings may come back with a zero-padded package address, so compare in one normalised form.
const norm = (t) => String(t).replace(/^0x([0-9a-f]+)/i, (_, h) => `0x${h.toLowerCase().padStart(64, "0")}`);

// Reads a receipt straight from chain and decodes it. Throws with a reason instead of returning null.
export async function readReceipt(objectId, via) {
  const { object } = await getClient(via).core.getObject({ objectId, include: { content: true } });
  if (!object) throw new Error("object not found");
  if (norm(object.type) !== norm(`${process.env.PACKAGE_ID.trim()}::receipt::Receipt`)) throw new Error(`not a ProofKick receipt (${object.type})`);
  const r = Receipt.parse(object.content);
  return {
    objectId,
    immutable: object.owner?.$kind === "Immutable" || object.owner === "Immutable",
    kind: r.kind,
    strategyId: Buffer.from(r.strategy_id).toString(),
    recordHash: hex(r.record_hash),
    ref: Buffer.from(r.ref).toString(),
    tsMs: Number(r.ts_ms),
  };
}
