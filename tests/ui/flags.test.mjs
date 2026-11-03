import assert from "node:assert/strict";
import { flagEmoji, leagueFlag, coverYear } from "../../lib/flags.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
t("country codes become flags", () => {
  assert.equal(flagEmoji("NG"), "\u{1F1F3}\u{1F1EC}");
  assert.equal(flagEmoji("gb"), "\u{1F1EC}\u{1F1E7}");
  assert.equal(flagEmoji(""), "");
  assert.equal(flagEmoji("NGA"), "");
});
t("leagues map to their country flag, Champions League to EU", () => {
  assert.equal(leagueFlag("soccer_epl"), "\u{1F1EC}\u{1F1E7}");
  assert.equal(leagueFlag("soccer_uefa_champs_league"), "\u{1F1EA}\u{1F1FA}");
  assert.equal(leagueFlag("unknown"), "");
});
t("year of birth is always covered, day and month stay visible", () => {
  assert.equal(coverYear("2005-11-25"), "****-11-25");
  assert.equal(coverYear(null), "Not set");
});
console.log(`${n} test groups passed`);
