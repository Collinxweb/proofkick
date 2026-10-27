// Track record: pure scoring + stats. DB/memwal wiring lives in service code.
export type PickResult = "pending" | "won" | "lost" | "push";

export interface SettledPick {
  id: string;
  selection: string;
  market: string;
  oddsAtLog: number;
  result: PickResult;
  settledAt?: string;
}

export interface FinalScore {
  home: number;
  away: number;
}

/** Decide a pick's result from a final score. Returns null if the market can't be settled. */
export function settlePick(market: string, selection: string, score: FinalScore): PickResult | null {
  const { home, away } = score;
  const total = home + away;
  if (market === "match_winner") {
    const winner = home > away ? "home" : home < away ? "away" : "draw";
    return winner === selection ? "won" : "lost";
  }
  if (market === "over_under") {
    if (total === 2.5) return "push"; // not possible with integer goals, kept for half-lines safety
    const over = total > 2.5;
    return (selection === "over") === over ? "won" : "lost";
  }
  if (market === "btts") {
    const both = home > 0 && away > 0;
    return (selection === "yes") === both ? "won" : "lost";
  }
  return null;
}

export interface TrackStats {
  settled: number;
  won: number;
  lost: number;
  push: number;
  winRate: number; // 0..1 over won+lost
  streak: { type: "W" | "L" | null; length: number };
  edge: number; // avg (realised return per unit - implied prob) approximated: mean(won ? odds-1 : -1) for settled bets
  roi: number;
}

/** Recompute cached track stats from settled picks, ordered oldest->newest by settledAt. */
export function computeTrackStats(picks: SettledPick[]): TrackStats {
  const done = picks
    .filter((p) => p.result !== "pending")
    .sort((a, b) => (a.settledAt ?? "").localeCompare(b.settledAt ?? ""));
  const won = done.filter((p) => p.result === "won").length;
  const lost = done.filter((p) => p.result === "lost").length;
  const push = done.filter((p) => p.result === "push").length;
  const decided = won + lost;

  let streakType: "W" | "L" | null = null;
  let streakLen = 0;
  for (const p of done) {
    if (p.result === "push") continue;
    const t = p.result === "won" ? "W" : "L";
    if (t === streakType) streakLen++;
    else { streakType = t; streakLen = 1; }
  }

  const pnl = done.reduce((acc, p) => {
    if (p.result === "won") return acc + (p.oddsAtLog - 1);
    if (p.result === "lost") return acc - 1;
    return acc;
  }, 0);
  const stakes = done.filter((p) => p.result !== "push").length;
  const roi = stakes ? pnl / stakes : 0;

  return {
    settled: done.length,
    won,
    lost,
    push,
    winRate: decided ? won / decided : 0,
    streak: { type: streakType, length: streakLen },
    edge: roi, // at 1 unit flat stake, edge == ROI per bet
    roi,
  };
}
