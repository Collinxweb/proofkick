import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LEAGUE_TO_FD, matchFixture, settle } from "@/lib/proof/grade";
import { hex } from "@/lib/proof/hash";
import { RESULT_TAG, toText, hashOf } from "@/lib/proof/snapshot";
import { memwalConfigured, saveBlob } from "@/lib/proof/memory";
import { mintReceipt } from "@/lib/sui/anchor";
import { proveProof } from "@/lib/proof/prove";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const day = (ms) => new Date(ms).toISOString().slice(0, 10);

// Grades finished matches from football-data.org (free tier), then writes each result to Walrus as a second blob and anchors it.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const u = new URL(req.url);
  if (!secret || (u.searchParams.get("secret") !== secret && req.headers.get("authorization") !== `Bearer ${secret}`)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const token = process.env.FOOTBALL_DATA_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: "FOOTBALL_DATA_TOKEN is not set in this deployment" }, { status: 500 });

  const db = supabaseAdmin();
  const now = Date.now();
  const { data: pending, error } = await db.from("picks")
    .select("id, user_id, selection, odds_taken, memory_blob_id, commitment_hash, fixtures!inner(league, home_team, away_team, kickoff_at)")
    .eq("status", "pending").lt("fixtures.kickoff_at", new Date(now - 2.5 * 3600e3).toISOString()).limit(80);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const report = { checked: pending?.length ?? 0, graded: 0, voided: 0, unmatched: 0, blobs: 0, notes: [] };
  const cache = {};
  for (const p of pending ?? []) {
    const fx = p.fixtures, code = LEAGUE_TO_FD[fx.league];
    if (!code) { report.unmatched++; continue; }
    if (!cache[code]) {
      const r = await fetch(`https://api.football-data.org/v4/competitions/${code}/matches?dateFrom=${day(now - 9 * 864e5)}&dateTo=${day(now + 864e5)}`, { headers: { "X-Auth-Token": token }, cache: "no-store" });
      if (!r.ok) { report.notes.push(`${code}: HTTP ${r.status}`); cache[code] = []; } else cache[code] = (await r.json()).matches ?? [];
    }
    const m = matchFixture(fx, cache[code]);
    let out = m ? settle(p.selection, m) : null;
    if (!out && now - new Date(fx.kickoff_at).getTime() > 10 * 864e5) out = { result: "void" }; // no source result after 10 days: void, never a loss
    if (!out) { report.unmatched++; continue; }
    const upd = { status: out.result, graded_at: new Date().toISOString(), settled_at: new Date().toISOString(), grader: "football-data.org" };
    if (out.result !== "void") Object.assign(upd, { final_home: out.home, final_away: out.away });
    const { error: ue } = await db.from("picks").update(upd).eq("id", p.id).eq("status", "pending");
    if (ue) { report.notes.push(ue.message); continue; }
    out.result === "void" ? report.voided++ : report.graded++;
    p.__m = m?.id ?? null; p.__out = out;
  }

  // Result blobs are slow, so a few per run; any left over are picked up by the next run.
  if (memwalConfigured()) {
    const { data: todo } = await db.from("picks").select("id, user_id, status, final_home, final_away, graded_at, memory_blob_id, commitment_hash, grader")
      .is("result_blob_id", null).not("memory_blob_id", "is", null).neq("status", "pending").limit(4);
    for (const p of todo ?? []) {
      try {
        const body = { v: 1, kind: "result", pick_id: p.id, snapshot_blob_id: p.memory_blob_id, snapshot_hash: p.commitment_hash, result: p.status,
          final: p.status === "void" ? null : { home: p.final_home, away: p.final_away }, source: p.grader ?? "football-data.org", graded_at: p.graded_at };
        const hash = hashOf(body);
        const { blobId } = await saveBlob(p.user_id, toText(RESULT_TAG, body));
        let digest = null;
        try { digest = (await mintReceipt({ kind: 2, strategyId: p.id, recordHash: hash, ref: blobId, tsMs: Date.now() })).digest; } catch (e) { report.notes.push(`anchor: ${String(e.message).slice(0, 80)}`); }
        await db.from("picks").update({ result_blob_id: blobId, result_anchor_digest: digest }).eq("id", p.id);
        report.blobs++;
      } catch (e) { report.notes.push(`blob: ${String(e.message ?? e).slice(0, 80)}`); }
    }
  }
  // Picks locked in the database whose Walrus snapshot or Sui receipt never finished: retry two per run.
  if (memwalConfigured()) {
    const { data: lag } = await db.from("picks").select("id").not("user_id", "is", null).or("memory_blob_id.is.null,anchor_object_id.is.null").limit(2);
    report.proofRetries = [];
    for (const p of lag ?? []) report.proofRetries.push(await proveProof(db, p.id));
  }
  try {
    const { settlePendingSlips } = await import("@/lib/history/store");
    report.slips = await settlePendingSlips(db);
  } catch (e) {
    report.slipsError = String(e.message ?? e).slice(0, 160);
  }
  return NextResponse.json(report);
}
