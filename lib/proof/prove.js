import { hex } from "./hash";
import { PICK_TAG, buildSnapshot, toText, hashOf } from "./snapshot";
import { memwalConfigured, saveBlob } from "./memory";
import { mintReceipt } from "../sui/anchor";

// Saves the Walrus snapshot and mints the Sui receipt for one locked pick.
// Idempotent: a step that already succeeded is skipped, so calling it again after a timeout is safe.
export async function proveProof(db, pickId) {
  const out = { pickId, snapshot: "skipped", anchor: "skipped" };
  const { data: pick } = await db.from("picks").select("*, fixtures(*)").eq("id", pickId).maybeSingle();
  if (!pick) return { ...out, error: "pick not found" };
  if (!pick.user_id) return { ...out, error: "pick has no owner" };
  if (!memwalConfigured()) return { ...out, error: "MEMWAL_DELEGATE_KEY and MEMWAL_ACCOUNT_ID are not both set" };

  let blobId = pick.memory_blob_id;
  let hash = pick.commitment_hash ? Buffer.from(pick.commitment_hash, "hex") : null;
  if (!blobId) {
    try {
      const snap = buildSnapshot({ pick, fixture: pick.fixtures, reasoning: pick.reasoning });
      hash = hashOf(snap);
      ({ blobId } = await saveBlob(pick.user_id, toText(PICK_TAG, snap)));
      await db.from("picks").update({ memory_blob_id: blobId, commitment_hash: hex(hash) }).eq("id", pickId);
      out.snapshot = "saved";
    } catch (e) { return { ...out, snapshot: `failed: ${String(e.message ?? e).slice(0, 140)}` }; }
  } else out.snapshot = "already saved";
  out.blobId = blobId;

  if (pick.anchor_object_id) { out.anchor = "already anchored"; return out; }
  try {
    const a = await mintReceipt({ kind: 1, strategyId: pickId, recordHash: hash, ref: blobId, tsMs: Date.now() });
    await db.from("picks").update({ anchor_digest: a.digest, anchor_object_id: a.objectId }).eq("id", pickId);
    Object.assign(out, { anchor: "anchored", via: a.via, digest: a.digest });
  } catch (e) { out.anchor = `failed: ${String(e.message ?? e).slice(0, 160)}`; }
  return out;
}
