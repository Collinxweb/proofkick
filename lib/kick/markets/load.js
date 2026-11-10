// Loads the latest rounds with pools, implied chance and the momentum reading. Server-only.
import { fetchCandles, priceAt } from "../prices";
import { impliedPct, kickState } from "../rounds";
import { momentum } from "../chance";

export async function loadRounds(db, nowMs) {
  const { data: rows } = await db.from("kick_rounds").select("*").eq("archived", false).order("opens_at", { ascending: false }).limit(12);
  const ids = (rows ?? []).map((r) => r.id);
  const { data: entries } = ids.length ? await db.from("kick_entries").select("round_id, side, stake").in("round_id", ids) : { data: [] };
  const pools = {};
  for (const e of entries ?? []) {
    const p = (pools[e.round_id] ??= { long: 0, short: 0 });
    if (e.side === "long") p.long += Number(e.stake); else p.short += Number(e.stake);
  }
  const assets = [...new Set((rows ?? []).map((r) => r.asset))];
  const candleList = await Promise.allSettled(assets.map((a) => fetchCandles(a)));
  const candles = Object.fromEntries(assets.map((a, i) => [a, candleList[i].status === "fulfilled" ? candleList[i].value : null]));
  return (rows ?? []).map((r) => {
    const opensMs = Date.parse(r.opens_at), entryMs = Date.parse(r.entry_closes_at), expiresMs = Date.parse(r.expires_at);
    const p = pools[r.id] ?? { long: 0, short: 0 };
    const c = candles[r.asset];
    const last = c?.length ? c[c.length - 1].close : null;
    const mom = c && last ? momentum({ candles: c, openPrice: Number(r.open_price), currentPrice: last }) : { upPct: null };
    const gate = kickState({ state: r.state, opens_at: opensMs, entry_closes_at: entryMs }, nowMs);
    const implied = impliedPct(p.long, p.short);
    return {
      id: r.id, asset: r.asset, horizon: r.horizon, state: r.state, outcome: r.outcome, kind: r.kind ?? "pool",
      spark: c ? c.slice(-24).map((x) => x.close) : [],
      opensMs, entryMs, expiresMs, openPrice: Number(r.open_price), closePrice: r.close_price ? Number(r.close_price) : null,
      lastPrice: last, long: p.long, short: p.short, impliedLong: implied.long, impliedShort: implied.short,
      momentumUp: mom.upPct ?? null, canEnter: gate.open && r.state === "open", reason: gate.open ? null : gate.reason,
    };
  });
}

export async function loadMyKicks(db, userId) {
  const { data } = await db.from("kick_entries").select("id, round_id, side, stake, status, payout, payout_testnet_tx, created_at, entry_price, revoke_reason, kick_rounds(asset, horizon, state, outcome)")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map((e) => ({
    id: e.id, roundId: e.round_id, side: e.side, stake: Number(e.stake), status: e.status, entryPrice: e.entry_price != null ? Number(e.entry_price) : null, revokeReason: e.revoke_reason ?? null,
    payout: e.payout != null ? Number(e.payout) : null, redeemed: Boolean(e.payout_testnet_tx),
    asset: e.kick_rounds?.asset, horizon: e.kick_rounds?.horizon, roundState: e.kick_rounds?.state, outcome: e.kick_rounds?.outcome,
  }));
}
