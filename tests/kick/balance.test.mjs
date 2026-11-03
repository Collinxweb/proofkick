import assert from "node:assert/strict";
import { formatKick, toKickUnits } from "../../lib/kick/balance-rules.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
t("6-decimal base units become KICK", () => {
  assert.equal(toKickUnits("10000000000"), 10000);
  assert.equal(toKickUnits("1500000"), 1.5);
});
t("KICK is shown with separators, and missing values show nothing", () => {
  assert.equal(formatKick(10000), "10,000");
  assert.equal(formatKick(null), null);
  assert.equal(formatKick(Number.NaN), null);
});
t("garbage input is refused rather than shown as a number", () => {
  assert.equal(toKickUnits("abc"), null);
});
console.log(`${n} test groups passed`);
