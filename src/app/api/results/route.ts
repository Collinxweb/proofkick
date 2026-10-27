import { NextResponse } from "next/server";
import { settleEvent } from "../../../lib/track/settle";
import { supabaseAdmin } from "../../../lib/supabase/server";
import { writeSettlementSnapshot, isRealBlobId } from "../../../lib/memory/snapshot";
import { anchorReceipt, RECEIPT_KIND } from "../../../lib/chain/sui";

// Result entry: POST { eventId, home, away } with admin auth. Scores pending picks,
// recomputes cached stats, writes credibility memories (mock/skip if no keys).
export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { eventId?: string; home?: number; away?: number };
  if (!body.eventId || !Number.isInteger(body.home) || !Number.isInteger(body.away)) {
    return NextResponse.json({ error: "eventId, home, away required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  if (!db) {
    return NextResponse.json({ mode: "mock", persisted: false, note: "supabase not configured" });
  }

  const repo = {
    async pendingPicksForEvent(eventId: string) {
      const { data } = await db
        .from("picks")
        .select("id, strategy_id, market, selection, odds_at_log, strategies(name)")
        .eq("event_id", eventId)
        .eq("result", "pending");
      return (data ?? []).map((p: any) => ({
        id: p.id,
        strategyId: p.strategy_id,
        strategyName: p.strategies?.name ?? "",
        market: p.market,
        selection: p.selection,
        oddsAtLog: Number(p.odds_at_log),
      }));
    },
    async setPickResult(pickId: string, result: "won" | "lost" | "push", settledAt: string) {
      await db.from("picks").update({ result, settled_at: settledAt }).eq("id", pickId);
    },
    async settledPicksForStrategy(strategyId: string) {
      const { data } = await db
        .from("picks")
        .select("id, selection, market, odds_at_log, result, settled_at")
        .eq("strategy_id", strategyId)
        .neq("result", "pending");
      return (data ?? []).map((p: any) => ({
        id: p.id,
        selection: p.selection,
        market: p.market,
        oddsAtLog: Number(p.odds_at_log),
        result: p.result,
        settledAt: p.settled_at,
      }));
    },
    async setStrategyStats(strategyId: string, stats: unknown) {
      await db.from("strategies").update({ stats }).eq("id", strategyId);
    },
    async setEventFinal(eventId: string, score: { home: number; away: number }) {
      await db.from("events").update({ final_home: score.home, final_away: score.away, status: "final" }).eq("id", eventId);
    },
    async recordMemory(strategyId: string, payload: unknown, res: { mode: string; memwalId: string | null }) {
      if (res.mode === "skipped") return;
      await db.from("memory_records").insert({
        strategy_id: strategyId,
        payload,
        memwal_id: res.memwalId,
        mode: res.mode === "live" ? "live" : "mock",
      });
    },
  };

  const report = await settleEvent(repo as any, body.eventId, { home: body.home!, away: body.away! });

  // Per-pick settlement snapshot (memwal) and anchor. Only anchored when a real blob id exists.
  // Failures are recorded and never change the settlement result.
  const { data: settled } = await db
    .from("picks")
    .select("id, strategy_id, event_id, market, selection, odds_at_log, result, settled_at, closing_odds, clv_pct")
    .eq("event_id", body.eventId)
    .neq("result", "pending");
  for (const p of settled ?? []) {
    if ((p as any).settlement_blob_id) continue;
    const snap = await writeSettlementSnapshot({
      kind: "settlement",
      pickId: p.id,
      strategyId: p.strategy_id,
      eventId: p.event_id,
      result: p.result,
      finalHome: body.home!,
      finalAway: body.away!,
      closingOdds: p.closing_odds === null ? null : Number(p.closing_odds),
      clvPct: p.clv_pct === null ? null : Number(p.clv_pct),
      settledAt: p.settled_at,
    });
    const blobId = snap.status === "written" && isRealBlobId(snap.blobId) ? snap.blobId : null;
    await db.from("settlement_records").upsert(
      {
        pick_id: p.id,
        memwal_blob_id: blobId,
        memwal_status: snap.status === "written" ? "written" : snap.status === "skipped" ? "skipped" : "failed",
        payload_sha256: snap.status === "failed" ? snap.payloadSha256 || null : snap.status === "written" ? snap.payloadSha256 : null,
        error: snap.status === "failed" ? snap.error : snap.status === "skipped" ? snap.reason : null,
      },
      { onConflict: "pick_id" }
    );
    if (!blobId) continue;
    await db.from("picks").update({ settlement_blob_id: blobId }).eq("id", p.id);
    const anchor = await anchorReceipt({
      kind: RECEIPT_KIND.settlement,
      strategyId: p.strategy_id,
      blobId,
      refText: `settle:${p.id}`,
      tsMs: Date.now(),
    });
    if (anchor.status === "anchored") {
      await db.from("picks").update({ anchor_digest: anchor.digest, anchor_status: "anchored", anchor_error: null }).eq("id", p.id);
    } else if (anchor.status === "failed") {
      await db.from("picks").update({ anchor_status: "failed", anchor_error: anchor.error }).eq("id", p.id);
    }
  }
  return NextResponse.json(report);
}
