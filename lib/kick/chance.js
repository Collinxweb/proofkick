// Momentum indicator shown next to the pool-implied percentage. It is NOT a forecast and is not calibrated yet.
//
// Inputs: hourly candles (oldest first), the round's opening price, and the current price.
// Parts:
//   trend     EMA(9) vs EMA(21) gap, scaled. Positive means recent prices are rising faster.
//   distance  how far the price has moved from the round open (3% counts as a full move).
//   session   time-of-day drift. Weight 0 until it has been back-tested, so it does not move the number.
// Volatility (ATR relative to the candle range) does not change the direction. It shrinks the signal when the
// market is choppy, because a choppy market tells us less.
//
// Every output is logged to Walrus with these weights, so the reading can be checked later.

export const CHANCE_VERSION = "momentum-v1";
export const WEIGHTS = { trend: 0.4, distance: 0.6, session: 0 };
export const DISTANCE_FULL = 0.03; // a 3% move from the open is a full distance signal
export const TREND_SCALE = 20;      // a 5% EMA gap is a full trend signal

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

export function atrRatio(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  const hi = Math.max(...candles.slice(-period).map((c) => c.high));
  const lo = Math.min(...candles.slice(-period).map((c) => c.low));
  return hi > lo ? clamp(atr / (hi - lo), 0, 1) : 0;
}

// Returns whole-percent chance that the round closes UP, plus every part so the statement can show why.
export function momentum({ candles, openPrice, currentPrice }) {
  const closes = candles.map((c) => c.close);
  const e9 = ema(closes, 9), e21 = ema(closes, 21);
  if (!(e9 && e21) || !(openPrice > 0) || !(currentPrice > 0)) return { upPct: null, reason: "not enough candles yet" };
  const trend = clamp(((e9 - e21) / e21) * TREND_SCALE, -1, 1);
  const distance = clamp(((currentPrice - openPrice) / openPrice) / DISTANCE_FULL, -1, 1);
  const session = 0;
  const vol = atrRatio(candles);
  const dampener = vol == null ? 1 : 0.5 + 0.5 * (1 - vol);
  const score = (WEIGHTS.trend * trend + WEIGHTS.distance * distance + WEIGHTS.session * session) * dampener;
  const upPct = clamp(Math.round(50 + 45 * Math.tanh(score * 1.5)), 5, 95);
  return { upPct, version: CHANCE_VERSION, weights: WEIGHTS, parts: { trend: round3(trend), distance: round3(distance), session, volatilityRatio: vol == null ? null : round3(vol), dampener: round3(dampener) } };
}

const round3 = (x) => Math.round(x * 1000) / 1000;
