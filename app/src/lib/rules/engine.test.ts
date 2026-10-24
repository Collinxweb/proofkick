import { describe, it, expect } from "vitest";
import { evaluateStrategy, validateRules, driftPct, type EventRecord, type Strategy } from "./engine";

const kickoff = "2026-11-07T15:00:00Z";
const before = new Date("2026-11-01T00:00:00Z");

const ev = (odds: EventRecord["odds"], league = "soccer_epl"): EventRecord => ({
  id: "evt1",
  league,
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  kickoffTime: kickoff,
  odds,
});

const snap = (home: number, draw: number, away: number, extra: Partial<EventRecord["odds"][0]> = {}) => ({
  capturedAt: "2026-11-01T00:00:00Z",
  home,
  draw,
  away,
  ...extra,
});

const strat = (rules: Strategy["rules"]): Strategy => ({
  id: "s1",
  name: "test",
  sport: "soccer",
  league: "soccer_epl",
  rules,
});

describe("evaluateStrategy", () => {
  it("picks the favourite home side inside odds range", () => {
    const e = ev([snap(1.8, 3.6, 4.5)]);
    const s = strat([
      { type: "market", market: "match_winner" },
      { type: "odds_range", min: 1.5, max: 2.5 },
      { type: "condition", condition: "favorite" },
    ]);
    const r = evaluateStrategy(s, e, before);
    expect(r.pick).not.toBeNull();
    expect(r.pick!.selection).toBe("home");
    expect(r.pick!.oddsAtLog).toBe(1.8);
    expect(r.pick!.result).toBe("pending");
  });

  it("underdog condition selects away when home is favourite", () => {
    const e = ev([snap(1.8, 3.6, 4.5)]);
    const s = strat([
      { type: "market", market: "match_winner", selection: "away" },
      { type: "condition", condition: "underdog" },
      { type: "odds_range", min: 3, max: 6 },
    ]);
    expect(evaluateStrategy(s, e, before).pick?.selection).toBe("away");
  });

  it("returns null when odds fall outside range", () => {
    const e = ev([snap(1.1, 6, 12)]);
    const s = strat([{ type: "market", market: "match_winner" }, { type: "odds_range", min: 2, max: 3 }]);
    const r = evaluateStrategy(s, e, before);
    expect(r.pick).toBeNull();
    expect(r.reason).toBe("no candidate passes all rules");
  });

  it("over_under market uses over25 odds", () => {
    const e = ev([snap(2, 3.4, 3.6, { over25: 1.9, under25: 1.95 })]);
    const s = strat([
      { type: "market", market: "over_under", selection: "over" },
      { type: "odds_range", min: 1.5, max: 2.2 },
    ]);
    const r = evaluateStrategy(s, e, before);
    expect(r.pick?.market).toBe("over_under");
    expect(r.pick?.selection).toBe("over");
  });

  it("btts yes requires btts odds to be present", () => {
    const e = ev([snap(2, 3.4, 3.6)]);
    const s = strat([{ type: "market", market: "btts", selection: "yes" }]);
    expect(evaluateStrategy(s, e, before).pick).toBeNull();
  });

  it("drift rule blocks picks whose odds moved more than allowed", () => {
    const e = ev([snap(2.0, 3.4, 3.6), snap(2.4, 3.4, 3.6)]); // home drifted +20%
    const s = strat([
      { type: "market", market: "match_winner", selection: "home" },
      { type: "drift", maxDriftPct: 10 },
    ]);
    expect(evaluateStrategy(s, e, before).pick).toBeNull();
    const s2 = strat([
      { type: "market", market: "match_winner", selection: "home" },
      { type: "drift", maxDriftPct: 25 },
    ]);
    expect(evaluateStrategy(s2, e, before).pick?.oddsAtLog).toBe(2.4);
  });

  it("drift rule fails closed when there is only one snapshot", () => {
    const e = ev([snap(2.0, 3.4, 3.6)]);
    const s = strat([{ type: "drift", maxDriftPct: 50 }]);
    expect(evaluateStrategy(s, e, before).pick).toBeNull();
  });

  it("refuses to pick at or after kickoff", () => {
    const e = ev([snap(1.8, 3.6, 4.5)]);
    const s = strat([{ type: "market", market: "match_winner", selection: "home" }]);
    const r = evaluateStrategy(s, e, new Date("2026-11-07T15:00:00Z"));
    expect(r.pick).toBeNull();
    expect(r.reason).toBe("kickoff passed");
  });

  it("refuses league mismatch", () => {
    const e = ev([snap(1.8, 3.6, 4.5)], "soccer_spain_la_liga");
    const s = strat([{ type: "market", market: "match_winner" }]);
    expect(evaluateStrategy(s, e, before).pick).toBeNull();
  });

  it("no odds means no pick", () => {
    expect(evaluateStrategy(strat([]), ev([]), before).pick).toBeNull();
  });
});

describe("driftPct", () => {
  it("computes percent change first to latest", () => {
    const e = ev([snap(2.0, 3, 3), snap(1.8, 3, 3)]);
    expect(driftPct(e, "home", "match_winner")).toBeCloseTo(-10, 5);
  });
});

describe("validateRules", () => {
  it("accepts a valid rules array", () => {
    expect(validateRules([{ type: "odds_range", min: 1.5, max: 3 }])).toEqual([]);
  });
  it("rejects bad shapes", () => {
    expect(validateRules([{ type: "odds_range", min: 3, max: 1.5 }]).length).toBe(1);
    expect(validateRules([{ type: "market", market: "correct_score" }]).length).toBe(1);
    expect(validateRules("nope")).toEqual(["rules must be an array"]);
  });
});
