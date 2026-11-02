// Server-side slip store. Uses the service role; every write is checked here and again by the database triggers.
import { settleSlip, applyCorrections, metrics } from "./slips";

const MAX_LEGS = 10;

// Creates a recorded (no stake) or staked slip from locked picks the user owns.
export async function createSlip(db, userId, { stake, pickIds }) {
  const ids = [...new Set(pickIds ?? [])];
  if (ids.length < 1 || ids.length > MAX_LEGS) return { error: `A slip has 1 to ${MAX_LEGS} picks.` };
  let st = null;
  if (stake != null && stake !== "") {
    st = Number(stake);
    if (!(st > 0) || st > 1_000_000 || Math.round(st * 100) !== st * 100) return { error: "Stake must be a positive amount with up to 2 decimals." };
  }
  const { data: picks } = await db.from("picks").select("id, user_id, fixture_id, odds_taken, status").in("id", ids);
  if (!picks || picks.length !== ids.length || picks.some((p) => p.user_id !== userId)) return { error: "Every pick must be yours." };
  if (new Set(picks.map((p) => p.fixture_id)).size !== picks.length) return { error: "A multi cannot contain two picks on the same match (they are not independent)." };
  const { data: taken } = await db.from("slip_legs").select("pick_id").in("pick_id", ids);
  if (taken?.length) return { error: "One of these picks is already in a slip." };

  const kind = ids.length === 1 ? "single" : "multi";
  const { data: slip, error } = await db.from("slips").insert({ user_id: userId, kind, stake: st }).select("id").single();
  if (error) return { error: error.message };
  const legs = ids.map((pick_id, i) => ({ slip_id: slip.id, pick_id, position: i + 1 }));
  const { error: e2 } = await db.from("slip_legs").insert(legs);
  if (e2) { await db.from("slips").delete().eq("id", slip.id); return { error: e2.message }; }
  return { ok: true, id: slip.id, kind };
}

// Settles every pending slip whose legs are final. A pending leg keeps the slip pending unless another leg lost.
export async function settlePendingSlips(db, nowIso = new Date().toISOString(), limit = 200) {
  const { data: slips } = await db.from("slips").select("id, stake").eq("status", "pending").limit(limit);
  const report = [];
  for (const s of slips ?? []) {
    const { data: legs } = await db.from("slip_legs").select("id, pick_id, position, picks(status, odds_taken)").eq("slip_id", s.id);
    const view = (legs ?? []).map((l) => ({ id: l.id, pickId: l.pick_id, result: l.picks?.status ?? "pending", odds: Number(l.picks?.odds_taken) }));
    const settlement = settleSlip({ stake: s.stake, legs: view });
    for (const l of view) {
      await db.from("slip_legs").update({ result: l.result, applied_odds: settlement.appliedLegs?.find((x) => x.pickId === l.pickId)?.applied ?? null })
        .eq("id", l.id);
    }
    if (settlement.status === "won" || settlement.status === "lost" || settlement.status === "void") {
      await db.from("slips").update({ status: settlement.status, gross_payout: settlement.grossPayout, net_units: settlement.netUnits, settled_at: nowIso }).eq("id", s.id);
      report.push({ slip: s.id, status: settlement.status });
    }
  }
  return report;
}

// Records a correction for one settled leg. The original leg result and slip result are kept; only a new correction row is added.
export async function correctLeg(db, legId, newResult, reason, by) {
  if (!["won", "lost", "void"].includes(newResult)) return { error: "New result must be won, lost or void." };
  if (!reason || reason.trim().length < 3) return { error: "A reason is required." };
  const { data: leg } = await db.from("slip_legs").select("id, slip_id, result").eq("id", legId).maybeSingle();
  if (!leg) return { error: "Leg not found." };
  if (leg.result === "pending") return { error: "Leg is not settled yet." };
  await db.from("grade_corrections").insert({ slip_leg_id: legId, previous_result: leg.result, new_result: newResult, reason: reason.trim(), created_by: by });
  const { data: slip } = await db.from("slips").select("id, stake, status, gross_payout, original_status").eq("id", leg.slip_id).single();
  const eff = await effectiveLegs(db, slip.id);
  const settlement = settleSlip({ stake: slip.stake, legs: eff });
  const patch = { status: settlement.status === "unavailable" ? slip.status : settlement.status, gross_payout: settlement.grossPayout, net_units: settlement.netUnits };
  if (!slip.original_status) Object.assign(patch, { original_status: slip.status, original_gross_payout: slip.gross_payout });
  await db.from("slips").update(patch).eq("id", slip.id);
  return { ok: true, slip: slip.id, status: patch.status };
}

// Each leg's effective result: the newest correction if one exists, otherwise its settled grade.
async function effectiveLegs(db, slipId) {
  const { data: legs } = await db.from("slip_legs").select("id, pick_id, result, picks(odds_taken)").eq("slip_id", slipId);
  const ids = (legs ?? []).map((l) => l.id);
  const { data: fixes } = ids.length ? await db.from("grade_corrections").select("slip_leg_id, new_result, created_at").in("slip_leg_id", ids).order("created_at", { ascending: false }) : { data: [] };
  const latest = {};
  for (const f of fixes ?? []) if (!latest[f.slip_leg_id]) latest[f.slip_leg_id] = f.new_result;
  return (legs ?? []).map((l) => ({ id: l.id, pickId: l.pick_id, result: latest[l.id] ?? l.result, odds: Number(l.picks?.odds_taken) }));
}

// Everything the statement page and the recall note need, for one user.
// Picks with no slip are recorded singles, so existing history is included without any migration.
export async function userHistory(db, userId) {
  const [{ data: picks }, { data: slips }] = await Promise.all([
    db.from("picks").select("id, fixture_id, selection, odds_taken, status, locked_at, fixtures(home_team, away_team, kickoff_at)").eq("user_id", userId),
    db.from("slips").select("id, kind, stake, status, gross_payout").eq("user_id", userId),
  ]);
  const { data: legRows } = (slips ?? []).length ? await db.from("slip_legs").select("slip_id, pick_id").in("slip_id", slips.map((s) => s.id)) : { data: [] };
  const inSlip = new Set((legRows ?? []).map((l) => l.pick_id));
  const slipOf = {};
  for (const l of legRows ?? []) (slipOf[l.slip_id] ??= []).push(l.pick_id);
  const pickById = Object.fromEntries((picks ?? []).map((p) => [p.id, p]));

  const slipViews = [];
  for (const s of slips ?? []) {
    const legs = await effectiveLegs(db, s.id);
    const settlement = settleSlip({ stake: s.stake, legs });
    slipViews.push({ kind: s.kind, stake: s.stake, status: s.status, grossPayout: settlement.grossPayout ?? s.gross_payout, legs: legs.map((l) => ({ result: l.result, odds: l.odds })) });
  }
  for (const p of picks ?? []) {
    if (inSlip.has(p.id)) continue;
    slipViews.push({ kind: "single", stake: null, status: p.status, grossPayout: null, legs: [{ result: p.status, odds: Number(p.odds_taken) }] });
  }
  const recallPicks = (picks ?? []).map((p) => ({
    fixtureId: p.fixture_id, homeTeam: p.fixtures?.home_team, awayTeam: p.fixtures?.away_team, selection: p.selection,
    status: p.status, locked: Boolean(p.locked_at), kickoff: p.fixtures?.kickoff_at,
  }));
  return { metrics: metrics(slipViews), recallPicks, pickById };
}
