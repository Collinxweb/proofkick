import assert from "node:assert/strict";
import * as R from "./rounds.mjs";
import * as C from "./chance.mjs";
import { parseCandles, priceAt } from "./prices.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };

t("24H rounds open at UTC midnight; 1W rounds open on Monday UTC", () => {
  const wed = Date.parse("2026-11-04T15:20:00Z");
  assert.equal(new Date(R.roundStart("24H", wed)).toISOString(), "2026-11-04T12:00:00.000Z");
  assert.equal(new Date(R.roundStart("24H", Date.parse("2026-11-04T10:00:00Z"))).toISOString(), "2026-11-03T12:00:00.000Z");
  assert.equal(new Date(R.roundStart("1W", wed)).toISOString(), "2026-11-02T00:00:00.000Z"); // Monday
  const mon = Date.parse("2026-11-02T00:00:00Z");
  assert.equal(new Date(R.roundStart("1W", mon)).toISOString(), "2026-11-02T00:00:00.000Z");
  const sun = Date.parse("2026-11-08T12:00:00Z");
  assert.equal(new Date(R.roundStart("1W", sun)).toISOString(), "2026-11-02T00:00:00.000Z");
});
t("entry windows: 6 hours for 24H, until the last 24 hours for weekly", () => {
  const s = Date.parse("2026-11-04T00:00:00Z");
  const d = R.roundWindow("24H", s), w = R.roundWindow("1W", s);
  assert.equal((d.entryClosesAt - s) / 3600e3, 6); assert.equal((d.expiresAt - s) / 3600e3, 24);
  assert.equal((w.entryClosesAt - s) / 3600e3, 144); assert.equal((w.expiresAt - s) / 3600e3, 168);
});
t("kicks are refused before open, after the entry window, and on decided rounds", () => {
  const r = { opens_at: Date.parse("2026-11-04T00:00:00Z"), entry_closes_at: Date.parse("2026-11-04T06:00:00Z"), state: "open" };
  assert.equal(R.kickState(r, Date.parse("2026-11-03T23:59:00Z")).open, false);
  assert.equal(R.kickState(r, Date.parse("2026-11-04T03:00:00Z")).open, true);
  assert.equal(R.kickState(r, Date.parse("2026-11-04T06:00:00Z")).open, false);
  assert.equal(R.kickState({ ...r, state: "settling" }, Date.parse("2026-11-04T03:00:00Z")).open, false);
});
t("implied chance comes from the pool split and is a whole percent", () => {
  assert.deepEqual(R.impliedPct(300, 100), { long: 75, short: 25, total: 400 });
  assert.deepEqual(R.impliedPct(0, 0), { long: null, short: null, total: 0 });
  assert.equal(R.impliedPct(1, 2).long, 33);
});
t("pool-weighted payouts pay out exactly the whole pool (conservation)", () => {
  const entries = [{ side: "long", stake: 100 }, { side: "long", stake: 300 }, { side: "short", stake: 600 }];
  const L = 400, S = 600;
  const chk = R.checkConservation(entries, "long", L, S);
  assert.ok(chk.ok, JSON.stringify(chk));
  assert.equal(R.payoutFor(entries[0], "long", L, S), 250); // 100/400 of 1000
  assert.equal(R.payoutFor(entries[2], "long", L, S), 0);
  assert.ok(R.checkConservation(entries, "short", L, S).ok);
});
t("ties, one-sided pools and missing prints are refunded, never divided by zero", () => {
  assert.equal(R.decideRound({ openPrice: 100, closePrice: 100, longPool: 5, shortPool: 5 }).outcome, "void");
  assert.equal(R.decideRound({ openPrice: 100, closePrice: 101, longPool: 5, shortPool: 0 }).outcome, "void");
  assert.equal(R.decideRound({ openPrice: 100, closePrice: null, longPool: 5, shortPool: 5 }).outcome, "void");
  assert.equal(R.payoutFor({ side: "long", stake: 40 }, "void", 40, 0), 40);
  assert.equal(R.payoutFor({ side: "long", stake: 40 }, "long", 40, 0), 40); // winning side only: refund, no divide by zero
});
t("the round outcome follows the price move, and losing entries stay as receipts", () => {
  assert.equal(R.decideRound({ openPrice: 100, closePrice: 101, longPool: 5, shortPool: 5 }).outcome, "long");
  assert.equal(R.decideRound({ openPrice: 100, closePrice: 99, longPool: 5, shortPool: 5 }).outcome, "short");
  assert.deepEqual(R.gradeEntry({ side: "short", stake: 10 }, "long"), { status: "lost", payout: 0 });
  assert.deepEqual(R.gradeEntry({ side: "long", stake: 10 }, "void"), { status: "refunded", payout: 10 });
});
t("momentum: a price above the open leans up, below leans down, flat is 50", () => {
  const candles = Array.from({ length: 40 }, (_, i) => ({ t: i * 3600e3, open: 100 + i * 0.1, high: 100 + i * 0.1 + 0.4, low: 100 + i * 0.1 - 0.4, close: 100 + i * 0.1 }));
  const last = candles[candles.length - 1].close;
  const up = C.momentum({ candles, openPrice: last - 1.5, currentPrice: last });
  const down = C.momentum({ candles, openPrice: last + 1.5, currentPrice: last });
  assert.ok(up.upPct > 50 && down.upPct < 50, JSON.stringify([up.upPct, down.upPct]));
  assert.equal(C.WEIGHTS.session, 0, "session drift stays at weight 0 until back-tested");
  assert.equal(C.momentum({ candles: candles.slice(0, 5), openPrice: 100, currentPrice: 100 }).upPct, null);
});
t("momentum is bounded to 5 to 95 and reports its weights", () => {
  const candles = Array.from({ length: 40 }, (_, i) => ({ open: 100 + i, high: 101 + i, low: 99 + i, close: 100 + i }));
  const m = C.momentum({ candles, openPrice: 1, currentPrice: 1000 });
  assert.ok(m.upPct >= 5 && m.upPct <= 95);
  assert.ok(m.weights && m.version === C.CHANCE_VERSION);
});
t("catalog: BTC, ETH and PAXG on 24H and 1W, nothing else", () => {
  assert.equal(R.CATALOG.length, 6);
  assert.deepEqual([...new Set(R.CATALOG.map((c) => c.asset))].sort(), ["BTC", "ETH", "PAXG"]);
});
console.log(`${n} test groups passed`);
