export const CALL_COLS = "id, user_id, selection, odds_taken, closing_odds, status, locked_at, final_home, final_away, memory_blob_id, anchor_digest, fixtures(home_team, away_team, kickoff_at, league)";

// Hit rate counts graded calls only; voids are shown but never counted as losses.
export function summarize(rows) {
  const graded = rows.filter((r) => r.status === "won" || r.status === "lost");
  const wins = graded.filter((r) => r.status === "won").length;
  const clv = rows.filter((r) => r.closing_odds).map((r) => Number(r.odds_taken) / Number(r.closing_odds) - 1);
  return { total: rows.length, graded: graded.length, wins, voids: rows.filter((r) => r.status === "void").length, pending: rows.filter((r) => r.status === "pending").length,
    hit: graded.length ? wins / graded.length : null, clv: clv.length ? clv.reduce((a, b) => a + b, 0) / clv.length : null, clvN: clv.length };
}
