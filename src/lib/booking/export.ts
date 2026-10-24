// Booking export: map a pick to SportyBet / Bet9ja booking codes and deep links.
// Real codes come from the operator's booking endpoint once keys/partnerships exist;
// until then codes are deterministic mocks so the UI/flow can be exercised.

export type Operator = "sportybet" | "bet9ja";

export interface BookablePick {
  pickId: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  selection: string;
  oddsAtLog: number;
  kickoffTime: string;
}

export interface BookingExport {
  operator: Operator;
  code: string;
  deepLink: string;
  mocked: boolean;
  oddsAtExport: number;
}

const OP_MARKET: Record<string, string> = { match_winner: "1X2", over_under: "OU2.5", btts: "GGNG" };
const OP_SEL: Record<string, string> = {
  home: "1", draw: "X", away: "2", over: "O", under: "U", yes: "Y", no: "N",
};

/** Deterministic 6-char alphanumeric code from pick id + operator. No randomness. */
export function mockBookingCode(pickId: string, operator: Operator): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let h = 2166136261;
  const s = `${operator}:${pickId}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[h % alphabet.length];
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
  }
  return out;
}

export function buildDeepLink(operator: Operator, pick: BookablePick, code: string): string {
  const market = OP_MARKET[pick.market] ?? pick.market;
  const sel = OP_SEL[pick.selection] ?? pick.selection;
  const q = new URLSearchParams({ code, market, selection: sel, match: `${pick.homeTeam} vs ${pick.awayTeam}` });
  // Base URLs are placeholders for the operator's real share/booking-code URLs; set via env.
  const base =
    operator === "sportybet"
      ? process.env.SPORTYBET_BOOKING_BASE ?? "https://www.sportybet.com/ng/share"
      : process.env.BET9JA_BOOKING_BASE ?? "https://sports.bet9ja.com/booking";
  return `${base}?${q.toString()}`;
}

export function exportPick(operator: Operator, pick: BookablePick, now: Date = new Date()): BookingExport {
  if (new Date(pick.kickoffTime).getTime() <= now.getTime()) {
    throw new Error("cannot export a pick at or after kickoff");
  }
  const code = mockBookingCode(pick.pickId, operator);
  return {
    operator,
    code,
    deepLink: buildDeepLink(operator, pick, code),
    mocked: true,
    oddsAtExport: pick.oddsAtLog,
  };
}
