import { evaluateStrategy, type EventRecord } from "../lib/rules/engine";
import { MOCK_EPL_EVENTS } from "../lib/mock/epl";
import { SAMPLE_STRATEGIES } from "../lib/mock/strategies";
import { AuthPanel } from "../components/AuthPanel";

export const dynamic = "force-dynamic";

export default function Home() {
  const now = new Date();
  const rows = (MOCK_EPL_EVENTS as EventRecord[]).map((ev) => ({
    ev,
    picks: SAMPLE_STRATEGIES.map((s) => ({ s, r: evaluateStrategy(s, ev, now) })),
  }));
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold">stratTrack</h1>
        <p className="text-sm text-zinc-400">rules engine, live when keys are set. mock data otherwise.</p>
      </header>
      <AuthPanel />
      <section className="space-y-4">
        <h2 className="text-lg font-medium">epl fixtures and what your strategies would pick</h2>
        {rows.map(({ ev, picks }) => (
          <div key={ev.id} className="rounded-lg border border-zinc-800 p-4">
            <div className="font-medium">{ev.homeTeam} vs {ev.awayTeam}</div>
            <div className="text-xs text-zinc-500">kickoff {ev.kickoffTime}</div>
            <ul className="mt-2 space-y-1 text-sm">
              {picks.map(({ s, r }) => (
                <li key={s.id}>
                  <span className="text-zinc-300">{s.name}:</span>{" "}
                  {r.pick ? (
                    <span className="text-emerald-400">
                      {r.pick.selection} @ {r.pick.oddsAtLog}
                    </span>
                  ) : (
                    <span className="text-zinc-500">no pick ({r.reason})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
