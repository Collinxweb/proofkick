// Country flags from ISO codes, using regional indicator symbols (renders as a flag on phones).
export function flagEmoji(code) {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
// The competition's home country. The Champions League is shown with the EU flag.
export const LEAGUE_FLAG = {
  soccer_epl: "GB", soccer_spain_la_liga: "ES", soccer_germany_bundesliga: "DE",
  soccer_italy_serie_a: "IT", soccer_france_ligue_one: "FR", soccer_uefa_champs_league: "EU",
};
export const leagueFlag = (league) => flagEmoji(LEAGUE_FLAG[league]);
// Shows only the day and month: the year is covered.
export const coverYear = (iso) => (iso ? `****-${String(iso).slice(5)}` : "Not set");
