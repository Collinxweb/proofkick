// Pure entry rules (no SDK), so they can be tested. A kick is a stake on GREEN (long) or RED (short).
export const SIDE = { long: 1, short: 2 };
export const MAX_STAKE = 100000; // KICK per kick, testnet

export function validateEntry({ side, amount, balance, state, opensAt, entryClosesAt, now }) {
  if (!SIDE[side]) return { ok: false, error: "Choose GREEN or RED." };
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: "Enter an amount above zero." };
  if (Math.round(amt * 1e6) !== amt * 1e6) return { ok: false, error: "Use at most 6 decimal places." };
  if (amt > MAX_STAKE) return { ok: false, error: `The most you can kick at once is ${MAX_STAKE.toLocaleString("en-US")} KICK.` };
  if (balance == null) return { ok: false, error: "Balance is unavailable right now. Try again." };
  if (amt > balance) return { ok: false, error: "Not enough testnet KICK for that stake." };
  if (state === "settling" || state === "settled" || state === "void") return { ok: false, error: `This round is ${state}.` };
  if (now < opensAt) return { ok: false, error: "This round has not opened yet." };
  if (now >= entryClosesAt) return { ok: false, error: "Entries are closed for this round." };
  return { ok: true, side: SIDE[side], units: BigInt(Math.round(amt * 1e6)), amount: amt };
}
