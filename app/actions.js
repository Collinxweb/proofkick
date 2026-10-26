"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashRecord, hex } from "@/lib/proof/hash";
import { LEAGUES, SELECTIONS } from "@/lib/leagues";
import { buildBooking, OPERATORS } from "@/lib/booking";

async function currentUser() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

export async function saveProfile({ fullName, dob, country, avatar }) {
  const user = await currentUser();
  const name = String(fullName ?? "").trim();
  if (name.length < 2 || name.length > 60) return { error: "Enter your full name." };
  const d = new Date(dob);
  if (isNaN(d)) return { error: "Enter a valid date of birth." };
  const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 18);
  if (d > cutoff) return { error: "You must be 18 or older to use ProofKick." };
  if (!/^[A-Z]{2}$/.test(country ?? "")) return { error: "Choose your country." };
  const own = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/avatar.jpg`;
  if (!/^preset:[0-5]$/.test(avatar ?? "") && !String(avatar).startsWith(own)) return { error: "Choose or upload an avatar." };
  const { error } = await supabaseAdmin().from("profiles").update({
    full_name: name, date_of_birth: dob, country, avatar_url: avatar, profile_completed_at: new Date().toISOString(),
  }).eq("id", user.id);
  return error ? { error: error.message } : { ok: true };
}

export async function createStrategy(input) {
  const user = await currentUser();
  const name = String(input.name ?? "").trim();
  if (name.length < 3 || name.length > 50) return { error: "Name must be 3 to 50 characters." };
  if (!SELECTIONS[input.selection]) return { error: "Pick an outcome." };
  const conditions = [];
  if (input.minOdds !== "" || input.maxOdds !== "") {
    const min = Number(input.minOdds), max = Number(input.maxOdds);
    if (!(min >= 1.01 && max > min && max <= 50)) return { error: "Odds range must sit between 1.01 and 50, with max above min." };
    conditions.push({ field: "odds", op: "between", value: [min, max] });
  }
  const leagues = (input.leagues ?? []).filter((l) => LEAGUES.some(([k]) => k === l));
  if (leagues.length) conditions.push({ field: "league", op: "in", value: leagues });
  const days = (input.days ?? []).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6);
  if (days.length) conditions.push({ field: "weekday", op: "in", value: days });
  if (!conditions.length) return { error: "Add at least one condition so the strategy is selective." };
  const rules = { market: "h2h", selection: input.selection, conditions, description: String(input.description ?? "").trim().slice(0, 200) };
  const db = supabaseAdmin();
  const { data: s, error: e1 } = await db.from("strategies").insert({ owner_id: user.id, name }).select("id").single();
  if (e1) return { error: e1.message };
  const { error: e2 } = await db.from("strategy_versions").insert({ strategy_id: s.id, version: 1, rules, rules_hash: hex(hashRecord(rules)) });
  if (e2) return { error: e2.message };
  return { ok: true, id: s.id };
}

// Book a manual slip: user picked 1/X/2 on one or more upcoming fixtures. Odds and kickoff are
// re-read from the DB here, never trusted from the client. Mock booking code, no money moves.
export async function bookPicks({ operator, picks }) {
  let user;
  try { user = await currentUser(); } catch { return { error: "Sign in to book." }; }
  if (!OPERATORS[operator]) return { error: "Choose SportyBet or Bet9ja." };
  if (!Array.isArray(picks) || !picks.length) return { error: "Pick at least one match." };
  if (picks.length > 20) return { error: "Max 20 picks per slip." };
  const ids = [...new Set(picks.map((p) => p.fixtureId))];
  if (ids.length !== picks.length) return { error: "One pick per match." };
  if (picks.some((p) => !["home", "draw", "away"].includes(p.selection))) return { error: "Pick an outcome." };

  const db = supabaseAdmin();
  const { data: fx, error: fe } = await db.from("fixtures").select("id, home_team, away_team, kickoff_at, odds").in("id", ids);
  if (fe) return { error: fe.message };
  const byId = Object.fromEntries((fx ?? []).map((f) => [f.id, f]));
  const rows = [];
  for (const p of picks) {
    const f = byId[p.fixtureId];
    if (!f) return { error: "One of those matches is no longer listed. Refresh and try again." };
    const price = Number(f.odds?.[p.selection]);
    if (!(price > 1)) return { error: `No ${p.selection} price for ${f.home_team} v ${f.away_team}.` };
    rows.push({ fixture_id: f.id, selection: p.selection, odds: price, home_team: f.home_team, away_team: f.away_team, kickoff_at: f.kickoff_at });
  }

  let booking;
  try {
    booking = buildBooking({ userId: user.id, operator, picks: rows.map((r) => ({ ...r, fixture_id: r.fixture_id, odds: r.odds })) });
  } catch (e) {
    return { error: e.message };
  }

  const { data: b, error: be } = await db.from("bookings").insert({
    user_id: user.id, operator, code: booking.code, combined_odds: booking.combinedOdds, mocked: true,
  }).select("id, created_at").single();
  if (be) return { error: be.message };
  const { error: pe } = await db.from("booking_picks").insert(
    rows.map((r) => ({ booking_id: b.id, fixture_id: r.fixture_id, selection: r.selection, odds: r.odds }))
  );
  if (pe) return { error: pe.message };

  return {
    ok: true,
    booking: {
      id: b.id,
      operator,
      operatorLabel: booking.operatorLabel,
      code: booking.code,
      deepLink: booking.deepLink,
      mocked: true,
      combinedOdds: booking.combinedOdds,
      createdAt: b.created_at,
      picks: rows.map((r) => ({ homeTeam: r.home_team, awayTeam: r.away_team, selection: r.selection, odds: r.odds, kickoffAt: r.kickoff_at })),
    },
  };
}
