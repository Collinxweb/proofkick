import assert from "node:assert/strict";
import { deriveSeed } from "../../lib/kick/custodial-rules.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
const MASTER = "x".repeat(40);
t("the same account always derives the same key material", () => {
  assert.equal(deriveSeed(MASTER, "user-1").toString("hex"), deriveSeed(MASTER, "user-1").toString("hex"));
  assert.equal(deriveSeed(MASTER, "user-1").length, 32);
});
t("different accounts derive different keys", () => {
  assert.notEqual(deriveSeed(MASTER, "user-1").toString("hex"), deriveSeed(MASTER, "user-2").toString("hex"));
});
t("a short master secret is refused", () => {
  assert.throws(() => deriveSeed("short", "user-1"), /at least 32/);
});
console.log(`${n} test groups passed`);
