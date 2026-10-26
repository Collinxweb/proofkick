"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashRecord, hex } from "@/lib/proof/hash";
import { LEAGUES, SELECTIONS } from "@/lib/leagues";

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
