import { matchFixture } from "../proof/grade";

// Builds per-fixture team context (form, venue splits, scoring rates, table position, rest days)
// from one competition's matches (football-data.org). Only matches finished before kick-off are used.
const r2 = (n) => (n == null ? null : Math.round(n * 100) / 100);
const avg = (a, f) => (a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : null);
const goals = (m) => {
  const s = m.score ?? {};
  const t = s.duration && s.duration !== "REGULAR" && s.regularTime ? s.regularTime : s.fullTime;
  return t && t.home != null && t.away != null ? t : null;
};

export function teamGames(matches) {
  const T = {};
  for (const m of matches) {
    if (m.status !== "FINISHED") continue;
    const g = goals(m);
    if (!g) continue;
    for (const [side, team, gf, ga] of [["home", m.homeTeam, g.home, g.away], ["away", m.awayTeam, g.away, g.home]]) {
      (T[team.id] ??= { id: team.id, games: [] }).games.push({ at: new Date(m.utcDate).getTime(), side, gf, ga, pts: gf > ga ? 3 : gf === ga ? 1 : 0 });
    }
  }
  for (const t of Object.values(T)) t.games.sort((a, b) => a.at - b.at);
  return T;
}

function summarize(t, side, kickoff) {
  const g = t.games.filter((x) => x.at < kickoff);
  if (!g.length) return null;
  const last5 = g.slice(-5), v = g.filter((x) => x.side === side);
  return {
    played: g.length, ppg: r2(avg(g, (x) => x.pts)), last5pts: last5.reduce((s, x) => s + x.pts, 0),
    last5: last5.map((x) => (x.pts === 3 ? "W" : x.pts === 1 ? "D" : "L")).join(""),
    venuePpg: r2(avg(v, (x) => x.pts)), venueGf: r2(avg(v, (x) => x.gf)), venueGa: r2(avg(v, (x) => x.ga)),
    bttsRate: r2(avg(g, (x) => (x.gf > 0 && x.ga > 0 ? 1 : 0))), over25Rate: r2(avg(g, (x) => (x.gf + x.ga >= 3 ? 1 : 0))),
    rest: r2((kickoff - g[g.length - 1].at) / 864e5),
  };
}

export function buildContexts(matches, fixtures) {
  const T = teamGames(matches);
  const table = Object.values(T).map((t) => ({ id: t.id, pts: t.games.reduce((s, x) => s + x.pts, 0), gd: t.games.reduce((s, x) => s + x.gf - x.ga, 0), gf: t.games.reduce((s, x) => s + x.gf, 0) }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const pos = Object.fromEntries(table.map((t, i) => [t.id, i + 1]));
  const upcoming = matches.filter((m) => m.status === "SCHEDULED" || m.status === "TIMED");
  const out = {};
  for (const fx of fixtures) {
    const m = matchFixture(fx, upcoming);
    if (!m) continue;
    const k = new Date(fx.kickoff_at).getTime();
    const h = T[m.homeTeam.id], a = T[m.awayTeam.id];
    if (!h || !a) continue;
    const hs = summarize(h, "home", k), as = summarize(a, "away", k);
    if (hs && as) out[fx.id] = { home: { ...hs, pos: pos[h.id] }, away: { ...as, pos: pos[a.id] }, teams: table.length };
  }
  return out;
}
