import { rpc } from "./rpc";
import { hex } from "../proof/hash";

// Reads a receipt straight from chain. Rejects look-alikes from other packages and anything not immutable.
export async function readReceipt(objectId) {
  const r = await rpc("sui_getObject", [objectId, { showContent: true, showType: true, showOwner: true }]);
  const d = r.data;
  if (!d || d.type !== `${process.env.PACKAGE_ID}::receipt::Receipt`) return null;
  const f = d.content?.fields;
  return {
    objectId,
    immutable: d.owner === "Immutable",
    kind: f.kind,
    strategyId: Buffer.from(f.strategy_id).toString(),
    recordHash: hex(f.record_hash),
    ref: Buffer.from(f.ref).toString(),
    tsMs: Number(f.ts_ms),
  };
}
