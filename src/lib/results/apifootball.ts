// api-football results for grading. Only finished matches (status FT) are graded; results come
// from this source only, never from user input. Free plans only cover seasons 2022-2024: when the
// API answers with that restriction we return a typed error instead of grading nothing silently.
export const APIFOOTBALL_BASE = "https://v3.football.api-sports.io";

export interface FinishedFixture {
  fixtureId: number;
  kickoffIso: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

export type FixtureFetchResult =
  | { status: "ok"; fixtures: FinishedFixture[] }
  | { status: "not_configured"; notice: string }
  | { status: "free_plan_season_limit"; notice: string }
  | { status: "error"; error: string };

export const FREE_PLAN_NOTICE =
  "api-football free plan only serves seasons 2022, 2023 and 2024. The requested season is outside that range, so no finished matches were graded. Upgrade the plan or grade a supported season.";

/** Parse the api-football /fixtures response, keeping only FT fixtures with final goals. */
export function parseFinishedFixtures(body: unknown): FinishedFixture[] {
  const resp = (body as { response?: unknown[] })?.response ?? [];
  const out: FinishedFixture[] = [];
  for (const item of resp as any[]) {
    if (item?.fixture?.status?.short !== "FT") continue;
    const hg = item?.goals?.home;
    const ag = item?.goals?.away;
    if (typeof hg !== "number" || typeof ag !== "number") continue;
    out.push({
      fixtureId: item.fixture.id,
      kickoffIso: item.fixture.date,
      homeTeam: item.teams?.home?.name,
      awayTeam: item.teams?.away?.name,
      homeGoals: hg,
      awayGoals: ag,
    });
  }
  return out;
}

/** Fetch finished fixtures for a league/season/date window. */
export async function fetchFinishedFixtures(params: {
  league: number;
  season: number;
  from: string; // YYYY-MM-DD
  to: string;
  fetchImpl?: typeof fetch;
}): Promise<FixtureFetchResult> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return { status: "not_configured", notice: "API_FOOTBALL_KEY not set; nothing graded." };
  const f = params.fetchImpl ?? fetch;
  const url = `${APIFOOTBALL_BASE}/fixtures?league=${params.league}&season=${params.season}&from=${params.from}&to=${params.to}&status=FT`;
  try {
    const res = await f(url, { headers: { "x-apisports-key": key } });
    const body = (await res.json()) as { errors?: unknown; response?: unknown[] };
    const errs = JSON.stringify(body.errors ?? {});
    if (/plan|season/i.test(errs) && /free|season/i.test(errs)) {
      return { status: "free_plan_season_limit", notice: `${FREE_PLAN_NOTICE} API said: ${errs}` };
    }
    if (!res.ok) return { status: "error", error: `api-football HTTP ${res.status}: ${errs}` };
    if (body.errors && Object.keys(body.errors as object).length > 0) {
      return { status: "error", error: `api-football error: ${errs}` };
    }
    return { status: "ok", fixtures: parseFinishedFixtures(body) };
  } catch (e) {
    return { status: "error", error: (e as Error).message };
  }
}

export type PickOutcome = "won" | "lost" | "void";

/** 1X2 / O2.5 / BTTS outcome from a final score. Voids are only for markets we cannot settle. */
export function gradePick(market: string, selection: string, home: number, away: number): PickOutcome {
  if (market === "match_winner") {
    const w = home > away ? "home" : home < away ? "away" : "draw";
    return w === selection ? "won" : "lost";
  }
  if (market === "over_under") return (home + away > 2.5) === (selection === "over") ? "won" : "lost";
  if (market === "btts") return (home > 0 && away > 0) === (selection === "yes") ? "won" : "lost";
  return "void";
}
