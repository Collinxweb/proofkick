"use client";
import { useMemo, useState } from "react";
import Crest from "@/components/Crest";
import LocalTime from "@/components/LocalTime";
import { bookPicks } from "@/app/actions";
import { DAYS } from "@/lib/leagues";
import { SEL_LABEL } from "@/lib/booking";

const SELS = ["home", "draw", "away"];
const KEY_LABEL = { home: "1", draw: "X", away: "2" };
const HOURS = Array.from({ length: 24 }, (_, h) => h);

// Local calendar day (YYYY-MM-DD) for an ISO kickoff, in the user's own timezone.
function localDay(iso) {
  const d = new Date(iso);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function BrowseList({ fixtures, crests, lname }) {
  const [date, setDate] = useState("");
  const [weekdays, setWeekdays] = useState([]);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(24);
  const [picks, setPicks] = useState({}); // fixtureId -> selection
  const [sheet, setSheet] = useState(false);
  const [operator, setOperator] = useState("sportybet");
  const [booking, setBooking] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => {
    return fixtures.filter((f) => {
      const d = new Date(f.kickoff_at);
      if (date && localDay(f.kickoff_at) !== date) return false;
      if (weekdays.length && !weekdays.includes(d.getDay())) return false;
      const h = d.getHours();
      if (h < from || h >= to) return false;
      return true;
    });
  }, [fixtures, date, weekdays, from, to]);

  const filtersOn = date || weekdays.length || from > 0 || to < 24;
  const chosen = fixtures.filter((f) => picks[f.id]);
  const combined = chosen.reduce((acc, f) => acc * Number(f.odds?.[picks[f.id]] ?? 1), 1);

  function toggle(fid, sel) {
    setPicks((cur) => {
      const next = { ...cur };
      if (next[fid] === sel) delete next[fid];
      else next[fid] = sel;
      return next;
    });
    setBooking(null);
  }

  function toggleDay(i) {
    setWeekdays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
  }

  function clearFilters() {
    setDate(""); setWeekdays([]); setFrom(0); setTo(24);
  }

  async function generate() {
    setBusy(true); setErr("");
    const res = await bookPicks({
      operator,
      picks: chosen.map((f) => ({ fixtureId: f.id, selection: picks[f.id] })),
    });
    setBusy(false);
    if (res.error) { setErr(res.error); return; }
    setBooking(res.booking);
  }

  function closeSheet() {
    setSheet(false); setBooking(null); setErr("");
  }

  return (
    <>
      <div className="mt-5 rounded-2xl border border-white/10 bg-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Filters</p>
          {filtersOn && <button type="button" onClick={clearFilters} className="text-xs text-accent">Clear</button>}
        </div>
        <label className="block text-xs text-white/50">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
        </label>
        <div>
          <p className="text-xs text-white/50">Day</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {DAYS.map((label, i) => {
              const on = weekdays.includes(i);
              return (
                <button key={label} type="button" onClick={() => toggleDay(i)} aria-pressed={on}
                  className={`rounded-full px-3 py-1 text-xs ${on ? "bg-accent text-black" : "bg-white/[0.06] text-white/70"}`}>{label}</button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-white/50">
            From
            <select value={from} onChange={(e) => setFrom(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
              {HOURS.filter((h) => h < to).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
            </select>
          </label>
          <label className="block text-xs text-white/50">
            To
            <select value={to} onChange={(e) => setTo(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
              {Array.from({ length: 24 }, (_, i) => i + 1).filter((v) => v > from).map((v) => <option key={v} value={v}>{String(v).padStart(2, "0")}:00</option>)}
            </select>
          </label>
        </div>
        <p className="text-[11px] text-white/40">Showing {shown.length} of {fixtures.length} matches. Times are in your local timezone.</p>
      </div>

      <div className="mt-4 space-y-3">
        {shown.map((f) => (
          <div key={f.id} className={`rounded-2xl border bg-panel p-4 ${picks[f.id] ? "border-accent/60" : "border-white/10"}`}>
            <div className="flex justify-between text-[11px] text-white/50"><span>{lname[f.league] ?? f.league}</span><LocalTime iso={f.kickoff_at} /></div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Crest src={crests[f.home_team]} name={f.home_team} />
                <p className="truncate text-sm font-semibold text-white">{f.home_team}</p>
              </div>
              <span className="text-xs text-white/40">vs</span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <p className="truncate text-right text-sm font-semibold text-white">{f.away_team}</p>
                <Crest src={crests[f.away_team]} name={f.away_team} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {SELS.map((s) => {
                const on = picks[f.id] === s;
                const v = f.odds?.[s];
                return (
                  <button key={s} type="button" onClick={() => v && toggle(f.id, s)} disabled={!v} aria-pressed={on}
                    className={`rounded-xl py-2 ${on ? "bg-accent text-black" : "bg-black/30 text-white"} disabled:opacity-40`}>
                    <p className={`text-[11px] ${on ? "text-black/70" : "text-white/40"}`}>{KEY_LABEL[s]}</p>
                    <p className="font-semibold">{v ?? "—"}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {!shown.length && (
          <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">
            {fixtures.length ? "No matches fit these filters." : "No matches loaded yet. Fixtures refresh once a day."}
          </div>
        )}
      </div>

      {chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-20 mx-auto max-w-md px-4">
          <button type="button" onClick={() => { setSheet(true); setBooking(null); setErr(""); }}
            className="flex w-full items-center justify-between rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-black shadow-[0_0_24px_-4px_#19d36b]">
            <span>Book {chosen.length} {chosen.length === 1 ? "pick" : "picks"}</span>
            <span>{combined.toFixed(2)}</span>
          </button>
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4" onClick={closeSheet}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-panel p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Export bet slip</h3>
              <button type="button" onClick={closeSheet} className="text-white/50" aria-label="Close">✕</button>
            </div>
            <p className="mt-1 text-xs text-white/50">ProofKick never touches your account. It maps your picks to a booking code you load on the platform yourself.</p>

            {!booking ? (
              <>
                <div className="mt-4">
                  <p className="text-xs text-white/50">Platform</p>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {[["sportybet", "SportyBet"], ["bet9ja", "Bet9ja"]].map(([k, label]) => (
                      <button key={k} type="button" onClick={() => setOperator(k)} aria-pressed={operator === k}
                        className={`rounded-xl py-2 text-sm font-semibold ${operator === k ? "bg-accent text-black" : "bg-white/[0.06] text-white/70"}`}>{label}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-white/50">Picks ({chosen.length})</p>
                  {chosen.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 text-sm">
                      <span className="truncate text-white">{f.home_team} v {f.away_team} · {SEL_LABEL[picks[f.id]]}</span>
                      <span className="ml-2 shrink-0 font-semibold text-accent">{Number(f.odds[picks[f.id]]).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-white/50">Combined odds</span>
                  <b className="text-white">{combined.toFixed(2)}</b>
                </div>
                {err && <p className="mt-3 text-xs text-red-400">{err}</p>}
                <button type="button" onClick={generate} disabled={busy || !chosen.length}
                  className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50">
                  {busy ? "Generating…" : `Generate ${operator === "sportybet" ? "SportyBet" : "Bet9ja"} booking code`}
                </button>
              </>
            ) : (
              <BookingCard booking={booking} onDone={() => { setPicks({}); closeSheet(); }} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Same layout as the /prototype booking export: code, deep link, copy, load-it-yourself note.
function BookingCard({ booking, onDone }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/[0.05] p-4">
      <p className="text-xs text-white/50">Booking code · {booking.operatorLabel} · mock</p>
      <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-accent">{booking.code}</p>
      <p className="mt-1 text-xs text-white/50">Combined odds {booking.combinedOdds.toFixed(2)} · {booking.picks.length} {booking.picks.length === 1 ? "pick" : "picks"}</p>
      <div className="mt-4 flex gap-2">
        <a href={booking.deepLink} target="_blank" rel="noreferrer" className="flex-1 rounded-xl bg-accent py-2.5 text-center text-sm font-semibold text-black">Open {booking.operatorLabel} deep link</a>
        <button type="button" onClick={() => { navigator.clipboard?.writeText(booking.code); setCopied(true); }}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white">{copied ? "Copied" : "Copy code"}</button>
      </div>
      <p className="mt-3 text-[11px] text-white/45">Paste {booking.code} into {booking.operatorLabel}'s booking code field. This is a mock code and ProofKick does not call either platform. The slip is saved under My Bets.</p>
      <button type="button" onClick={onDone} className="mt-3 w-full text-xs text-white/60 underline">Done</button>
    </div>
  );
}
