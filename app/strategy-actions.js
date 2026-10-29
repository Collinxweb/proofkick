"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashRecord, hex } from "@/lib/proof/hash";
import { buildRules } from "@/lib/confluence";

export async function createStrategy(input) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return { error: "Not signed in" };
  const name = String(input.name ?? "").trim();
  if (name.length < 3 || name.length > 50) return { error: "Name must be 3 to 50 characters." };
  const built = buildRules(input); // validated again on the server; the browser copy is only a preview
  if (built.error) return { error: built.error };
  const db = supabaseAdmin();
  const { data: s, error: e1 } = await db.from("strategies").insert({ owner_id: user.id, name }).select("id").single();
  if (e1) return { error: e1.message };
  const { error: e2 } = await db.from("strategy_versions").insert({ strategy_id: s.id, version: 1, rules: built.rules, rules_hash: hex(hashRecord(built.rules)) });
  if (e2) return { error: e2.message };
  return { ok: true, id: s.id };
}
