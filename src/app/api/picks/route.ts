import { NextResponse } from "next/server";
import { evaluateStrategy, validateRules, type EventRecord, type Strategy } from "../../../lib/rules/engine";
import { assertLoggable, PickError } from "../../../lib/picks/validate";
import { supabaseAdmin } from "../../../lib/supabase/server";
import { MOCK_EPL_EVENTS } from "../../../lib/mock/epl";
import { SAMPLE_STRATEGIES } from "../../../lib/mock/strategies";

// Log a pick. Server validation: rules must parse, kickoff must be in the future, and
// the candidate must pass the strategy's rules against the latest odds. The DB trigger
// re-checks kickoff on insert.
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
  const { data, error } = await db
    .from("picks")
    .insert({
      strategy_id: pick.strategyId,
      event_id: pick.eventId,
      market: pick.market,
      selection: pick.selection,
      odds_at_log: pick.oddsAtLog,
      kickoff_time: pick.kickoffTime,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ mode: "live", persisted: true, pickId: data.id, pick });
}
