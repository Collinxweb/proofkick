// Multi-pick (slip) settlement and metrics. Pure functions: no database, no network.
// Odds are the decimal odds captured in each leg's immutable pick snapshot. Stake is stored on the slip.
// A single is a slip with one leg. Singles and multis are reported separately.

const r2 = (n) => Math.round(n * 100) / 100;

// Settles one slip from its legs. `legs` = [{ result: 'won'|'lost'|'void'|'pending', odds }].
// Rules:
//  - any lost leg loses the slip (even if other legs are still pending)
//  - any pending leg (with no loss) keeps the slip pending
//  - void legs count as odds 1.00
//  - all legs void -> void, stake returned
//  - otherwise won, paying stake x product of the non-void legs' odds
export function settleSlip({ stake, legs }) {
  if (!legs?.length) return { status: "unavailable", reason: "no legs" };
  const results = legs.map((l) => l.result);
  if (results.includes("lost")) return finish("lost", 0, legs, stake);
  if (results.includes("pending")) return { status: "pending", grossPayout: null, netUnits: null, appliedLegs: legs.map((l) => ({ ...l, applied: null })) };
  const live = legs.filter((l) => l.result === "won");
  if (live.length === 0) return finish("void", stakeOrNull(stake), legs, stake);
  const product = live.reduce((p, l) => p * Number(l.odds), 1);
  if (!(Number.isFinite(product) && product >= 1)) return { status: "unavailable", reason: "odds missing on a winning leg" };
  return finish("won", stakeOrNull(stake) == null ? null : r2(Number(stake) * product), legs, stake);
}

const stakeOrNull = (s) => (s == null || !(Number(s) > 0) ? null : Number(s));

function finish(status, gross, legs, stake) {
  const applied = legs.map((l) => ({
    ...l,
    applied: l.result === "void" ? 1 : l.result === "won" ? Number(l.odds) : null,
  }));
  const s = stakeOrNull(stake);
  return {
    status,
    grossPayout: s == null ? null : gross,
    netUnits: s == null || gross == null ? null : r2(gross - s),
    appliedLegs: applied,
  };
}

// Corrections: an append-only record. The original slip and its legs are never mutated.
// Returns a new "effective" view with the correction applied and the full history kept.
export function applyCorrections(original, corrections = []) {
  const history = [{ kind: "original", at: original.settledAt ?? null, settlement: original.settlement }];
  let legs = original.legs.map((l) => ({ ...l }));
  for (const c of [...corrections].sort((a, b) => a.at.localeCompare(b.at))) {
    legs = legs.map((l) => (l.pickId === c.pickId ? { ...l, result: c.result } : l));
    const settlement = settleSlip({ stake: original.stake, legs });
    history.push({ kind: "correction", at: c.at, pickId: c.pickId, from: c.from, to: c.result, reason: c.reason, settlement });
  }
  const settlement = settleSlip({ stake: original.stake, legs });
  return { ...original, legs, settlement, corrected: corrections.length > 0, history };
}

// Metrics over a list of slips. Each slip: { kind:'single'|'multi', stake, status, legs:[{result}] }.
// Each rate reports its numerator, denominator and whether it can be computed at all.
export function metrics(slips) {
  const out = {};
  for (const kind of ["single", "multi"]) {
    const set = slips.filter((s) => s.kind === kind);
    const settledSlips = set.filter((s) => s.status === "won" || s.status === "lost");
    const voidSlips = set.filter((s) => s.status === "void");
    const pending = set.filter((s) => s.status === "pending");
    const wonSlips = settledSlips.filter((s) => s.status === "won").length;
    const legs = set.flatMap((s) => (s.legs ?? []).filter((l) => l.result === "won" || l.result === "lost"));
    const wonLegs = legs.filter((l) => l.result === "won").length;
    // Recorded and staked calls both count for win rate and leg hit rate. Only staked, settled calls count for money.
    const settledAll = set.filter((s) => s.status === "won" || s.status === "lost" || s.status === "void");
    const staked = settledAll.filter((s) => Number(s.stake) > 0 && s.grossPayout != null);
    const stake = staked.reduce((a, s) => a + Number(s.stake), 0);
    const gross = staked.reduce((a, s) => a + Number(s.grossPayout), 0);
    out[kind] = {
      slipWinRate: settledSlips.length ? { wins: wonSlips, of: settledSlips.length, pct: round1(wonSlips / settledSlips.length) } : { unavailable: true, reason: "no settled slips" },
      legHitRate: legs.length ? { wins: wonLegs, of: legs.length, pct: round1(wonLegs / legs.length) } : { unavailable: true, reason: "no settled, non-void legs" },
      stake: staked.length ? r2(stake) : { unavailable: true, reason: "no staked calls yet" },
      grossPayout: staked.length ? r2(gross) : { unavailable: true, reason: "no staked calls yet" },
      netUnits: staked.length ? r2(gross - stake) : { unavailable: true, reason: "no staked calls yet" },
      roi: staked.length && stake > 0 ? { pct: round1((gross - stake) / stake), of: r2(stake), stakedCalls: staked.length } : { unavailable: true, reason: "no staked calls yet" },
      counts: { settled: settledSlips.length, void: voidSlips.length, pending: pending.length, recorded: settledAll.filter((s) => !(Number(s.stake) > 0)).length, staked: staked.length },
    };
  }
  return out;
}

const round1 = (x) => Math.round(x * 1000) / 10;
