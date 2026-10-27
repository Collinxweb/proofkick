import { describe, it, expect } from "vitest";
import { settlePick, computeTrackStats } from "./stats";

describe("settlePick", () => {
  it("match winner", () => {
    expect(settlePick("match_winner", "home", { home: 2, away: 1 })).toBe("won");
    expect(settlePick("match_winner", "draw", { home: 1, away: 1 })).toBe("won");
    expect(settlePick("match_winner", "away", { home: 2, away: 1 })).toBe("lost");
  });
  it("over/under 2.5", () => {
    expect(settlePick("over_under", "over", { home: 2, away: 1 })).toBe("won");
    expect(settlePick("over_under", "under", { home: 2, away: 1 })).toBe("lost");
    expect(settlePick("over_under", "under", { home: 1, away: 0 })).toBe("won");
  });
  it("btts", () => {
    expect(settlePick("btts", "yes", { home: 1, away: 1 })).toBe("won");
    expect(settlePick("btts", "no", { home: 2, away: 0 })).toBe("won");
    expect(settlePick("btts", "yes", { home: 2, away: 0 })).toBe("lost");
  });
  it("unknown market is unsettled", () => {
    expect(settlePick("correct_score", "1-0", { home: 1, away: 0 })).toBeNull();
  });
});

describe("computeTrackStats", () => {
  it("computes winrate, streak, roi", () => {
    const picks = [
      { id: "1", selection: "home", market: "match_winner", oddsAtLog: 2.0, result: "won" as const, settledAt: "2026-10-01" },
      { id: "2", selection: "home", market: "match_winner", oddsAtLog: 2.0, result: "won" as const, settledAt: "2026-10-02" },
      { id: "3", selection: "home", market: "match_winner", oddsAtLog: 3.0, result: "lost" as const, settledAt: "2026-10-03" },
      { id: "4", selection: "home", market: "match_winner", oddsAtLog: 2.0, result: "pending" as const },
    ];
    const s = computeTrackStats(picks);
    expect(s.settled).toBe(3);
    expect(s.won).toBe(2);
    expect(s.lost).toBe(1);
    expect(s.winRate).toBeCloseTo(2 / 3, 5);
    expect(s.streak).toEqual({ type: "L", length: 1 });
    // pnl = +1 +1 -1 = 1 over 3 stakes
    expect(s.roi).toBeCloseTo(1 / 3, 5);
  });
  it("empty is zeroed", () => {
    expect(computeTrackStats([]).winRate).toBe(0);
  });
});
