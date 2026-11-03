// Pure formatting (no SDK), so it can be tested. KICK has 6 decimals.
export const KICK_DECIMALS = 6;

export function formatKick(units) {
  if (units == null || !Number.isFinite(units)) return null;
  return units.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function toKickUnits(raw) {
  const n = Number(raw);
  return Number.isFinite(n) ? n / 10 ** KICK_DECIMALS : null;
}
