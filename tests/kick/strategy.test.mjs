import assert from "node:assert/strict";
import { evaluateKickRule, validateStrategy } from "../../lib/kick/strategy-rules.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
t("momentum follows strong readings in either direction and stays out of the middle", () => {
  assert.equal(evaluateKickRule({ rule: "momentum", threshold: 65, momentumUp: 80 }), "long");
  assert.equal(evaluateKickRule({ rule: "momentum", threshold: 65, momentumUp: 30 }), "short");
  assert.equal(evaluateKickRule({ rule: "momentum", threshold: 65, momentumUp: 50 }), null);
});
t("contrarian goes against a crowded pool", () => {
  assert.equal(evaluateKickRule({ rule: "contrarian", threshold: 65, impliedLong: 70, impliedShort: 30 }), "short");
  assert.equal(evaluateKickRule({ rule: "contrarian", threshold: 65, impliedLong: 30, impliedShort: 70 }), "long");
  assert.equal(evaluateKickRule({ rule: "contrarian", threshold: 65, impliedLong: 50, impliedShort: 50 }), null);
});
t("no reading means no kick", () => {
  assert.equal(evaluateKickRule({ rule: "momentum", threshold: 65, momentumUp: null }), null);
});
t("strategy inputs are validated", () => {
  assert.equal(validateStrategy({ asset: "BTC", horizon: "24H", rule: "momentum", threshold: 65, stake: 50 }).ok, true);
  assert.equal(validateStrategy({ asset: "DOGE", horizon: "24H", rule: "momentum", threshold: 65, stake: 50 }).ok, false);
  assert.equal(validateStrategy({ asset: "BTC", horizon: "24H", rule: "momentum", threshold: 62, stake: 50 }).ok, false);
  assert.equal(validateStrategy({ asset: "BTC", horizon: "24H", rule: "momentum", threshold: 65, stake: 5000 }).ok, false);
});
console.log(`${n} test groups passed`);
