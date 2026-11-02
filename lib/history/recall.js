// Personal-history recall: a private, informational note from the user's own settled picks.
// Shown only when there is enough comparable history, and never changes a pick or its grade.
export const MIN_SAMPLE = 3;

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Team-win selections only. Draws touch two teams and are not compared (ambiguous), so they return null.
export function teamOfSelection(pick) {
  if (pick.selection === "home") return norm(pick.homeTeam);
  if (pick.selection === "away") return norm(pick.awayTeam);
  return null;
}

// history: this user's settled, locked picks. candidate: the pick being made now.
// Returns null (show nothing) unless the match is unambiguous and the sample is large enough.
export function recallFor(candidate, history, { dismissed = false } = {}) {
  if (dismissed) return null; // dismissing changes only what is shown, never the candidate
  const team = teamOfSelection(candidate);
  if (!team) return null;
  const sameFixture = (p) => p.fixtureId === candidate.fixtureId;
  const comparable = history.filter((p) =>
    !sameFixture(p) &&
    (p.status === "won" || p.status === "lost") &&
    teamOfSelection(p) === team &&
    p.locked
  );
  if (comparable.length < MIN_SAMPLE) return null;
  const wins = comparable.filter((p) => p.status === "won").length;
  const sorted = [...comparable].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const latestLoss = [...comparable].filter((p) => p.status === "lost").sort((a, b) => b.kickoff.localeCompare(a.kickoff))[0] ?? null;
  return {
    team: candidate.selection === "home" ? candidate.homeTeam : candidate.awayTeam,
    wins,
    settled: comparable.length,
    since: sorted[0].kickoff.slice(0, 10),
    until: sorted[sorted.length - 1].kickoff.slice(0, 10),
    latestLoss: latestLoss ? { home: latestLoss.homeTeam, away: latestLoss.awayTeam, score: latestLoss.score ?? null, date: latestLoss.kickoff.slice(0, 10) } : null,
    text: describe(candidate, wins, comparable.length, sorted[0].kickoff, sorted[sorted.length - 1].kickoff, latestLoss),
  };
}

function describe(c, wins, n, since, until, loss) {
  const who = c.selection === "home" ? c.homeTeam : c.awayTeam;
  const period = since.slice(0, 10) === until.slice(0, 10) ? `on ${since.slice(0, 10)}` : `from ${since.slice(0, 10)} to ${until.slice(0, 10)}`;
  let t = `Your history: ${who} to win, ${wins} ${wins === 1 ? "win" : "wins"} from ${n} settled picks ${period}.`;
  if (loss) t += ` Latest loss: ${loss.score ? `${loss.score} ` : ""}vs ${loss.homeTeam === who ? loss.awayTeam : loss.homeTeam}, ${loss.kickoff.slice(0, 10)}.`;
  return t;
}
