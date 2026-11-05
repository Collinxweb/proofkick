// Kick round rules. Pure functions: no network, no database. Every number a user sees comes from here.
//
// A round opens at a fixed UTC time, takes kicks until `entryClosesAt`, and settles at `expiresAt` by comparing
// the price print with the opening price. Pools are two-sided (long = price up, short = price down).
// Winners share the whole pool in proportion to their stake. A tie or a one-sided round is refunded in full.

export const HORIZONS = {
  "24H": { hours: 24, entryHours: 6, cadence: "daily" },   // opens 12:00 UTC, entries until 18:00 UTC
  "1W": { hours: 168, entryHours: 144, cadence: "weekly" }, // entries until the last 24 hours (expiry minus 24h)
};

export const CATALOG = [
  { asset: "BTC", horizon: "24H" }, { asset: "BTC", horizon: "1W" },
  { asset: "ETH", horizon: "24H" }, { asset: "ETH", horizon: "1W" },
  { asset: "PAXG", horizon: "24H" }, { asset: "PAXG", horizon: "1W" },
];

const DAY = 864e5;

// 24H rounds open at 12:00 UTC each day. 1W rounds open Monday 00:00 UTC (on demand, see ops.js).
const NOON_MS = 12 * 3600e3;
export function roundStart(horizon, nowMs) {
  const d = new Date(nowMs);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (horizon === "24H") {
    const today = midnight + NOON_MS;
    return nowMs >= today ? today : today - DAY;
  }
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return midnight - dow * DAY;
}

export function roundId(asset, horizon, startMs) {
  return `${asset}-${horizon}-${new Date(startMs).toISOString().slice(0, 10)}`;
}

export function roundWindow(horizon, startMs) {
  const h = HORIZONS[horizon];
  return {
    opensAt: startMs,
    entryClosesAt: startMs + h.entryHours * 3600e3,
    expiresAt: startMs + h.hours * 3600e3,
  };
}

// Whether a kick is accepted right now. The contract repeats this check; the server check is for a clear error message.
export function kickState(round, nowMs) {
  if (round.state === "void" || round.state === "settled" || round.state === "settling") return { open: false, reason: `round is ${round.state}` };
  if (nowMs < round.opens_at) return { open: false, reason: "round has not opened yet" };
  if (nowMs >= round.entry_closes_at) return { open: false, reason: "entries are closed for this round" };
  return { open: true };
}

// Implied chance from the pools: the share of the pool on each side. Whole percent, never fake precision.
export function impliedPct(longPool, shortPool) {
  const total = Number(longPool) + Number(shortPool);
  if (!(total > 0)) return { long: null, short: null, total: 0 };
  const long = Math.round((Number(longPool) / total) * 100);
  return { long, short: 100 - long, total };
}

// Pool-weighted payout for one entry, assuming the round settles to `winner`.
export function payoutFor(entry, winner, longPool, shortPool) {
  const stake = Number(entry.stake);
  if (winner === "void") return stake; // refund
  if (entry.side !== winner) return 0;
  const winningPool = winner === "long" ? Number(longPool) : Number(shortPool);
  const total = Number(longPool) + Number(shortPool);
  if (!(winningPool > 0)) return stake; // nothing on the winning side: refund rather than divide by zero
  return (stake / winningPool) * total;
}

// Grades a round from its opening and closing prices.
export function decideRound({ openPrice, closePrice, longPool, shortPool }) {
  if (!(openPrice > 0) || !(closePrice > 0)) return { outcome: "void", reason: "missing price print" };
  if (Number(longPool) <= 0 || Number(shortPool) <= 0) return { outcome: "void", reason: "one-sided pool: everyone is refunded" };
  if (closePrice === openPrice) return { outcome: "void", reason: "tie: everyone is refunded" };
  return { outcome: closePrice > openPrice ? "long" : "short", reason: null };
}

// Grades one entry after the round is decided. A losing entry is kept as a receipt with status "lost" (a "missed" grade).
export function gradeEntry(entry, outcome) {
  if (outcome === "void") return { status: "refunded", payout: Number(entry.stake) };
  if (entry.side === outcome) return { status: "won", payout: null }; // payout is computed with the final pools
  return { status: "lost", payout: 0 };
}

// Conservation check used by tests and by the settlement job before it writes anything.
export function checkConservation(entries, outcome, longPool, shortPool) {
  const paid = entries.reduce((s, e) => s + payoutFor(e, outcome, longPool, shortPool), 0);
  const pool = Number(longPool) + Number(shortPool);
  return { paid, pool, ok: Math.abs(paid - pool) < 1e-6 };
}
