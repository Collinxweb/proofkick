// Club crests from TheSportsDB (free public key "3"). Results are cached in team_crests. A miss falls back to initials.
export async function lookupCrest(name) {
  const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(name)}`;
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const j = await r.json().catch(() => ({}));
  const hit = (j.teams ?? []).find((t) => /soccer/i.test(t.strSport ?? "")) ?? (j.teams ?? [])[0];
  return hit?.strBadge ?? null;
}
