import assert from "node:assert/strict";
import { recallFor } from "../../lib/history/recall.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };
const base = (over) => ({ fixtureId: over.fixtureId ?? "f", homeTeam: "Arsenal", awayTeam: "Brighton", selection: "home", status: "won", locked: true, kickoff: "2026-10-01T15:00:00Z", ...over });
t("draws are recalled for the same two teams, in either order", () => {
  const cand = { fixtureId: "new", homeTeam: "Arsenal", awayTeam: "Brighton", selection: "draw" };
  const h = [base({ fixtureId: "a", selection: "draw", status: "won" }), base({ fixtureId: "b", selection: "draw", status: "lost", homeTeam: "Brighton", awayTeam: "Arsenal" }), base({ fixtureId: "c", selection: "draw", status: "lost" })];
  const r = recallFor(cand, h);
  assert.equal(r.market, "draw"); assert.equal(r.wins, 1); assert.equal(r.settled, 3);
  assert.match(r.text, /A draw in Arsenal vs Brighton, 1 draw from 3 settled picks/);
});
t("a draw is never compared with a team-to-win pick", () => {
  const cand = { fixtureId: "new", homeTeam: "Arsenal", awayTeam: "Brighton", selection: "draw" };
  const h = [base({ fixtureId: "a" }), base({ fixtureId: "b" }), base({ fixtureId: "c" })];
  assert.equal(recallFor(cand, h), null);
});
t("multi legs count as picks and the note says so", () => {
  const cand = { fixtureId: "new", homeTeam: "Arsenal", awayTeam: "Brighton", selection: "home" };
  const h = [base({ fixtureId: "a", multiLeg: true }), base({ fixtureId: "b", status: "lost", multiLeg: true, kickoff: "2026-10-18T15:00:00Z" }), base({ fixtureId: "c" })];
  const r = recallFor(cand, h);
  assert.equal(r.multiLegs, 2);
  assert.match(r.text, /\(incl\. 2 multi legs\)/);
});
t("the same market matches for the same team, whichever venue", () => {
  const cand = { fixtureId: "new", homeTeam: "Arsenal", awayTeam: "Brighton", selection: "home" };
  const h = [base({ fixtureId: "a" }), base({ fixtureId: "b" }), base({ fixtureId: "c", homeTeam: "Chelsea", awayTeam: "Arsenal", selection: "away" })];
  assert.equal(recallFor(cand, h).settled, 3);
});
console.log(`${n} test groups passed`);
