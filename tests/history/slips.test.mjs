import assert from "node:assert/strict";
import { settleSlip, applyCorrections, metrics } from "../../lib/history/slips.mjs";
import { recallFor, MIN_SAMPLE } from "../../lib/history/recall.mjs";
let n = 0; const t = (name, f) => { f(); n++; console.log("ok", name); };

t("winning multi pays stake x product of odds", () => {
  const s = settleSlip({ stake: 10, legs: [{ result: "won", odds: 2 }, { result: "won", odds: 1.5 }] });
  assert.equal(s.status, "won"); assert.equal(s.grossPayout, 30); assert.equal(s.netUnits, 20);
});
t("losing leg loses the slip even while others are pending", () => {
  const s = settleSlip({ stake: 10, legs: [{ result: "lost", odds: 2 }, { result: "pending", odds: 3 }] });
  assert.equal(s.status, "lost"); assert.equal(s.grossPayout, 0); assert.equal(s.netUnits, -10);
});
t("pending slip is not settled and has no payout", () => {
  const s = settleSlip({ stake: 10, legs: [{ result: "won", odds: 2 }, { result: "pending", odds: 3 }] });
  assert.equal(s.status, "pending"); assert.equal(s.grossPayout, null); assert.equal(s.netUnits, null);
});
t("single void leg counts as 1.00 when the rest settle", () => {
  const s = settleSlip({ stake: 10, legs: [{ result: "won", odds: 2 }, { result: "void", odds: 4 }] });
  assert.equal(s.status, "won"); assert.equal(s.grossPayout, 20);
  assert.equal(s.appliedLegs[1].applied, 1);
});
t("all-void slip returns the stake", () => {
  const s = settleSlip({ stake: 10, legs: [{ result: "void", odds: 2 }, { result: "void", odds: 3 }] });
  assert.equal(s.status, "void"); assert.equal(s.grossPayout, 10); assert.equal(s.netUnits, 0);
});
t("corrected multi keeps the original snapshot and records the change", () => {
  const original = Object.freeze({ id: "s1", stake: 10, settledAt: "2026-11-01T20:00:00Z",
    settlement: { status: "lost" }, legs: Object.freeze([{ pickId: "a", result: "won", odds: 2 }, { pickId: "b", result: "lost", odds: 3 }]) });
  const fixed = applyCorrections(original, [{ pickId: "b", from: "lost", result: "won", at: "2026-11-02T09:00:00Z", reason: "wrong final score" }]);
  assert.equal(fixed.settlement.status, "won"); assert.equal(fixed.settlement.grossPayout, 60);
  assert.equal(fixed.corrected, true);
  assert.equal(fixed.history[0].settlement.status, "lost", "original outcome preserved");
  assert.equal(original.legs[1].result, "lost", "original leg not mutated");
});
t("metrics: slip win rate counts slips, not odds; pending and void excluded from the rate", () => {
  const slips = [
    { kind: "multi", stake: 10, status: "won", grossPayout: 30, legs: [{ result: "won" }, { result: "won" }] },
    { kind: "multi", stake: 10, status: "lost", grossPayout: 0, legs: [{ result: "won" }, { result: "lost" }] },
    { kind: "multi", stake: 10, status: "pending", legs: [{ result: "pending" }] },
    { kind: "multi", stake: 10, status: "void", grossPayout: 10, legs: [{ result: "void" }] },
  ];
  const m = metrics(slips).multi;
  assert.equal(m.slipWinRate.wins, 1); assert.equal(m.slipWinRate.of, 2); assert.equal(m.slipWinRate.pct, 50);
  assert.equal(m.legHitRate.wins, 3); assert.equal(m.legHitRate.of, 4); assert.equal(m.legHitRate.pct, 75);
  assert.equal(m.counts.pending, 1); assert.equal(m.counts.void, 1);
  assert.equal(m.stake, 30); assert.equal(m.grossPayout, 40); assert.equal(m.netUnits, 10);
  assert.equal(m.roi.pct, 33.3);
});
t("singles and multis are kept apart", () => {
  const m = metrics([
    { kind: "single", stake: 10, status: "won", grossPayout: 20, legs: [{ result: "won" }] },
    { kind: "multi", stake: 10, status: "lost", grossPayout: 0, legs: [{ result: "lost" }, { result: "won" }] },
  ]);
  assert.equal(m.single.slipWinRate.pct, 100); assert.equal(m.multi.slipWinRate.pct, 0);
});
t("recorded and staked calls are mixed correctly: win rate counts both, money counts staked only", () => {
  const m = metrics([
    { kind: "single", status: "won", legs: [{ result: "won" }] },
    { kind: "single", status: "lost", legs: [{ result: "lost" }] },
    { kind: "single", stake: 10, status: "won", grossPayout: 20, legs: [{ result: "won" }] },
  ]).single;
  assert.equal(m.slipWinRate.of, 3); assert.equal(m.slipWinRate.wins, 2);
  assert.equal(m.counts.recorded, 2); assert.equal(m.counts.staked, 1);
  assert.equal(m.stake, 10); assert.equal(m.netUnits, 10); assert.equal(m.roi.pct, 100);
});
t("unavailable is reported when stake is missing, never invented", () => {
  const m = metrics([{ kind: "single", status: "won", legs: [{ result: "won" }] }]).single;
  assert.ok(m.roi.unavailable); assert.ok(m.netUnits.unavailable); assert.ok(!m.slipWinRate.unavailable);
  assert.equal(m.counts.recorded, 1);
});
t("denominators: no settled slips means the rate is unavailable, not zero", () => {
  assert.ok(metrics([{ kind: "multi", stake: 5, status: "pending", legs: [{ result: "pending" }] }]).multi.slipWinRate.unavailable);
});

