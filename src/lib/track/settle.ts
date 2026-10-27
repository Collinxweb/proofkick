// Settlement service: score pending picks against a final score, recompute cached stats,
// and write a credibility memory. Works against any repo-like interface so it is testable.
import { settlePick, computeTrackStats, type FinalScore, type SettledPick } from "./stats";
import { writeCredibilityMemory, type MemoryWriteResult } from "../memory/memwal";

export interface PickRow {
  id: string;
  strategyId: string;
  strategyName: string;
  market: string;
  selection: string;
  oddsAtLog: number;
}

export interface SettlementRepo {
  pendingPicksForEvent(eventId: string): Promise<PickRow[]>;
  setPickResult(pickId: string, result: "won" | "lost" | "push", settledAt: string): Promise<void>;
  settledPicksForStrategy(strategyId: string): Promise<SettledPick[]>;
  setStrategyStats(strategyId: string, stats: unknown): Promise<void>;
  setEventFinal(eventId: string, score: FinalScore): Promise<void>;
  recordMemory(strategyId: string, payload: unknown, res: MemoryWriteResult): Promise<void>;
}

export interface SettlementReport {
  eventId: string;
  settled: number;
  unsettleable: number;
  strategiesUpdated: string[];
  memory: Array<{ strategyId: string; mode: MemoryWriteResult["mode"] }>;
}

export async function settleEvent(
  repo: SettlementRepo,
  eventId: string,
  score: FinalScore,
  now: Date = new Date(),
  writeMemory: typeof writeCredibilityMemory = writeCredibilityMemory
): Promise<SettlementReport> {
  await repo.setEventFinal(eventId, score);
  const settledAt = now.toISOString();
  const pending = await repo.pendingPicksForEvent(eventId);
  let settled = 0;
  let unsettleable = 0;
  const touched = new Map<string, string>();

  for (const p of pending) {
    const res = settlePick(p.market, p.selection, score);
    if (!res) { unsettleable++; continue; }
    await repo.setPickResult(p.id, res as "won" | "lost" | "push", settledAt);
    settled++;
    touched.set(p.strategyId, p.strategyName);
  }

  const memory: SettlementReport["memory"] = [];
  const strategiesUpdated: string[] = [];
  for (const [strategyId, strategyName] of touched) {
    const picks = await repo.settledPicksForStrategy(strategyId);
    const stats = computeTrackStats(picks);
    await repo.setStrategyStats(strategyId, stats);
    strategiesUpdated.push(strategyId);
    const payload = {
      strategyId,
      strategyName,
      settled: stats.settled,
      won: stats.won,
      lost: stats.lost,
      winRate: stats.winRate,
      roi: stats.roi,
      streak: stats.streak,
      settledAt,
    };
    const res = await writeMemory(payload);
    await repo.recordMemory(strategyId, payload, res);
    memory.push({ strategyId, mode: res.mode });
  }

  return { eventId, settled, unsettleable, strategiesUpdated, memory };
}
