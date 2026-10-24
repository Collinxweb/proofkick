import { NextResponse } from "next/server";
import { settleEvent } from "../../../lib/track/settle";
import { supabaseAdmin } from "../../../lib/supabase/server";

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
  return NextResponse.json(report);
}
