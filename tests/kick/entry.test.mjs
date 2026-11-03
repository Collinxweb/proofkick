import assert from "node:assert/strict";
import { validateEntry, MAX_STAKE } from "../../lib/kick/entry-rules.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
const base = { side: "long", amount: "100", balance: 10000, state: "open", opensAt: 1000, entryClosesAt: 5000, now: 2000 };
t("a valid GREEN kick is accepted with the right units", () => {
  const r = validateEntry(base);
  assert.equal(r.ok, true); assert.equal(r.side, 1); assert.equal(r.units, 100000000n);
});
t("RED maps to the short side", () => {
  assert.equal(validateEntry({ ...base, side: "short" }).side, 2);
});
t("stakes above the balance, above zero, or above the maximum are refused", () => {
  assert.equal(validateEntry({ ...base, amount: "20000" }).ok, false);
  assert.equal(validateEntry({ ...base, amount: "0" }).ok, false);
  assert.equal(validateEntry({ ...base, amount: String(MAX_STAKE + 1), balance: 1e9 }).ok, false);
});
t("entries outside the window are refused, before open and after close", () => {
  assert.equal(validateEntry({ ...base, now: 500 }).ok, false);
  assert.equal(validateEntry({ ...base, now: 5000 }).ok, false);
});
t("settled or voided rounds refuse entries", () => {
  assert.equal(validateEntry({ ...base, state: "settled" }).ok, false);
  assert.equal(validateEntry({ ...base, state: "void" }).ok, false);
});
t("an unknown balance refuses the kick rather than guessing", () => {
  assert.equal(validateEntry({ ...base, balance: null }).ok, false);
});
console.log(`${n} test groups passed`);
