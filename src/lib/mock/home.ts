// Presentation mock for the home screen. Mirrors the mockup cards; not wired to any API.
import { SAMPLE_STRATEGIES } from "./strategies";

export interface HomeStrategyCard {
  rank: number;
  name: string;
  handle: string;
  initials: string;
  tags: string[];
  description: string;
  wins: number;
  total: number;
  avgOdds: number;
  roiPct: number;
  last10: boolean[]; // true = win
  strategyId: string;
}

export const HOME_STAT = { liveMatches: 12, label: "Ongoing" };

export const HOME_STRATEGIES: HomeStrategyCard[] = [
  {
    rank: 1,
    name: "The Value Edge",
    handle: "GoalMind",
    initials: "GM",
    tags: ["Double Chance", "BTTS", "Under 3.5"],
    description: "Focuses on high-probability matches with strong home form and defensive balance.",
    wins: 32,
    total: 36,
    avgOdds: 1.76,
    roiPct: 24.8,
    last10: [true, true, true, false, true, true, true, true, false, true],
    strategyId: SAMPLE_STRATEGIES[0].id,
  },
  {
    rank: 2,
    name: "The Underdog System",
    handle: "TacticianX",
    initials: "TX",
    tags: ["1X", "Under 2.5", "Clean Sheet"],
    description: "Targets lower-ranked teams with solid defensive structures and low-scoring trends.",
    wins: 28,
    total: 34,
    avgOdds: 1.82,
    roiPct: 19.6,
    last10: [true, true, false, true, true, true, false, true, true, true],
    strategyId: SAMPLE_STRATEGIES[1].id,
  },
  {
    rank: 3,
    name: "Midweek Momentum",
    handle: "StatsGuru",
    initials: "SG",
    tags: ["BTTS", "Over 2.5", "Draw No Bet"],
    description: "Leverages midweek fixtures and team rotation patterns for consistent value.",
    wins: 26,
    total: 32,
    avgOdds: 1.68,
    roiPct: 16.2,
    last10: [true, true, true, true, false, true, true, true, true, false],
    strategyId: SAMPLE_STRATEGIES[2].id,
  },
  {
    rank: 4,
    name: "The Continental Shift",
    handle: "DataKick",
    initials: "DK",
    tags: ["Home Win", "BTTS", "Over 1.5"],
    description: "Focus on European leagues with strong home form and attacking consistency.",
    wins: 24,
    total: 33,
    avgOdds: 1.71,
    roiPct: 13.9,
    last10: [true, false, true, true, true, false, true, true, false, true],
    strategyId: SAMPLE_STRATEGIES[0].id,
  },
];

