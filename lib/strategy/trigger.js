// Strategy triggers: each published strategy is checked against upcoming matches. When its rules pass, a pick is
// created for the owner, attributed to the strategy, and locked by the database before kick-off. Nothing is triggered
// without fresh team stats, because the team-form signals need them.
import { randomUUID } from "node:crypto";
import { evaluate } from "../confluence";
import { proveProof } from "../proof/prove";

const LEAD_MS = 15 * 60e3;   // never trigger inside 15 minutes of kick-off
const WINDOW_H = 48;          // consider matches kicking off in the next 48 hours

export async function runTriggers(db, now = Date.now(), { maxProofs = 5 } = {}) {
  const report = { strategies: 0, triggered: 0, alreadyPicked: 0, failed: 0, proofs: 0, notes: [] };
  const { data: strategies } = await db.from("strategies").select("id, owner_id, name");
  if (!strategies?.length) return report;
  report.strategies = strategies.length;
  const { data: versions } = await db.from("strategy_versions").select("id, strategy_id, version, rules").in("strategy_id", strategies.map((s) => s.id));
  const latest = {};
  for (const v of versions ?? []) if (!latest[v.strategy_id] || v.version > latest[v.strategy_id].version) latest[v.strategy_id] = v;
  const { data: fixtures } = await db.from("fixtures").select("id, league, home_team, away_team, kickoff_at, odds, context")
    .gt("kickoff_at", new Date(now + LEAD_MS).toISOString()).lt("kickoff_at", new Date(now + WINDOW_H * 3600e3).toISOString())
    .not("odds", "is", null).limit(400);
  const created = [];
  for (const s of strategies) {
    const v = latest[s.id];
    const sel = v?.rules?.selection;
    if (!v || !sel) continue;
    for (const fx of fixtures ?? []) {
      const r = evaluate(v.rules, fx, sel);
      if (!r.pass) continue;
      const odds = Number(fx.odds?.[sel]);
      if (!(odds > 1)) continue;
      const { data: rows, error } = await db.from("picks").upsert({
        user_id: s.owner_id, source: "rule", strategy_version_id: v.id, fixture_id: fx.id, market: "h2h", selection: sel,
        odds_taken: odds, reasoning: { strategy: s.name, triggered: true, score: r.score, total: r.total }, nonce: randomUUID(),
      }, { onConflict: "strategy_version_id,fixture_id,market", ignoreDuplicates: true }).select("id");
      if (error) { report.failed++; report.notes.push(error.message.slice(0, 120)); continue; }
      if (!rows?.length) { report.alreadyPicked++; continue; }
      const pick = rows[0];
      report.triggered++;
      created.push(pick.id);
    }
  }
  for (const id of created.slice(0, maxProofs)) { await proveProof(db, id); report.proofs++; }
  return report;
}
