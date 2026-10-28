// Grading comes only from the data source (football-data.org), never from user input.
export const LEAGUE_TO_FD = {
  soccer_epl: "PL", soccer_spain_la_liga: "PD", soccer_germany_bundesliga: "BL1",
  soccer_italy_serie_a: "SA", soccer_france_ligue_one: "FL1", soccer_uefa_champs_league: "CL",
};
const STOP = new Set(["fc", "afc", "cf", "ac", "as", "sc", "ssc", "us", "ud", "rc", "rcd", "fk", "calcio", "and", "the", "club", "de", "1899", "1904", "1909", "1846"]);
const ALIAS = {
  "inter milan": "internazionale milano", "bayern munich": "bayern munchen", "atletico madrid": "atletico de madrid",
  "borussia monchengladbach": "borussia monchengladbach", "tottenham hotspur": "tottenham hotspur", "wolves": "wolverhampton wanderers",
  "man city": "manchester city", "man united": "manchester united", "newcastle": "newcastle united", "nottingham forest": "nottingham forest",
};

export function tokens(name) {
  let s = String(name ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  s = ALIAS[s] ?? s;
  return new Set(s.split(" ").filter((t) => t && !STOP.has(t)));
}

export function similarity(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const t of A) if (B.has(t)) n++;
  return n / Math.min(A.size, B.size);
}

// Finds the football-data match for one of our fixtures: same competition, kick-off within 3h, both team names agree.
export function matchFixture(fx, matches) {
  const t = new Date(fx.kickoff_at).getTime();
  let best = null;
  for (const m of matches) {
    if (Math.abs(new Date(m.utcDate).getTime() - t) > 3 * 3600e3) continue;
    const h = Math.max(similarity(fx.home_team, m.homeTeam?.name), similarity(fx.home_team, m.homeTeam?.shortName));
    const a = Math.max(similarity(fx.away_team, m.awayTeam?.name), similarity(fx.away_team, m.awayTeam?.shortName));
    if (!best || h + a > best.s) best = { m, s: h + a };
  }
  return best && best.s >= 1.5 ? best.m : null;
}

// -> null (not final yet) | { result: "void" } | { result: "won" | "lost", home, away }. Voids are never losses.
export function settle(selection, m) {
  if (["POSTPONED", "CANCELLED", "SUSPENDED"].includes(m.status)) return { result: "void" };
  if (m.status !== "FINISHED") return null;
  const s = m.score ?? {};
  const t = s.duration && s.duration !== "REGULAR" && s.regularTime ? s.regularTime : s.fullTime; // 1X2 settles on 90 minutes
  if (t?.home == null || t?.away == null) return null;
  const outcome = t.home > t.away ? "home" : t.home < t.away ? "away" : "draw";
  return { result: outcome === selection ? "won" : "lost", home: t.home, away: t.away };
}
