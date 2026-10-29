import { supabaseAdmin } from "@/lib/supabase/admin";

const dateLabel = (iso) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

export function demoSlip() {
  const s = (home, away, market, pick, odds) => ({ home, away, market, pick, odds });
  return { demo: true, handle: "yourname", total: 87, winrate: 0.689, verified: true, dateLabel: dateLabel(new Date().toISOString()), stake: "100.00", currency: "USDT", potential: "896.00", totalOdds: "8.96",
    selections: [s("Manchester United", "Brighton", "1X2", "Manchester United", "1.58"), s("Real Madrid", "Villarreal", "Over/Under 2.5", "Over 2.5", "1.72"), s("Bayern Munich", "Freiburg", "1X2", "Bayern Munich", "1.45"),
      s("Liverpool", "West Ham", "Both Teams to Score", "Yes", "1.68"), s("Inter Milan", "Lazio", "1X2", "Inter Milan", "1.60")] };
}

// One locked pick as a single-selection slip. Numbers come from the same picks the statement page lists.
export async function loadPickSlip(id) {
  const db = supabaseAdmin();
  const { data: p } = await db.from("picks").select("id, user_id, selection, odds_taken, anchor_object_id, fixtures(home_team, away_team, kickoff_at)").eq("id", id).maybeSingle();
  if (!p?.fixtures || !p.user_id) return null;
  const [{ data: prof }, { data: rec }] = await Promise.all([
    db.from("profiles").select("handle, avatar_url").eq("id", p.user_id).maybeSingle(),
    db.from("picks").select("status").eq("user_id", p.user_id),
  ]);
  const graded = rec.filter((r) => r.status === "won" || r.status === "lost");
  const f = p.fixtures, odds = Number(p.odds_taken).toFixed(2);
  return { handle: prof?.handle ?? "tipster", avatarUrl: prof?.avatar_url ?? null, total: rec.length, winrate: graded.length ? graded.filter((r) => r.status === "won").length / graded.length : null,
    verified: Boolean(p.anchor_object_id), dateLabel: dateLabel(f.kickoff_at), totalOdds: odds, stake: null, pickId: p.id,
    selections: [{ home: f.home_team, away: f.away_team, market: "1X2", pick: p.selection === "home" ? f.home_team : p.selection === "away" ? f.away_team : "Draw", odds }] };
}
