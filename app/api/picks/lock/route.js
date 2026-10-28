import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bad = (error, status) => NextResponse.json({ error }, { status });

// POST { fixtureId, selection: "home"|"draw"|"away", note?, strategyVersionId? }
// Locks the pick in the database (server clock, before kick-off) and returns at once.
// The Walrus snapshot and Sui receipt are a separate, retryable step: POST /api/picks/prove { pickId }.
export async function POST(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return bad("Sign in to lock a pick.", 401);
  const b = await req.json().catch(() => ({}));
  if (!b.fixtureId || !["home", "draw", "away"].includes(b.selection)) return bad("Choose a match and an outcome.", 400);
  const note = String(b.note ?? "").trim().slice(0, 300);

  const db = supabaseAdmin();
  const { data: fx } = await db.from("fixtures").select("id, kickoff_at, odds").eq("id", b.fixtureId).maybeSingle();
  if (!fx) return bad("Match not found.", 404);
  if (new Date(fx.kickoff_at) <= new Date()) return bad("Kick-off has passed. Picks lock before the match starts.", 409);
  const odds = Number(fx.odds?.[b.selection]);
  if (!(odds > 1)) return bad("No odds for that outcome yet.", 422);

  let versionId = null;
  if (b.strategyVersionId) {
    const { data: v } = await db.from("strategy_versions").select("id, strategies!inner(owner_id)").eq("id", b.strategyVersionId).maybeSingle();
    if (!v || v.strategies.owner_id !== user.id) return bad("That strategy is not yours.", 403);
    versionId = v.id;
  }

  const id = randomUUID();
  const { data: pick, error } = await db.from("picks").insert({
    id, user_id: user.id, source: versionId ? "rule" : "manual", strategy_version_id: versionId, fixture_id: fx.id,
    market: "h2h", selection: b.selection, odds_taken: odds, reasoning: note ? { note } : {}, nonce: randomUUID(),
  }).select("id, locked_at").single();
  if (error) return bad(/duplicate|unique/i.test(error.message) ? "You already locked this pick." : error.message, 409);
  return NextResponse.json({ ok: true, pickId: pick.id, odds, lockedAt: pick.locked_at });
}
