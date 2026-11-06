import assert from "node:assert/strict";
import { fixedPayout, chanceBps, quoteMessage } from "../../lib/kick/quote.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
t("76% on 1000 pays 1276 with the 3% margin", () => {
  assert.equal(fixedPayout(1000, 7600), 1276);
});
t("50% on 1000 pays 1940", () => {
  assert.equal(fixedPayout(1000, 5000), 1940);
});
t("GREEN uses the up reading, RED the down reading, bounded 1 to 99", () => {
  assert.equal(chanceBps(76, "long"), 7600);
  assert.equal(chanceBps(76, "short"), 2400);
  assert.equal(chanceBps(100, "long"), 9900);
  assert.equal(chanceBps(0, "long"), 100);
});
t("the signed message is 49 bytes: id, side, chance, expiry", () => {
  const m = quoteMessage("0x" + "ab".repeat(32), 1, 7600, 1700000000000);
  assert.equal(m.length, 49);
  assert.equal(m[32], 1);
});
console.log(`${n} test groups passed`);
