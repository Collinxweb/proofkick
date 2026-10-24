// Seed: EPL fixtures + two odds snapshots each, plus the sample strategies and their picks
// (computed through the rules engine, not hand-written). Mock-safe: prints a dry run when
// Supabase service keys are absent.
import { MOCK_EPL_EVENTS } from "../src/lib/mock/epl";
import { SAMPLE_STRATEGIES } from "../src/lib/mock/strategies";
import { evaluateStrategy } from "../src/lib/rules/engine";

const now = new Date("2026-10-24T09:00:00Z");
const rows = { events: 0, snapshots: 0, strategies: 0, picks: 0 };
const picks: Array<{ strategy: string; event: string; selection: string; odds: number }> = [];

for (const ev of MOCK_EPL_EVENTS) {
  rows.events++;
  rows.snapshots += ev.odds.length;
  for (const s of SAMPLE_STRATEGIES) {
    const r = evaluateStrategy(s, ev, now);
    if (r.pick) {
      rows.picks++;
      picks.push({ strategy: s.name, event: `${ev.homeTeam} vs ${ev.awayTeam}`, selection: r.pick.selection, odds: r.pick.oddsAtLog });
    }
  }
}
rows.strategies = SAMPLE_STRATEGIES.length;

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log(JSON.stringify({ rows }, null, 2));
  for (const p of picks) console.log(`pick: ${p.strategy} | ${p.event} | ${p.selection} @ ${p.odds}`);
  if (!url || !key) {
    console.log("no SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: dry run, nothing written.");
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { auth: { persistSession: false } });
  for (const ev of MOCK_EPL_EVENTS) {
    const { data, error } = await db
      .from("events")
      .upsert({ external_id: ev.id, league: ev.league, home_team: ev.homeTeam, away_team: ev.awayTeam, kickoff_time: ev.kickoffTime }, { onConflict: "external_id" })
      .select("id")
      .single();
    if (error) throw error;
    await db.from("odds_snapshots").delete().eq("event_id", data.id);
    await db.from("odds_snapshots").insert(
      ev.odds.map((o) => ({ event_id: data.id, captured_at: o.capturedAt, home: o.home, draw: o.draw, away: o.away, over25: o.over25, under25: o.under25, btts_yes: o.bttsYes, btts_no: o.bttsNo }))
    );
  }
  console.log("seeded events and odds snapshots.");
  const owner = process.env.SEED_OWNER_ID;
  if (!owner) {
    console.log("SEED_OWNER_ID not set: skipped strategies (set it to a profiles.id to insert the 3 samples).");
    return;
  }
  for (const s of SAMPLE_STRATEGIES) {
    const { error } = await db.from("strategies").upsert(
      { id: s.id, owner_id: owner, name: s.name, sport: s.sport, league: s.league, rules: s.rules },
      { onConflict: "id" }
    );
    if (error) throw error;
  }
  console.log(`seeded ${SAMPLE_STRATEGIES.length} strategies for owner ${owner}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
