// Personal-history recall: a private, informational note from the user's own settled picks.
// Matches the same market only:
//  - team to win (home or away): the same team, either venue
//  - draw: the same two teams, in either order
// Multi legs count as picks, and the note says how many. Shown only with enough comparable history. It never changes a pick.
export const MIN_SAMPLE = 3;

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// The market a pick belongs to. Picks in different markets are never compared.
export function marketKey(pick) {
  if (pick.selection === "home") return `win:${norm(pick.homeTeam)}`;
  if (pick.selection === "away") return `win:${norm(pick.awayTeam)}`;
  if (pick.selection === "draw") return `draw:${[norm(pick.homeTeam), norm(pick.awayTeam)].sort().join("|")}`;
  return null;
}

// history: this user's locked picks, each with status, homeTeam, awayTeam, selection, kickoff, locked, multiLeg.
export function recallFor(candidate, history, { dismissed = false } = {}) {
  if (dismissed) return null; // dismissing only hides the note; the candidate is never touched
  const key = marketKey(candidate);
  if (!key) return null;
  const comparable = history.filter((p) =>
    p.fixtureId !== candidate.fixtureId &&
    (p.status === "won" || p.status === "lost") &&
    p.locked &&
    marketKey(p) === key
  );
  if (comparable.length < MIN_SAMPLE) return null;
  const isDraw = key.startsWith("draw:");
  const wins = comparable.filter((p) => p.status === "won").length;
  const legs = comparable.filter((p) => p.multiLeg).length;
  const sorted = [...comparable].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const latestLoss = [...comparable].filter((p) => p.status === "lost").sort((a, b) => b.kickoff.localeCompare(a.kickoff))[0] ?? null;
  const team = isDraw ? null : (candidate.selection === "home" ? candidate.homeTeam : candidate.awayTeam);
  return {
    market: isDraw ? "draw" : "win",
    team,
    wins,
    settled: comparable.length,
    multiLegs: legs,
    since: sorted[0].kickoff.slice(0, 10),
    until: sorted[sorted.length - 1].kickoff.slice(0, 10),
    latestLoss: latestLoss ? { home: latestLoss.homeTeam, away: latestLoss.awayTeam, score: latestLoss.score ?? null, date: latestLoss.kickoff.slice(0, 10) } : null,
    text: describe(candidate, isDraw, wins, comparable.length, legs, sorted[0].kickoff, sorted[sorted.length - 1].kickoff, latestLoss),
  };
}

function describe(c, isDraw, wins, n, legs, since, until, loss) {
  const period = since.slice(0, 10) === until.slice(0, 10) ? `on ${since.slice(0, 10)}` : `from ${since.slice(0, 10)} to ${until.slice(0, 10)}`;
  const team = isDraw ? null : (c.selection === "home" ? c.homeTeam : c.awayTeam);
  const label = isDraw ? `A draw in ${c.homeTeam} vs ${c.awayTeam}` : `${team} to win`;
  const noun = isDraw ? (wins === 1 ? "draw" : "draws") : (wins === 1 ? "win" : "wins");
  let t = `Your history: ${label}, ${wins} ${noun} from ${n} settled picks ${period}`;
  if (legs > 0) t += ` (incl. ${legs} multi ${legs === 1 ? "leg" : "legs"})`;
  t += ".";
  if (loss) {
    const score = loss.score ? `${loss.score} ` : "";
    const opponent = isDraw ? `${loss.homeTeam} vs ${loss.awayTeam}` : `vs ${loss.homeTeam === team ? loss.awayTeam : loss.homeTeam}`;
    t += ` Latest loss: ${score}${opponent}, ${loss.kickoff.slice(0, 10)}.`;
  }
  return t;
}
