import assert from "node:assert/strict";
import { parseCandles, unwrapKraken, priceAt } from "../lib/prices.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
t("Kraken rows parse oldest first with open at index 1", () => {
  const rows = [[1700003600, 99, 102, 98, 101, 100, 5, 9], [1700000000, 98, 101, 97, 100, 99, 4, 8], [1700007200, 0, 0, 0, 0, 0, 1, 1]];
  const c = parseCandles(rows);
  assert.equal(c.length, 2);
  assert.equal(c[0].open, 98); assert.equal(c[0].low, 97); assert.equal(c[1].close, 101);
  assert.equal(priceAt(c, 1700003600 * 1000 + 10), 99);
  assert.equal(priceAt(c, 1), null);
});
t("unwrapKraken finds the pair key even when it differs from the input code", () => {
  const json = { error: [], result: { XXBTZUSD: [[1, 1, 1, 1, 1, 1, 1, 1]], last: "1" } };
  assert.equal(unwrapKraken(json).length, 1);
});
t("unwrapKraken throws on Kraken errors and on empty results", () => {
  assert.throws(() => unwrapKraken({ error: ["EQuery:Unknown asset pair"], result: {} }), /Unknown asset pair/);
  assert.throws(() => unwrapKraken({ error: [], result: { last: "1" } }), /no candles/);
});
console.log(`${n} test groups passed`);
