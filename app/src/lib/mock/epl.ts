import type { EventRecord } from "../rules/engine";

// Deterministic EPL fixtures for mock mode and seeding. Kickoffs are in the future relative to 2026-10-24.
const snap = (capturedAt: string, home: number, draw: number, away: number, extra: Partial<import("../rules/engine").OddsSnapshot> = {}) =>
  ({ capturedAt, home, draw, away, ...extra });

export const MOCK_EPL_EVENTS: EventRecord[] = [
  {
    id: "epl-2026-01",
    league: "soccer_epl",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    kickoffTime: "2026-10-31T14:00:00Z",
    odds: [
      snap("2026-10-23T12:00:00Z", 1.75, 3.9, 4.6, { over25: 1.7, under25: 2.1, bttsYes: 1.72, bttsNo: 2.05 }),
      snap("2026-10-24T08:00:00Z", 1.8, 3.8, 4.4, { over25: 1.75, under25: 2.05, bttsYes: 1.7, bttsNo: 2.1 }),
    ],
  },
  {
    id: "epl-2026-02",
    league: "soccer_epl",
    homeTeam: "Manchester City",
    awayTeam: "Liverpool",
    kickoffTime: "2026-11-01T16:30:00Z",
    odds: [
      snap("2026-10-23T12:00:00Z", 2.1, 3.5, 3.4, { over25: 1.6, under25: 2.3, bttsYes: 1.8, bttsNo: 1.95 }),
      snap("2026-10-24T08:00:00Z", 2.05, 3.55, 3.5, { over25: 1.62, under25: 2.27, bttsYes: 1.78, bttsNo: 1.98 }),
    ],
  },
  {
    id: "epl-2026-03",
    league: "soccer_epl",
    homeTeam: "Tottenham",
    awayTeam: "Newcastle",
    kickoffTime: "2026-11-02T12:30:00Z",
    odds: [
      snap("2026-10-23T12:00:00Z", 2.45, 3.4, 2.95, { over25: 1.9, under25: 1.9, bttsYes: 1.75, bttsNo: 2.0 }),
      snap("2026-10-24T08:00:00Z", 2.3, 3.45, 3.1, { over25: 1.85, under25: 1.95, bttsYes: 1.8, bttsNo: 1.95 }),
    ],
  },
  {
    id: "epl-2026-04",
    league: "soccer_epl",
    homeTeam: "Brighton",
    awayTeam: "Everton",
    kickoffTime: "2026-11-03T15:00:00Z",
    odds: [
      snap("2026-10-23T12:00:00Z", 1.95, 3.6, 3.9, { over25: 1.95, under25: 1.85, bttsYes: 1.9, bttsNo: 1.9 }),
      snap("2026-10-24T08:00:00Z", 1.9, 3.65, 4.0, { over25: 1.95, under25: 1.85, bttsYes: 1.85, bttsNo: 1.95 }),
    ],
  },
  {
    id: "epl-2026-05",
    league: "soccer_epl",
    homeTeam: "Aston Villa",
    awayTeam: "West Ham",
    kickoffTime: "2026-11-07T15:00:00Z",
    odds: [
      snap("2026-10-23T12:00:00Z", 1.6, 4.2, 5.6, { over25: 1.65, under25: 2.2, bttsYes: 1.9, bttsNo: 1.9 }),
      snap("2026-10-24T08:00:00Z", 1.62, 4.1, 5.5, { over25: 1.7, under25: 2.12, bttsYes: 1.88, bttsNo: 1.92 }),
    ],
  },
];
