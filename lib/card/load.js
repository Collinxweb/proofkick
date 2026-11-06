import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeRecord } from "@/lib/proof/record";

const dateLabel = (iso) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
const OUTCOME = { won: "WON", lost: "LOST", void: "VOID", pending: "PENDING" };
const PICK = { home: "home", draw: "draw", away: "away" };

export function demoSlip() {
  const s = (home, away, market, pick, odds) => ({ home, away, market, pick, odds, outcome: "PENDING" });
  return { demo: true, handle: "yourname", total: 87, winrate: 0.689, verified: true, dateLabel: dateLabel(new Date().toISOString()), status: "PENDING", kind: "multi",
    totalOdds: "8.96", selections: [s("Manchester United", "Brighton", "1X2", "Manchester United", "1.58"), s("Real Madrid", "Villarreal", "1X2", "Over 2.5", "1.72"), s("Bayern Munich", "Freiburg", "1X2", "Bayern Munich", "1.45")] };
}

async function ownerRecord(db, userId) {
  const { data: rows } = await db.from("picks").select("status, odds_taken, locked_at").eq("user_id", userId);
  return computeRecord((rows ?? []).map((r) => ({ result: r.status, odds_taken: r.odds_taken, graded_at: r.locked_at })));
}

// One call as a card. The card shows the result once the call is graded.
export async function loadPickSlip(id) {
  const db = supabaseAdmin();
  const { data: p } = await db.from("picks").select("id, user_id, selection, odds_taken, status, anchor_object_id, final_home, final_away, fixtures(home_team, away_team, kickoff_at)").eq("id", id).maybeSingle();
  if (!p?.fixtures || !p.user_id) return null;
  const { data: prof } = await db.from("profiles").select("handle, avatar_url").eq("id", p.user_id).maybeSingle();
  const rec = await ownerRecord(db, p.user_id);
  const f = p.fixtures;
  const odds = Number(p.odds_taken).toFixed(2);
  const outcome = OUTCOME[p.status] ?? "PENDING";
  return { kind: "single", pickId: p.id, handle: prof?.handle ?? "tipster", avatarUrl: prof?.avatar_url ?? null, total: rec.total ?? 0, winrate: rec.winrate ?? null,
    verified: Boolean(p.anchor_object_id), dateLabel: dateLabel(f.kickoff_at), status: outcome, score: p.final_home != null ? `${p.final_home}-${p.final_away}` : null, totalOdds: odds,
    selections: [{ home: f.home_team, away: f.away_team, market: "1X2", pick: p.selection === "home" ? f.home_team : p.selection === "away" ? f.away_team : "Draw", odds, outcome }] };
}

// A multi as a card: every leg, the combined odds, and the slip's result once settled.
export async function loadSlipCard(slipId) {
  const db = supabaseAdmin();
  const { data: slip } = await db.from("slips").select("id, kind, status").eq("id", slipId).maybeSingle();
  if (!slip || slip.kind !== "multi") return null;
  const { data: legs } = await db.from("slip_legs").select("position, picks(id, user_id, selection, odds_taken, status, fixtures(home_team, away_team, kickoff_at))").eq("slip_id", slip.id).order("position");
  const first = legs?.[0]?.picks;
  if (!first) return null;
  const { data: prof } = await db.from("profiles").select("handle, avatar_url").eq("id", first.user_id).maybeSingle();
  const rec = await ownerRecord(db, first.user_id);
  const combined = (legs ?? []).reduce((a, l) => a * Number(l.picks?.odds_taken ?? 1), 1);
  const slipStatus = OUTCOME[slip.status] ?? "PENDING";
  return { kind: "multi", slipId: slip.id, handle: prof?.handle ?? "tipster", avatarUrl: prof?.avatar_url ?? null, total: rec.total ?? 0, winrate: rec.winrate ?? null,
    verified: true, dateLabel: dateLabel(first.fixtures?.kickoff_at ?? new Date().toISOString()), status: slipStatus, totalOdds: combined.toFixed(2),
    selections: (legs ?? []).map((l) => ({ home: l.picks?.fixtures?.home_team, away: l.picks?.fixtures?.away_team, market: "1X2",
      pick: l.picks?.selection === "home" ? l.picks?.fixtures?.home_team : l.picks?.selection === "away" ? l.picks?.fixtures?.away_team : "Draw",
      odds: Number(l.picks?.odds_taken).toFixed(2), outcome: OUTCOME[l.picks?.status] ?? "PENDING" })) };
}

// Attaches each selection's club crest (the cached copy in storage). Reads the small table once and matches in code.
export async function attachCrests(slip) {
  const { data } = await supabaseAdmin().from("team_crests").select("name, badge");
  const map = Object.fromEntries((data ?? []).map((r) => [r.name, r.badge]));
  for (const s of slip.selections ?? []) {
    const side = s.pick === s.away ? s.away : s.home;
    s.crest = map[side] ?? null;
  }
  return slip;
}
