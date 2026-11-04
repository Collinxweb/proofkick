import assert from "node:assert/strict";
import { planFor, closeBefore } from "../../lib/kick/ops.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
t("the plan covers every catalog round with the agreed windows", () => {
  const plan = planFor(Date.parse("2026-11-04T10:00:00Z"));
  assert.equal(plan.length, 6);
  const btc24 = plan.find((p) => p.id === "BTC-24H-2026-11-04");
  assert.equal(new Date(btc24.start).toISOString(), "2026-11-04T00:00:00.000Z");
  assert.equal((btc24.entryClosesAt - btc24.start) / 3600e3, 6);
  assert.equal((btc24.expiresAt - btc24.start) / 3600e3, 24);
});
t("weekly rounds open now and their entry window is 48 hours", () => {
  const now = Date.parse("2026-11-04T10:00:30Z");
  const w = planFor(now).find((p) => p.horizon === "1W" && p.asset === "BTC");
  assert.equal(w.start, Date.parse("2026-11-04T10:00:00Z"));
  assert.equal((w.entryClosesAt - w.start) / 3600e3, 48);
  assert.equal((w.expiresAt - w.start) / 3600e3, 168);
});
t("closing price is the last candle that closed before expiry", () => {
  const candles = [{ t: 0, close: 10 }, { t: 3600e3, close: 11 }, { t: 7200e3, close: 12 }];
  assert.equal(closeBefore(candles, 7200e3), 11);
  assert.equal(closeBefore(candles, 0), null);
});
console.log(`${n} test groups passed`);
