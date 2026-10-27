// CLV: compare the odds a pick was logged at against the closing odds (latest snapshot at or before
// kickoff). clv_pct = odds_at_log / closing_odds - 1. Positive means the pick beat the close.
export type Market = "match_winner" | "over_under" | "btts";

export interface OddsRow {
  captured_at: string;
  home: number;
  draw: number;
  away: number;
  over25: number | null;
  under25: number | null;
  btts_yes: number | null;
  btts_no: number | null;
}

/** The odds for a pick's selection from an odds row, or null if that market/selection is absent. */
export function oddsForSelection(row: OddsRow, market: Market | string, selection: string): number | null {
  const pick = (v: number | null | undefined) => (typeof v === "number" && v >= 1 ? v : null);
  if (market === "match_winner") {
    if (selection === "home") return pick(row.home);
    if (selection === "draw") return pick(row.draw);
    if (selection === "away") return pick(row.away);
  }
  if (market === "over_under") {
    if (selection === "over") return pick(row.over25);
    if (selection === "under") return pick(row.under25);
  }
  if (market === "btts") {
    if (selection === "yes") return pick(row.btts_yes);
    if (selection === "no") return pick(row.btts_no);
  }
  return null;
}

/** Latest odds row captured at or before kickoff. Rows must be sorted or not; we pick the max captured_at. */
export function closingRow(rows: OddsRow[], kickoffIso: string): OddsRow | null {
  const ko = new Date(kickoffIso).getTime();
  let best: OddsRow | null = null;
  for (const r of rows) {
    const t = new Date(r.captured_at).getTime();
    if (t > ko) continue;
    if (!best || t > new Date(best.captured_at).getTime()) best = r;
  }
  return best;
}

/** clv as a fraction (0.05 = +5%). Null when closing odds are missing. */
export function clvFraction(oddsAtLog: number, closingOdds: number | null): number | null {
  if (closingOdds === null || !(closingOdds >= 1) || !(oddsAtLog >= 1)) return null;
  return oddsAtLog / closingOdds - 1;
}

export function formatClv(frac: number | null): string {
  if (frac === null) return "n/a";
  const pct = frac * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}
