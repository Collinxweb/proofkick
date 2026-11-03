import assert from "node:assert/strict";
import { groupCalls } from "../../lib/social/group.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
const pick = (id, at) => ({ id, locked_at: at });
t("single calls stay as calls", () => {
  const items = groupCalls({ calls: [pick("a", "2026-11-03T10:00:00Z")], slips: [] });
  assert.equal(items.length, 1); assert.equal(items[0].type, "call");
});
t("a multi shows once as a ticket, and its legs are not repeated as calls", () => {
  const legA = pick("a", "2026-11-03T10:00:00Z"), legB = pick("b", "2026-11-03T10:01:00Z");
  const slip = { id: "s1", kind: "multi", legs: [{ position: 2, pick: legB }, { position: 1, pick: legA }] };
  const items = groupCalls({ calls: [legA, legB], slips: [slip] });
  assert.equal(items.length, 1);
  assert.equal(items[0].type, "slip");
  assert.deepEqual(items[0].legs.map((p) => p.id), ["a", "b"], "legs ordered by position");
});
t("a single-leg slip is a single call, not a ticket", () => {
  const p = pick("x", "2026-11-03T10:00:00Z");
  const items = groupCalls({ calls: [p], slips: [{ id: "s2", kind: "single", legs: [{ position: 1, pick: p }] }] });
  assert.equal(items.length, 1); assert.equal(items[0].type, "call");
});
t("items are newest first", () => {
  const items = groupCalls({ calls: [pick("old", "2026-11-01T10:00:00Z"), pick("new", "2026-11-03T10:00:00Z")], slips: [] });
  assert.equal(items[0].c.id, "new");
});
console.log(`${n} test groups passed`);
