import { createHash } from "node:crypto";

// Stable JSON: sorted keys, so the same record always hashes the same.
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}
export const sha256 = (buf) => createHash("sha256").update(buf).digest();
export const hashRecord = (rec) => sha256(Buffer.from(canonical(rec)));
export const hex = (b) => Buffer.from(b).toString("hex");

// Daily mode: one root for many pick hashes. Leaf and node prefixes block second-preimage tricks.
export function merkleRoot(leaves) {
  if (!leaves.length) return null;
  let level = leaves.map((l) => sha256(Buffer.concat([Buffer.from([0]), l])));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i], b = level[i + 1] ?? level[i];
      next.push(sha256(Buffer.concat([Buffer.from([1]), a, b])));
    }
    level = next;
  }
  return level[0];
}
