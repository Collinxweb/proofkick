// Walrus Memory (memwal) credibility writer. Mock mode when keys are absent: skips silently
// unless MEMWAL_MOCK_LOG=1, in which case it logs the record it would have written.
import { MemWal, MemWalMock } from "@mysten-incubation/memwal";

export interface CredibilityPayload {
  strategyId: string;
  strategyName: string;
  settled: number;
  won: number;
  lost: number;
  winRate: number;
  roi: number;
  streak: { type: "W" | "L" | null; length: number };
  settledAt: string;
}

export interface MemoryWriteResult {
  mode: "live" | "mock" | "skipped";
  memwalId: string | null;
}

export function memwalText(p: CredibilityPayload): string {
  return (
    `StratTrack credibility for strategy "${p.strategyName}" (${p.strategyId}) as of ${p.settledAt}: ` +
    `${p.settled} settled picks, ${p.won} won, ${p.lost} lost, win rate ${(p.winRate * 100).toFixed(1)}%, ` +
    `ROI ${(p.roi * 100).toFixed(1)}% at flat 1 unit, current streak ${p.streak.length}${p.streak.type ?? ""}.`
  );
}

/** Write a credibility memory for a strategy whose picks have just settled. */
export async function writeCredibilityMemory(p: CredibilityPayload): Promise<MemoryWriteResult> {
  if (p.settled === 0) return { mode: "skipped", memwalId: null };
  const key = process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  const text = memwalText(p);

  if (!key || !accountId) {
    if (process.env.MEMWAL_MOCK_LOG === "1") {
      const mock = MemWalMock.create({ namespace: `strategy-${p.strategyId}` });
      const r = await mock.rememberAndWait(text);
      return { mode: "mock", memwalId: (r as any)?.blobId ?? null };
    }
    return { mode: "skipped", memwalId: null };
  }

  const memwal = MemWal.create({
    key,
    accountId,
    serverUrl: process.env.MEMWAL_SERVER_URL ?? "https://relayer.memory.walrus.xyz",
    namespace: `strategy-${p.strategyId}`,
  });
  try {
    const r = await memwal.rememberAndWait(text, undefined, { timeoutMs: 30_000 });
    return { mode: "live", memwalId: (r as any)?.blobId ?? null };
  } finally {
    memwal.destroy();
  }
}
