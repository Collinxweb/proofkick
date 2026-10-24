// Pure domain types + rules engine. No I/O here so it is unit-testable.

export type Market = "match_winner" | "over_under" | "btts";
export type Selection =
  | "home"
  | "draw"
  | "away"
  | "over"
  | "under"
  | "yes"
  | "no";

export type Condition = "home" | "away" | "favorite" | "underdog" | "any";

export type Rule =
  | { type: "market"; market: Market; selection?: Selection }
  | { type: "odds_range"; min: number; max: number }
  | { type: "condition"; condition: Condition }
  | { type: "drift"; maxDriftPct: number; minDriftPct?: number };

export interface Strategy {
  id: string;
  name: string;
  sport: string;
  league: string;
  rules: Rule[];
}

export interface OddsSnapshot {
  capturedAt: string; // ISO
  // decimal odds per selection for match winner
  home: number;
  draw: number;
  away: number;
  // optional other markets
  over25?: number;
  under25?: number;
  bttsYes?: number;
  bttsNo?: number;
}

export interface EventRecord {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string; // ISO
  // chronological odds snapshots, oldest first; last element is latest
  odds: OddsSnapshot[];
}

export interface Pick {
  strategyId: string;
  eventId: string;
  market: Market;
  selection: Selection;
  oddsAtLog: number;
  kickoffTime: string;
  result: "pending";
}

export type Candidate = { market: Market; selection: Selection; odds: number };

/** Candidate bets an event offers, from its latest snapshot. */
export function candidatesFromSnapshot(snap: OddsSnapshot): Candidate[] {
  const out: Candidate[] = [
    { market: "match_winner", selection: "home", odds: snap.home },
    { market: "match_winner", selection: "draw", odds: snap.draw },
    { market: "match_winner", selection: "away", odds: snap.away },
  ];
  if (snap.over25 !== undefined)
    out.push({ market: "over_under", selection: "over", odds: snap.over25 });
  if (snap.under25 !== undefined)
    out.push({ market: "over_under", selection: "under", odds: snap.under25 });
  if (snap.bttsYes !== undefined)
    out.push({ market: "btts", selection: "yes", odds: snap.bttsYes });
  if (snap.bttsNo !== undefined)
    out.push({ market: "btts", selection: "no", odds: snap.bttsNo });
  return out;
}

/** Implied favourite: the team with the lower decimal odds on match winner. */
export function favouriteSide(snap: OddsSnapshot): "home" | "away" | null {
  if (snap.home === snap.away) return null;
  return snap.home < snap.away ? "home" : "away";
}

/** Percent move of a selection's odds from first snapshot to latest. Positive = odds lengthened. */
export function driftPct(event: EventRecord, selection: Selection, market: Market): number | null {
  if (event.odds.length < 2) return null;
  const pick = (s: OddsSnapshot) =>
    candidatesFromSnapshot(s).find((c) => c.market === market && c.selection === selection)?.odds;
  const first = pick(event.odds[0]);
  const last = pick(event.odds[event.odds.length - 1]);
  if (first === undefined || last === undefined || first <= 0) return null;
  return ((last - first) / first) * 100;
}

export interface EvalResult {
  pick: Pick | null;
  reason: string;
}

/**
 * Evaluate a strategy against an event. Returns a pick (for the latest odds,
 * the first candidate that passes every rule) or null with a reason.
 * Kickoff gating: nothing is loggable at/after kickoff.
 */
export function evaluateStrategy(
  strategy: Strategy,
  event: EventRecord,
  now: Date = new Date()
): EvalResult {
  if (event.odds.length === 0) return { pick: null, reason: "no odds snapshots" };
  if (new Date(event.kickoffTime).getTime() <= now.getTime())
    return { pick: null, reason: "kickoff passed" };
  if (event.league !== strategy.league) return { pick: null, reason: "league mismatch" };

  const snap = event.odds[event.odds.length - 1];
  const marketRules = strategy.rules.filter((r): r is Extract<Rule, { type: "market" }> => r.type === "market");
  const rangeRules = strategy.rules.filter((r): r is Extract<Rule, { type: "odds_range" }> => r.type === "odds_range");
  const condRules = strategy.rules.filter((r): r is Extract<Rule, { type: "condition" }> => r.type === "condition");
  const driftRules = strategy.rules.filter((r): r is Extract<Rule, { type: "drift" }> => r.type === "drift");

  const candidates = candidatesFromSnapshot(snap).filter((c) => {
    if (marketRules.length && !marketRules.some((m) => m.market === c.market && (!m.selection || m.selection === c.selection)))
      return false;
    return true;
  });
  if (candidates.length === 0) return { pick: null, reason: "no candidates match market rule" };

  for (const c of candidates) {
    if (rangeRules.some((r) => c.odds < r.min || c.odds > r.max)) continue;
    if (!conditionOk(condRules, c, snap, event)) continue;
    if (!driftOk(driftRules, c, event)) continue;
    return {
      pick: {
        strategyId: strategy.id,
        eventId: event.id,
        market: c.market,
        selection: c.selection,
        oddsAtLog: c.odds,
        kickoffTime: event.kickoffTime,
        result: "pending",
      },
      reason: "matched",
    };
  }
  return { pick: null, reason: "no candidate passes all rules" };
}

function conditionOk(rules: Extract<Rule, { type: "condition" }>[], c: Candidate, snap: OddsSnapshot, _e: EventRecord): boolean {
  for (const r of rules) {
    if (r.condition === "any") continue;
    if (r.condition === "home" || r.condition === "away") {
      if (c.market !== "match_winner" || c.selection !== r.condition) return false;
    }
    if (r.condition === "favorite" || r.condition === "underdog") {
      if (c.market !== "match_winner" || c.selection === "draw") return false;
      const fav = favouriteSide(snap);
      if (fav === null) return false;
      const want = r.condition === "favorite" ? fav : fav === "home" ? "away" : "home";
      if (c.selection !== want) return false;
    }
  }
  return true;
}

function driftOk(rules: Extract<Rule, { type: "drift" }>[], c: Candidate, e: EventRecord): boolean {
  for (const r of rules) {
    const d = driftPct(e, c.selection, c.market);
    if (d === null) return false;
    if (Math.abs(d) > r.maxDriftPct) return false;
    if (r.minDriftPct !== undefined && d < r.minDriftPct) return false;
  }
  return true;
}

/** Validate a rules array (used by API + DB-side safety). Returns list of problems. */
export function validateRules(rules: unknown): string[] {
  const errs: string[] = [];
  if (!Array.isArray(rules)) return ["rules must be an array"];
  for (const [i, r] of (rules as any[]).entries()) {
    if (!r || typeof r !== "object") { errs.push(`rule ${i}: not an object`); continue; }
    if (r.type === "market") {
      if (!["match_winner", "over_under", "btts"].includes(r.market)) errs.push(`rule ${i}: bad market`);
    } else if (r.type === "odds_range") {
      if (typeof r.min !== "number" || typeof r.max !== "number" || r.min < 1 || r.max < r.min)
        errs.push(`rule ${i}: odds_range needs 1 <= min <= max`);
    } else if (r.type === "condition") {
      if (!["home", "away", "favorite", "underdog", "any"].includes(r.condition)) errs.push(`rule ${i}: bad condition`);
    } else if (r.type === "drift") {
      if (typeof r.maxDriftPct !== "number" || r.maxDriftPct < 0) errs.push(`rule ${i}: drift needs maxDriftPct >= 0`);
    } else errs.push(`rule ${i}: unknown type`);
  }
  return errs;
}
