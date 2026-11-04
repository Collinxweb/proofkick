"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveProfile } from "@/app/actions";

const RESERVED = new Set(["admin", "api", "app", "auth", "bets", "browse", "create", "dashboard", "login", "profile", "proofkick", "settings", "support", "terms", "privacy", "lock-test", "null", "undefined", "root", "s", "p", "b", "u"]);

export async function saveSettings({ handle, bio }) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return { error: "Not signed in." };
  const h = String(handle ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(h)) return { error: "Username: 3 to 20 characters, using letters, numbers and underscores." };
  if (RESERVED.has(h)) return { error: "That username is reserved." };
  const db = supabaseAdmin();
  const { data: taken } = await db.from("profiles").select("id").eq("handle", h).neq("id", user.id).maybeSingle();
  if (taken) return { error: "That username is taken." };
  const { error } = await db.from("profiles").update({ handle: h, bio: String(bio ?? "").trim().slice(0, 160) || null }).eq("id", user.id);
  if (error) return { error: /unique|duplicate/i.test(error.message) ? "That username is taken." : error.message };
  return { ok: true, handle: h };
}

// Everything about the account in one save: username and bio first (so a taken name stops the save), then the profile fields.
export async function saveAccount(input) {
  const s = await saveSettings({ handle: input.handle, bio: input.bio });
  if (s?.error) return s;
  const p = await saveProfile({ fullName: input.fullName, dob: input.dob, country: input.country, avatar: input.avatar });
  if (p?.error) return p;
  return { ok: true, handle: s.handle };
}
