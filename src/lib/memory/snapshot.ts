// Walrus snapshot engine (memwal). Every pick is written to memwal and the returned blob id is stored.
// Blob ids are never invented: if memwal is not configured or the write fails, the result is
// skipped/failed and nothing is stored as if it succeeded.
import { createHash } from "node:crypto";
import { MemWal } from "@mysten-incubation/memwal";

export interface PickSnapshotPayload {
  kind: "pick";
  pickId: string;
  strategyId: string;
  eventId: string;
  market: string;
  selection: string;
  oddsAtLog: number;
  reasoning: string;
  kickoffTime: string;
  loggedAt: string;
}

export interface SettlementSnapshotPayload {
  kind: "settlement";
  pickId: string;
  strategyId: string;
  eventId: string;
  result: "won" | "lost" | "push";
  finalHome: number;
  finalAway: number;
  closingOdds: number | null;
  clvPct: number | null;
  settledAt: string;
}

export type SnapshotWriteResult =
  | { status: "written"; blobId: string; payloadSha256: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string; payloadSha256: string };

/** Canonical JSON so the same payload always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function snapshotNamespace(strategyId: string): string {
  return `proofkick-strategy-${strategyId}`;
}

/** A blob id is only real if memwal returned a non-empty string. */
export function isRealBlobId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0;
}

/** Low-level: write one canonical payload to memwal and wait for its blob id. Never throws. */
export async function writeSnapshot(args: {
  strategyId: string;
  idempotencyKey: string;
  payload: object;
}): Promise<SnapshotWriteResult> {
  const text = canonicalJson(args.payload);
  const payloadSha256 = sha256Hex(text);
  const key = process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  if (!key || !accountId) return { status: "skipped", reason: "MEMWAL_PRIVATE_KEY or MEMWAL_ACCOUNT_ID not set" };

  let memwal: MemWal | null = null;
  try {
    memwal = MemWal.create({
      key,
      accountId,
      serverUrl: process.env.MEMWAL_SERVER_URL ?? "https://relayer.memory.walrus.xyz",
      namespace: snapshotNamespace(args.strategyId),
    });
    const r = await memwal.rememberAndWait(text, { idempotencyKey: args.idempotencyKey } as any, { timeoutMs: 60_000 } as any);
    if (!isRealBlobId(r?.blob_id)) return { status: "failed", error: "memwal returned no blob_id", payloadSha256 };
    return { status: "written", blobId: r.blob_id, payloadSha256 };
  } catch (e) {
    return { status: "failed", error: (e as Error).message, payloadSha256 };
  } finally {
    memwal?.destroy();
  }
}

/** Pick snapshot: refuses to write at/after kickoff. */
export async function writePickSnapshot(payload: PickSnapshotPayload, now: Date = new Date()): Promise<SnapshotWriteResult> {
  if (new Date(payload.kickoffTime).getTime() <= now.getTime()) {
    return { status: "failed", error: "snapshot refused: at/after kickoff", payloadSha256: "" };
  }
  return writeSnapshot({ strategyId: payload.strategyId, idempotencyKey: `pick-${payload.pickId}`, payload });
}

/** Settlement snapshot: written after grading, so it is allowed after kickoff. */
export async function writeSettlementSnapshot(payload: SettlementSnapshotPayload): Promise<SnapshotWriteResult> {
  return writeSnapshot({ strategyId: payload.strategyId, idempotencyKey: `settle-${payload.pickId}`, payload });
}
