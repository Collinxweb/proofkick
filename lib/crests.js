// Club crests from football-data.org's team list for each competition (uses FOOTBALL_DATA_TOKEN).
// A club matches only when every word of the shorter name appears in the longer one, so a wrong badge is never chosen.
import { similarity } from "./proof/grade";

export async function competitionTeams(code, token) {
  const r = await fetch(`https://api.football-data.org/v4/competitions/${code}/teams`, {
    headers: { "X-Auth-Token": token }, cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`${code}: HTTP ${r.status}`);
  const j = await r.json();
  return (j.teams ?? []).map((t) => ({ id: t.id, name: t.name, shortName: t.shortName, crest: t.crest }));
}

export function bestTeam(name, teams) {
  let best = null;
  for (const t of teams) {
    const s = Math.max(similarity(name, t.name), similarity(name, t.shortName));
    if (!best || s > best.s) best = { t, s };
  }
  return best && best.s >= 1 && best.t.crest ? best.t : null;
}
