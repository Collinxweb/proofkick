// Mock booking export for ProofKick picks. Mirrors the /prototype booking modal: a SPRT-XXXXX
// code per slip and a deep link per operator. Codes are deterministic mocks until a bookmaker
// partnership exists, so nothing here touches a real account or moves money.
export const OPERATORS = {
  sportybet: { label: "SportyBet", deepLink: "https://www.sportybet.com/ng/sport/football" },
  bet9ja: { label: "Bet9ja", deepLink: "https://sports.bet9ja.com/" },
};

export const SEL_LABEL = { home: "Home Win", draw: "Draw", away: "Away Win" };

/** Deterministic SPRT-XXXXX code from the seed. Same inputs, same code. */
export function codeFor(seed) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += alphabet[Math.abs(h) % alphabet.length];
    h = Math.imul(h ^ (i + 7), 16777619) >>> 0;
  }
  return `SPRT-${out}`;
}

/** Build a booking slip from server-verified picks. Picks must already carry DB odds. */
export function buildBooking({ userId, operator, picks, now = new Date() }) {
  const op = OPERATORS[operator];
  if (!op) throw new Error("operator must be sportybet or bet9ja");
  if (!picks.length) throw new Error("select at least one pick");
  for (const p of picks) {
    if (new Date(p.kickoff_at).getTime() <= now.getTime()) {
      throw new Error(`${p.home_team} v ${p.away_team} has already kicked off`);
    }
  }
  const seed = `${userId}|${operator}|${picks.map((p) => `${p.fixture_id}:${p.selection}`).sort().join("|")}`;
  const combined = picks.reduce((acc, p) => acc * Number(p.odds), 1);
  return {
    operator,
    operatorLabel: op.label,
    code: codeFor(seed),
    deepLink: op.deepLink,
    mocked: true,
    combinedOdds: Math.round(combined * 100) / 100,
    picks,
  };
}
