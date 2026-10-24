import type { Strategy } from "../rules/engine";

// Three sample strategies wired through the rules engine. Ids are stable for seeding.
export const SAMPLE_STRATEGIES: Strategy[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "EPL home favourites 1.5-2.2",
    sport: "soccer",
    league: "soccer_epl",
    rules: [
      { type: "market", market: "match_winner", selection: "home" },
      { type: "condition", condition: "favorite" },
      { type: "odds_range", min: 1.5, max: 2.2 },
      { type: "drift", maxDriftPct: 10 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "EPL away underdog value 3.0-5.0",
    sport: "soccer",
    league: "soccer_epl",
    rules: [
      { type: "market", market: "match_winner", selection: "away" },
      { type: "condition", condition: "underdog" },
      { type: "odds_range", min: 3.0, max: 5.0 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "EPL over 2.5 steady drifters",
    sport: "soccer",
    league: "soccer_epl",
    rules: [
      { type: "market", market: "over_under", selection: "over" },
      { type: "odds_range", min: 1.6, max: 2.1 },
      { type: "drift", maxDriftPct: 5 },
    ],
  },
];
