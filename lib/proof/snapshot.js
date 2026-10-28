import { canonical, hashRecord } from "./hash";

export const PICK_TAG = "proofkick:pick:v1";
export const RESULT_TAG = "proofkick:result:v1";

// Everything a stranger needs to check a pick later. `locked_at` is the database clock, not the client's.
export function buildSnapshot({ pick, fixture, reasoning }) {
  const o = fixture.odds ?? {};
  return {
    v: 1, kind: "pick", pick_id: pick.id, user_id: pick.user_id, source: pick.source, strategy_version_id: pick.strategy_version_id ?? null,
    fixture: { id: fixture.id, external_id: fixture.external_id, league: fixture.league, home: fixture.home_team, away: fixture.away_team, kickoff_at: fixture.kickoff_at },
    market: pick.market, selection: pick.selection, odds_taken: Number(pick.odds_taken),
    odds_at_save: { home: o.home ?? null, draw: o.draw ?? null, away: o.away ?? null, books: o.books ?? null },
    reasoning: reasoning ?? null, locked_at: pick.locked_at,
  };
}

export const toText = (tag, obj) => `${tag}\n${canonical(obj)}`;

export function fromText(text) {
  const i = String(text).indexOf("\n");
  if (i < 0) return null;
  try { return { tag: text.slice(0, i), data: JSON.parse(text.slice(i + 1)) }; } catch { return null; }
}

export const hashOf = (obj) => hashRecord(obj); // sha256 of the canonical JSON (Buffer)
