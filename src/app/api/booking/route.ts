import { NextResponse } from "next/server";
import { exportPick, type Operator } from "../../../lib/booking/export";
import { MOCK_EPL_EVENTS } from "../../../lib/mock/epl";

// Booking export for a pick. Mock codes until operator partnership keys exist.
export async function POST(req: Request) {
  const body = (await req.json()) as { operator?: Operator; pickId?: string; eventId?: string; selection?: string; market?: string; oddsAtLog?: number };
  if (body.operator !== "sportybet" && body.operator !== "bet9ja") {
    return NextResponse.json({ error: "operator must be sportybet or bet9ja" }, { status: 400 });
  }
  const ev = MOCK_EPL_EVENTS.find((e) => e.id === body.eventId);
  if (!ev || !body.pickId || !body.selection || !body.market || !body.oddsAtLog) {
    return NextResponse.json({ error: "pickId, eventId, market, selection, oddsAtLog required" }, { status: 400 });
  }
  try {
    const out = exportPick(body.operator, {
      pickId: body.pickId,
      homeTeam: ev.homeTeam,
      awayTeam: ev.awayTeam,
      market: body.market,
      selection: body.selection,
      oddsAtLog: body.oddsAtLog,
      kickoffTime: ev.kickoffTime,
    });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
