// Pure sponsorship rules (no SDK import), so they can be tested without the chain library.
import { createHash } from "node:crypto";

export const DEFAULT_DAILY_CAP = 300;

export const hashBytes = (buf) => createHash("sha256").update(buf).digest("hex");

export function dailyCap() {
  const n = Number(process.env.KICK_SPONSOR_DAILY_CAP ?? DEFAULT_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_CAP;
}

// Decides whether a submitted transaction may be executed with the sponsor's signature.
export function decideExecute(row) {
  if (!row) return { ok: false, error: "This transaction was not prepared by ProofKick, so it cannot be sponsored." };
  if (row.used_at) return { ok: false, error: "This claim was already submitted. Refresh the page to start again." };
  return { ok: true };
}
