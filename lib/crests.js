// Team crests. the-odds-api h2h responses carry no logos, so badges come from TheSportsDB
// (free public key "123"). One league call per top league, cached for a day. Any team that
// doesn't match (or a badge that 404s) falls back to initials in the UI.
const TSDB = "https://www.thesportsdb.com/api/v1/json/123";

const LEAGUE_TSDB = [
  "English Premier League",
  "Spanish La Liga",
  "German Bundesliga",
  "Italian Serie A",
  "French Ligue 1",
];

// odds-api / fixture name -> TheSportsDB name (normalised form), for the usual mismatches.
const ALIASES = {
  "manchester city": "man city",
  "manchester united": "man united",
  "tottenham hotspur": "tottenham",
  "wolverhampton wanderers": "wolves",
  "newcastle united": "newcastle",
  "leeds united": "leeds",
  "nottingham forest": "nottingham",
  "inter": "inter milan",
  "internazionale": "inter milan",
  "milan": "ac milan",
  "bayern munchen": "bayern munich",
  "atletico madrid": "atletico madrid",
  "paris saint germain": "paris saint-germain",
  "psg": "paris saint-germain",
};

export function normTeam(name) {
  let s = String(name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/^(fc|afc|cf|sc) /, "").replace(/ (fc|afc|cf|sc)$/, "").trim();
  return ALIASES[s] ?? s;
}

async function leagueBadges(league) {
  const out = [];
  try {
    const res = await fetch(`${TSDB}/search_all_teams.php?l=${encodeURIComponent(league)}`, { next: { revalidate: 86400 } });
    if (!res.ok) return out;
    const data = await res.json();
    for (const t of data.teams ?? []) {
      if (t.strTeam && t.strBadge) out.push([normTeam(t.strTeam), t.strBadge]);
    }
  } catch {
    // network hiccup: leave the league empty, initials cover it
  }
  return out;
}

/** Map of normalised team name -> badge URL across the top leagues. */
export async function loadCrests() {
  const lists = await Promise.all(LEAGUE_TSDB.map(leagueBadges));
  return Object.fromEntries(lists.flat());
}

export function crestFor(crests, teamName) {
  return crests?.[normTeam(teamName)] ?? null;
}

export function initialsOf(name) {
  const words = String(name ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
