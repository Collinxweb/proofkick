import { NextResponse } from "next/server";
import { evaluateStrategy, validateRules, type EventRecord, type Strategy } from "../../../lib/rules/engine";
import { assertLoggable, PickError } from "../../../lib/picks/validate";
import { supabaseAdmin } from "../../../lib/supabase/server";
import { MOCK_EPL_EVENTS } from "../../../lib/mock/epl";
import { SAMPLE_STRATEGIES } from "../../../lib/mock/strategies";
import { writePickSnapshot, isRealBlobId } from "../../../lib/memory/snapshot";
import { anchorReceipt, RECEIPT_KIND } from "../../../lib/chain/sui";

// Log a pick. Server validation: rules must parse, kickoff must be in the future, and the candidate
// must pass the strategy's rules against the latest odds. The DB trigger re-checks kickoff on insert.
// After insert: memwal snapshot, store the real blob id, then optional Sui anchor. Snapshot and
// anchor failures are recorded on the pick but never fail the save.
export async function POST(req: Request) {
  const body = (await req.json()) as { strategyId?: string; eventId?: string };
  const strategy = SAMPLE_STRATEGIES.find((s) => s.id === body.strategyId) as Strategy | undefined;
  const event = MOCK_EPL_EVENTS.find((e) => e.id === body.eventId) as EventRecord | undefined;
  if (!strategy || !event) return NextResponse.json({ error: "unknown strategy or event" }, { status: 404 });

  const problems = validateRules(strategy.rules);
  if (problems.length) return NextResponse.json({ error: problems }, { status: 422 });

  try {
    assertLoggable(event.kickoffTime);
  } catch (e) {
    if (e instanceof PickError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }

  const { pick, reason } = evaluateStrategy(strategy, event);
  if (!pick) return NextResponse.json({ error: "rules not met", reason }, { status: 422 });

  const db = supabaseAdmin();
  if (!db) return NextResponse.json({ mode: "mock", persisted: false, pick });

  const loggedAt = new Date();
  const { data, error } = await db
    .from("picks")
    .insert({
      strategy_id: pick.strategyId,
      event_id: pick.eventId,
      market: pick.market,
      selection: pick.selection,
      odds_at_log: pick.oddsAtLog,
      kickoff_time: pick.kickoffTime,
      logged_at: loggedAt.toISOString(),
      reasoning: reason ?? "",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  const pickId = data.id as string;

  // Walrus snapshot. Stores the blob id only when memwal returned one.
  const snap = await writePickSnapshot(
    {
      kind: "pick",
      pickId,
      strategyId: pick.strategyId,
      eventId: pick.eventId,
      market: pick.market,
      selection: pick.selection,
      oddsAtLog: pick.oddsAtLog,
      reasoning: reason ?? "",
      kickoffTime: pick.kickoffTime,
      loggedAt: loggedAt.toISOString(),
    },
    loggedAt,
  );
  const blobId = snap.status === "written" && isRealBlobId(snap.blobId) ? snap.blobId : null;
  await db
    .from("picks")
    .update({
      memwal_status: snap.status === "written" ? "written" : snap.status === "skipped" ? "skipped" : "failed",
      memwal_blob_id: blobId,
      memwal_error: snap.status === "failed" ? snap.error : snap.status === "skipped" ? snap.reason : null,
    })
    .eq("id", pickId);

  // Optional Sui anchor. Only with a real blob id; skipped when key/package missing.
  let anchorStatus: string = "skipped";
  if (blobId) {
    const anchor = await anchorReceipt({
      kind: RECEIPT_KIND.pickLock,
      strategyId: pick.strategyId,
      blobId,
      refText: `pick:${pickId}`,
      tsMs: loggedAt.getTime(),
    });
    if (anchor.status === "anchored") {
      anchorStatus = "anchored";
      await db.from("picks").update({ anchor_status: "anchored", anchor_digest: anchor.digest, anchor_error: null }).eq("id", pickId);
    } else if (anchor.status === "failed") {
      anchorStatus = "failed";
      await db.from("picks").update({ anchor_status: "failed", anchor_error: anchor.error }).eq("id", pickId);
    } else {
      await db.from("picks").update({ anchor_status: "skipped", anchor_error: anchor.reason }).eq("id", pickId);
    }
  }

  return NextResponse.json({
    mode: "live",
    persisted: true,
    pickId,
    pick,
    memwal: { status: snap.status, blobId },
    anchor: { status: anchorStatus },
  });
}