// ---- personal recall ----
const cand = { fixtureId: "f-new", homeTeam: "Arsenal", awayTeam: "Brighton", selection: "home" };
const hist = (over) => ({ fixtureId: over.fixtureId ?? "f-x", homeTeam: "Arsenal", awayTeam: "X FC", selection: "home", status: "won", locked: true, kickoff: "2026-10-01T15:00:00Z", ...over });
t("recall needs at least the minimum sample of comparable settled picks", () => {
  assert.equal(MIN_SAMPLE, 3);
  const two = [hist({ fixtureId: "a" }), hist({ fixtureId: "b", status: "lost" })];
  assert.equal(recallFor(cand, two), null);
});
t("recall shows team, wins, sample size, period and latest loss", () => {
  const h = [
    hist({ fixtureId: "a", kickoff: "2026-05-10T15:00:00Z" }),
    hist({ fixtureId: "b", status: "lost", score: "1-2", homeTeam: "Arsenal", awayTeam: "Brighton", kickoff: "2026-10-18T15:00:00Z" }),
    hist({ fixtureId: "c", kickoff: "2026-09-01T15:00:00Z" }),
    hist({ fixtureId: "d", status: "lost", kickoff: "2026-06-01T15:00:00Z" }),
  ];
  const r = recallFor(cand, h);
  assert.equal(r.wins, 2); assert.equal(r.settled, 4);
  assert.match(r.text, /Arsenal to win, 2 wins from 4 settled picks/);
  assert.match(r.text, /Latest loss: 1-2 vs Brighton, 2026-10-18/);
  assert.doesNotMatch(r.text, /fail|because|should|recommend|will /i);
});
t("recall ignores other teams, draws, pending and void picks", () => {
  const h = [hist({ fixtureId: "a" }), hist({ fixtureId: "b" }),
    hist({ fixtureId: "other", homeTeam: "Chelsea", awayTeam: "Spurs" }),
    hist({ fixtureId: "d", status: "pending" }), hist({ fixtureId: "e", status: "void" }), hist({ fixtureId: "f", selection: "draw" })];
  assert.equal(recallFor(cand, h), null, "only 2 comparable picks, so nothing is shown");
});
t("team-to-win matches regardless of venue (assumption: home and away wins are the same market)", () => {
  const h = [hist({ fixtureId: "a" }), hist({ fixtureId: "b" }), hist({ fixtureId: "c", homeTeam: "Chelsea", awayTeam: "Arsenal", selection: "away" })];
  assert.equal(recallFor(cand, h).settled, 3);
});
t("draw picks are never recalled (ambiguous market)", () => {
  assert.equal(recallFor({ ...cand, selection: "draw" }, [hist({ fixtureId: "a" }), hist({ fixtureId: "b" }), hist({ fixtureId: "c" })]), null);
});
t("dismissal hides the note but leaves the candidate untouched", () => {
  const h = [hist({ fixtureId: "a" }), hist({ fixtureId: "b" }), hist({ fixtureId: "c" })];
  const frozen = Object.freeze({ ...cand });
  assert.equal(recallFor(frozen, h, { dismissed: true }), null);
  assert.deepEqual(frozen, cand);
});
console.log(`${n} test groups passed`);
