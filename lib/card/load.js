import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeRecord } from "@/lib/proof/record";

const dateLabel = (iso) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
const OUTCOME = { won: "WON", lost: "LOST", void: "VOID", pending: "PENDING" };

export function demoSlip() {
  const s = (home, away, market, pick, odds) => ({ home, away, market, pick, odds, outcome: "PENDING" });
  return { demo: true, handle: "yourname", total: 87, winrate: 0.689, verified: true, dateLabel: dateLabel(new Date().toISOString()), status: "PENDING", kind: "multi",
    totalOdds: "8.96", blob: null, receipt: null,
    selections: [s("Manchester United", "Brighton", "1X2", "Manchester United", "1.58"), s("Real Madrid", "Villarreal", "1X2", "Over 2.5", "1.72"), s("Bayern Munich", "Freiburg", "1X2", "Bayern Munich", "1.45")] };
}

// The Walrus blob and Sui receipt stored on a row. The column names are found by pattern, so this works with the schema as it is.
export function proofOf(row) {
  // The lock proof is what makes a call tamper-evident. The result proof is used only if the lock proof is missing.
  return {
    blob: row?.memory_blob_id ?? row?.result_blob_id ?? null,
    receipt: row?.anchor_digest ?? row?.result_anchor_digest ?? null,
  };
}

async function ownerRecord(db, userId) {
  const { data: rows } = await db.from("picks").select("status, odds_taken, locked_at").eq("user_id", userId);
  return computeRecord((rows ?? []).map((r) => ({ result: r.status, odds_taken: r.odds_taken, graded_at: r.locked_at })));
}

// One call as a card.
export async function loadPickSlip(id) {
  const db = supabaseAdmin();
  const { data: p } = await db.from("picks").select("*, fixtures(home_team, away_team, kickoff_at)").eq("id", id).maybeSingle();
  if (!p?.fixtures || !p.user_id) return null;
  const { data: prof } = await db.from("profiles").select("handle, avatar_url").eq("id", p.user_id).maybeSingle();
  const rec = await ownerRecord(db, p.user_id);
  const f = p.fixtures;
  const odds = Number(p.odds_taken).toFixed(2);
  const outcome = OUTCOME[p.status] ?? "PENDING";
  const proof = proofOf(p);
  return { kind: "single", pickId: p.id, handle: prof?.handle ?? "tipster", avatarUrl: prof?.avatar_url ?? null, total: rec.total ?? 0, winrate: rec.winrate ?? null,
    verified: Boolean(p.anchor_object_id), dateLabel: dateLabel(f.kickoff_at), status: outcome, score: p.final_home != null ? `${p.final_home}-${p.final_away}` : null, totalOdds: odds,
    blob: proof.blob, receipt: proof.receipt,
    selections: [{ home: f.home_team, away: f.away_team, market: "1X2", pick: p.selection === "home" ? f.home_team : p.selection === "away" ? f.away_team : "Draw", odds, outcome }] };
}

// A multi as a card. The proof shown is the first leg's snapshot and receipt.
export async function loadSlipCard(slipId) {
  const db = supabaseAdmin();
  const { data: slip } = await db.from("slips").select("id, kind, status").eq("id", slipId).maybeSingle();
  if (!slip || slip.kind !== "multi") return null;
  const { data: legs } = await db.from("slip_legs").select("position, picks(*, fixtures(home_team, away_team, kickoff_at))").eq("slip_id", slip.id).order("position");
  const first = legs?.[0]?.picks;
  if (!first) return null;
  const { data: prof } = await db.from("profiles").select("handle, avatar_url").eq("id", first.user_id).maybeSingle();
  const rec = await ownerRecord(db, first.user_id);
  const combined = (legs ?? []).reduce((a, l) => a * Number(l.picks?.odds_taken ?? 1), 1);
  const slipStatus = OUTCOME[slip.status] ?? "PENDING";
  const proof = proofOf(first);
  return { kind: "multi", slipId: slip.id, handle: prof?.handle ?? "tipster", avatarUrl: prof?.avatar_url ?? null, total: rec.total ?? 0, winrate: rec.winrate ?? null,
    verified: true, dateLabel: dateLabel(first.fixtures?.kickoff_at ?? new Date().toISOString()), status: slipStatus, totalOdds: combined.toFixed(2),
    blob: proof.blob, receipt: proof.receipt,
    selections: (legs ?? []).map((l) => ({ home: l.picks?.fixtures?.home_team, away: l.picks?.fixtures?.away_team, market: "1X2",
      pick: l.picks?.selection === "home" ? l.picks?.fixtures?.home_team : l.picks?.selection === "away" ? l.picks?.fixtures?.away_team : "Draw",
      odds: Number(l.picks?.odds_taken).toFixed(2), outcome: OUTCOME[l.picks?.status] ?? "PENDING" })) };
}

// Attaches each selection's club crest (the cached copy in storage).
export async function attachCrests(slip) {
  const { data } = await supabaseAdmin().from("team_crests").select("name, badge");
  const map = Object.fromEntries((data ?? []).map((r) => [r.name, r.badge]));
  for (const s of slip.selections ?? []) {
    const side = s.pick === s.away ? s.away : s.home;
    s.crest = map[side] ?? null;
  }
  return slip;
}
