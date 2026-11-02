import assert from "node:assert/strict";
import { decideExecute, hashBytes, dailyCap, DEFAULT_DAILY_CAP } from "../../lib/kick/sponsor.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
t("only transactions prepared by the server can be sponsored", () => {
  assert.equal(decideExecute(undefined).ok, false);
  assert.equal(decideExecute(null).ok, false);
});
t("a prepared transaction can be submitted once", () => {
  assert.equal(decideExecute({ id: "1", used_at: null }).ok, true);
  assert.equal(decideExecute({ id: "1", used_at: "2026-11-02T00:00:00Z" }).ok, false);
});
t("the hash binds the transaction bytes, so an altered transaction does not match", () => {
  const a = Buffer.from([1, 2, 3]), b = Buffer.from([1, 2, 4]);
  assert.notEqual(hashBytes(a), hashBytes(b));
  assert.equal(hashBytes(a), hashBytes(Buffer.from([1, 2, 3])));
});
t("the daily cap defaults to 300 and is positive", () => {
  delete process.env.KICK_SPONSOR_DAILY_CAP;
  assert.equal(dailyCap(), DEFAULT_DAILY_CAP);
  process.env.KICK_SPONSOR_DAILY_CAP = "0";
  assert.equal(dailyCap(), DEFAULT_DAILY_CAP);
});
console.log(`${n} test groups passed`);
