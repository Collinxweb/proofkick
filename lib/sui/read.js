import { bcs } from "@mysten/sui/bcs";
import { getClient } from "./client";
import { hex } from "../proof/hash";

const Receipt = bcs.struct("Receipt", {
  id: bcs.Address, kind: bcs.u8(), strategy_id: bcs.vector(bcs.u8()), record_hash: bcs.vector(bcs.u8()), ref: bcs.vector(bcs.u8()), ts_ms: bcs.u64(),
});

// Reads a receipt straight from chain and decodes it. Rejects look-alike types from other packages.
export async function readReceipt(objectId, mode) {
  const client = await getClient(mode);
  const { object } = await client.core.getObject({ objectId, include: { content: true } });
  if (!object || object.type !== `${process.env.PACKAGE_ID}::receipt::Receipt`) return null;
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
