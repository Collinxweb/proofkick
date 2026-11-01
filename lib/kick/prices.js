// Price source for Kick rounds: Kraken public market data. No key, no account.
// Documented OHLC row: [time, open, high, low, close, vwap, volume, count] (time in seconds). Up to the 720 most recent candles.
// Kraken's own pair codes are used (Bitcoin is XBT). PAXG's pair is checked at runtime by /api/kick/probe before anything relies on it.
export const SOURCE = { name: "Kraken public market data", base: "https://api.kraken.com/0/public" };

export const ASSETS = {
  BTC: { pair: "XBTUSD", label: "Bitcoin" },
  ETH: { pair: "ETHUSD", label: "Ethereum" },
  PAXG: { pair: "PAXGUSD", label: "Gold (PAXG)", note: "PAXG tracks gold and trades around the clock; spot gold closes at weekends." },
};

export const INTERVAL_MIN = 60; // hourly candles

export function parseCandles(rows) {
  return (rows ?? [])
    .map((r) => ({ t: Number(r[0]) * 1000, open: Number(r[1]), high: Number(r[2]), low: Number(r[3]), close: Number(r[4]) }))
    .filter((c) => [c.open, c.high, c.low, c.close].every((x) => Number.isFinite(x) && x > 0))
    .sort((a, b) => a.t - b.t);
}

// Kraken returns { error: [], result: { <PAIRKEY>: [...rows], last: "..." } }. The pair key is not always the input code.
export function unwrapKraken(json) {
  if (json?.error?.length) throw new Error(`kraken: ${json.error.join("; ")}`);
  const key = Object.keys(json?.result ?? {}).find((k) => k !== "last");
  if (!key) throw new Error("kraken: no candles in response");
  return json.result[key];
}

export async function fetchCandles(asset) {
  const pair = ASSETS[asset]?.pair;
  if (!pair) throw new Error(`unknown asset ${asset}`);
  const url = `${SOURCE.base}/OHLC?pair=${pair}&interval=${INTERVAL_MIN}`;
  const r = await fetch(url, { cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`kraken ${pair} OHLC: HTTP ${r.status}`);
  return parseCandles(unwrapKraken(await r.json()));
}

// The price "at" a moment: the open of the last candle that started at or before it.
export function priceAt(candles, ms) {
  let hit = null;
  for (const c of candles) if (c.t <= ms) hit = c; else break;
  return hit ? hit.open : null;
}
