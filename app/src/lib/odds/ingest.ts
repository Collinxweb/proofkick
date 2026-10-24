// Odds ingestion: the-odds-api soccer_epl (regions=uk, markets=h2h). Mock data if no key.
import type { EventRecord, OddsSnapshot } from "../rules/engine";
import { MOCK_EPL_EVENTS } from "../mock/epl";

export const EPL_SPORT_KEY = "soccer_epl";
export const CREDIT_BUDGET_NOTE =
  "h2h on 1 region = 1 credit per call. Default schedule every 2h = 12 calls/day, about 360/mo, under the 500 free credits.";

interface OddsApiOutcome { name: string; price: number }
interface OddsApiMarket { key: string; outcomes: OddsApiOutcome[] }
interface OddsApiBookmaker { key: string; markets: OddsApiMarket[] }
interface OddsApiEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

/** Average decimal odds across bookmakers for the h2h market. */
export function snapshotFromOddsApi(ev: OddsApiEvent, capturedAt: string): OddsSnapshot | null {
  const sums = { home: 0, draw: 0, away: 0 };
  const counts = { home: 0, draw: 0, away: 0 };
  for (const bm of ev.bookmakers ?? []) {
    const h2h = bm.markets.find((m) => m.key === "h2h");
    if (!h2h) continue;
    for (const o of h2h.outcomes) {
      if (o.name === ev.home_team) { sums.home += o.price; counts.home++; }
      else if (o.name === ev.away_team) { sums.away += o.price; counts.away++; }
      else if (o.name === "Draw") { sums.draw += o.price; counts.draw++; }
    }
  }
  if (!counts.home || !counts.draw || !counts.away) return null;
  return {
    capturedAt,
    home: +(sums.home / counts.home).toFixed(2),
    draw: +(sums.draw / counts.draw).toFixed(2),
    away: +(sums.away / counts.away).toFixed(2),
  };
}

export interface FetchResult {
  mode: "live" | "mock";
  events: Array<{ externalId: string; homeTeam: string; awayTeam: string; kickoffTime: string; league: string; snapshot: OddsSnapshot }>;
  creditsUsed: number;
}

/** Fetch EPL odds. Live if ODDS_API_KEY is set, otherwise deterministic mock. */
export async function fetchEplOdds(now: Date = new Date(), fetchImpl: typeof fetch = fetch): Promise<FetchResult> {
  const key = process.env.ODDS_API_KEY;
  const capturedAt = now.toISOString();
  if (!key) {
    return {
      mode: "mock",
      creditsUsed: 0,
      events: MOCK_EPL_EVENTS.map((e) => ({
        externalId: e.id,
        homeTeam: e.homeTeam,
        awayTeam: e.awayTeam,
        kickoffTime: e.kickoffTime,
        league: e.league,
        snapshot: { ...e.odds[e.odds.length - 1], capturedAt },
      })),
    };
  }
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${EPL_SPORT_KEY}/odds`);
  url.searchParams.set("apiKey", key);
  url.searchParams.set("regions", "uk");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");
  const res = await fetchImpl(url.toString());
  if (!res.ok) throw new Error(`odds api ${res.status}`);
  const data = (await res.json()) as OddsApiEvent[];
  const events = [];
  for (const ev of data) {
    const snap = snapshotFromOddsApi(ev, capturedAt);
    if (!snap) continue;
    events.push({
      externalId: ev.id,
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      kickoffTime: ev.commence_time,
      league: EPL_SPORT_KEY,
      snapshot: snap,
    });
  }
  return { mode: "live", creditsUsed: 1, events };
}

export type { EventRecord };
