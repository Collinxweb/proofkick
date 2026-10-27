// Daily grading cron: pulls FT fixtures from api-football and grades open picks.
// Writes results to picks.result (won/lost/push) and a settlement snapshot, then anchors
// the settlement receipt on Sui. Voids never count as losses.
import { NextResponse } from "next/server";
import { fetchFinishedFixtures, gradePick } from "../../../../lib/results/apifootball";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { anchorReceipt, RECEIPT_KIND } from "../../../../lib/chain/sui";
import { writeSettlementSnapshot, isRealBlobId } from "../../../../lib/memory/snapshot";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const league = Number(process.env.API_FOOTBALL_LEAGUE ?? 39);
  const season = Number(process.env.API_FOOTBALL_SEASON ?? 2024);
  const today = new Date();
  const from = new Date(today.getTime() - 3 * 86400_000).toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);

  const fx = await fetchFinishedFixtures({ league, season, from, to });
  if (fx.status !== "ok") {
    return NextResponse.json({ graded: 0, notice: fx.status === "error" ? undefined : fx.notice, error: fx.status === "error" ? fx.error : undefined, fixtureStatus: fx.status });
  }

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ graded: 0, persisted: false, fixtures: fx.fixtures.length });

  let graded = 0;
  let anchored = 0;
  const errors: string[] = [];
  for (const f of fx.fixtures) {
    const { data: ev } = await db
      .from("events")
      .select("id, home_team, away_team")
      .eq("home_team", f.homeTeam)
      .eq("away_team", f.awayTeam)
      .maybeSingle();
    if (!ev) continue;
    await db.from("events").update({ final_home: f.homeGoals, final_away: f.awayGoals, status: "final" }).eq("id", ev.id);

    const { data: picks } = await db
      .from("picks")
      .select("id, strategy_id, market, selection, odds_at_log")
      .eq("event_id", ev.id)
      .eq("result", "pending");
    for (const p of picks ?? []) {
      const outcome = gradePick(p.market, p.selection, f.homeGoals, f.awayGoals);
      const result = outcome === "won" ? "won" : outcome === "lost" ? "lost" : "push";
      const { error } = await db
        .from("picks")
        .update({ result, settled_at: new Date().toISOString() })
        .eq("id", p.id);
      if (error) { errors.push(`pick ${p.id}: ${error.message}`); continue; }
      graded++;
      const snap = await writeSettlementSnapshot({
        kind: "settlement",
        pickId: p.id,
        strategyId: p.strategy_id,
        eventId: ev.id,
        result,
        finalHome: f.homeGoals,
        finalAway: f.awayGoals,
        closingOdds: null,
        clvPct: null,
        settledAt: new Date().toISOString(),
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
      if (anchor.status === "anchored") anchored++;
      else if (anchor.status === "failed") errors.push(`anchor ${p.id}: ${anchor.error}`);
    }
  }
  return NextResponse.json({ graded, anchored, fixtures: fx.fixtures.length, errors });
}
