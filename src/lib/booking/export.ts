// Booking export: turn a pick into a bet-slip the user can load in SportyBet / Bet9ja / 1xBet.
//
// There is no mock code path. We never invent a booking code: a code is only returned if the
// operator issued it (BookingCodeIssuer, not implemented yet). Without one, export returns
// "copy_to_app": the selection text the user pastes into the operator's betslip by hand.
//
// Deep-link formats (from third-party guides, not yet live-tested on the operators' sites):
//   sportybet: https://www.sportybet.com/ng/?shareCode=CODE   UNVERIFIED until live-tested
//   bet9ja:    https://sports.bet9ja.com/?bookABetCode=CODE    UNVERIFIED until live-tested
//   1xbet:     https://1xbet.ng/en?coupon-code=CODE            UNVERIFIED until live-tested
// A link is only produced when a real code is supplied. Links never contain invented codes.

export type Operator = "sportybet" | "bet9ja" | "1xbet";

export const OPERATORS: Operator[] = ["sportybet", "bet9ja", "1xbet"];

export interface BookablePick {
  pickId: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  selection: string;
  oddsAtLog: number;
  kickoffTime: string;
}

export interface CopyToAppFallback {
  kind: "copy_to_app";
  label: string;
  text: string;
}

export interface BookingExport {
  operator: Operator;
  /** Operator-issued code, or null when none exists (never invented). */
  code: string | null;
  /** Deep link built from a real operator code, or null. */
  deepLink: string | null;
  /** Always present: manual fallback the user can copy into the operator app. */
  fallback: CopyToAppFallback;
  linkStatus: "unverified_format" | "no_code_issued";
  note: string;
  oddsAtExport: number;
}

const OP_MARKET: Record<string, string> = { match_winner: "1X2", over_under: "O/U 2.5", btts: "GG/NG" };
const OP_SEL: Record<string, string> = {
  home: "Home win",
  draw: "Draw",
  away: "Away win",
  over: "Over 2.5",
  under: "Under 2.5",
  yes: "Both teams score: Yes",
  no: "Both teams score: No",
};

const DEEP_LINK_BASE: Record<Operator, string> = {
  sportybet: "https://www.sportybet.com/ng/",
  bet9ja: "https://sports.bet9ja.com/",
  "1xbet": "https://1xbet.ng/en",
};

const CODE_PARAM: Record<Operator, string> = {
  sportybet: "shareCode",
  bet9ja: "bookABetCode",
  "1xbet": "coupon-code",
};

const CODE_PATTERN = /^[A-Za-z0-9]{4,20}$/;

export function selectionText(pick: BookablePick): string {
  const market = OP_MARKET[pick.market] ?? pick.market;
  const sel = OP_SEL[pick.selection] ?? pick.selection;
  return `${pick.homeTeam} vs ${pick.awayTeam} | ${market}: ${sel} @ ${pick.oddsAtLog.toFixed(2)}`;
}

/** Deep link for an operator-issued code. Returns null if the code is missing or malformed. */
export function buildDeepLink(operator: Operator, code: string | null | undefined): string | null {
  if (!code || !CODE_PATTERN.test(code)) return null;
  return `${DEEP_LINK_BASE[operator]}?${CODE_PARAM[operator]}=${encodeURIComponent(code)}`;
}

export const EXPORT_NOTE =
  "Booking links for sportybet and bet9ja use the share-code URL formats seen in third-party guides. " +
  "They are UNVERIFIED until a live test on the operator site confirms the slip loads. " +
  "Until a real operator-issued code exists, use the copy-to-app text instead. No code is ever invented.";

/**
 * Build the export for a pick. `issuedCode` must come from the operator (never generated here).
 * Throws at/after kickoff.
 */
export function exportPick(
  operator: Operator,
  pick: BookablePick,
  issuedCode: string | null = null,
  now: Date = new Date(),
): BookingExport {
  if (!OPERATORS.includes(operator)) throw new Error("unsupported operator");
  if (new Date(pick.kickoffTime).getTime() <= now.getTime()) {
    throw new Error("cannot export a pick at or after kickoff");
  }
  const text = selectionText(pick);
  const deepLink = buildDeepLink(operator, issuedCode);
  return {
    operator,
    code: deepLink ? issuedCode : null,
    deepLink,
    fallback: {
      kind: "copy_to_app",
      label: `copy this into ${operator} betslip manually`,
      text,
    },
    linkStatus: deepLink ? "unverified_format" : "no_code_issued",
    note: EXPORT_NOTE,
    oddsAtExport: pick.oddsAtLog,
  };
}
