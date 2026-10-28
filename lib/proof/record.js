// Track-record maths. Voids are shown but never counted as wins or losses, and never break a streak.
export function computeRecord(picks) {
  const graded = picks.filter((p) => p.result === "won" || p.result === "lost");
  const wins = graded.filter((p) => p.result === "won").length;
  const voids = picks.filter((p) => p.result === "void").length;
  const pending = picks.filter((p) => !p.result || p.result === "pending").length;
  const newest = [...graded].sort((a, b) => new Date(b.graded_at ?? 0) - new Date(a.graded_at ?? 0));
  let streak = { type: null, n: 0 };
  for (const p of newest) {
    const t = p.result === "won" ? "W" : "L";
    if (!streak.type) streak = { type: t, n: 1 };
    else if (streak.type === t) streak.n++;
    else break;
  }
  const units = graded.reduce((a, p) => a + (p.result === "won" ? Number(p.odds_taken) - 1 : -1), 0);
  const clv = picks.filter((p) => p.closing_odds).map((p) => Number(p.odds_taken) / Number(p.closing_odds) - 1);
  return {
    total: picks.length, graded: graded.length, wins, losses: graded.length - wins, voids, pending,
    winrate: graded.length ? wins / graded.length : null, streak, roi: graded.length ? units / graded.length : null,
    avgClv: clv.length ? clv.reduce((a, b) => a + b, 0) / clv.length : null, clvCount: clv.length,
  };
}
