// Kick strategy rules (pure, no SDK). A rule either returns "long" (GREEN), "short" (RED) or null (no kick).
//  momentum:    follow the momentum reading. Up at or above the threshold means GREEN; down at or below 100 minus the threshold means RED.
//  contrarian:  go against a crowded pool. If GREEN holds at least the threshold share of the stake, kick RED; the reverse for RED.
export const RULE_LABEL = { momentum: "Follow momentum", contrarian: "Against a crowded pool" };
export const THRESHOLDS = [55, 60, 65, 70, 75, 80];
export const MAX_STRATEGY_STAKE = 1000;

export function evaluateKickRule({ rule, threshold, momentumUp, impliedLong, impliedShort }) {
  if (rule === "momentum") {
    if (momentumUp == null) return null;
    if (momentumUp >= threshold) return "long";
    if (momentumUp <= 100 - threshold) return "short";
    return null;
  }
  if (rule === "contrarian") {
    if (impliedLong == null || impliedShort == null) return null;
    if (impliedLong >= threshold) return "short";
    if (impliedShort >= threshold) return "long";
    return null;
  }
  return null;
}

export function validateStrategy({ asset, horizon, rule, threshold, stake }) {
  if (!["BTC", "ETH", "PAXG"].includes(asset)) return { ok: false, error: "Choose BTC, ETH or gold." };
  if (!["24H", "1W"].includes(horizon)) return { ok: false, error: "Choose 24H or 1W." };
  if (!RULE_LABEL[rule]) return { ok: false, error: "Choose a rule." };
  const t = Number(threshold);
  if (!THRESHOLDS.includes(t)) return { ok: false, error: "Choose a threshold from the list." };
  const s = Number(stake);
  if (!(s > 0) || s > MAX_STRATEGY_STAKE) return { ok: false, error: `Stake per round: above 0 and up to ${MAX_STRATEGY_STAKE} KICK.` };
  return { ok: true, threshold: t, stake: s };
}
