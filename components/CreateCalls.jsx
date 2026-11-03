"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { LEAGUES } from "@/lib/leagues";
import SlipTray from "@/components/SlipTray";
import { leagueFlag } from "@/lib/flags";

const LABEL = { home: "Home Win", draw: "Draw", away: "Away Win" };
const SHORT = { home: "1", draw: "X", away: "2" };
const lname = Object.fromEntries(LEAGUES);
const ymd = (d) => new Date(d).toLocaleDateString("en-CA");
const chip = (on) => `rounded-full border px-3 py-1.5 text-xs ${on ? "border-accent bg-accent/15 text-accent" : "border-white/10 text-white/60"}`;
const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function Badge({ name, crest }) {
  return crest ? <img src={crest} alt="" className="h-9 w-9 shrink-0 object-contain" />
    : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/80">{initials(name)}</span>;
}

export default function CreateCalls({ fixtures, called: initialCalled }) {
  const [called, setCalled] = useState(initialCalled);
  const [open, setOpen] = useState(false); // filters stay hidden until the button is tapped
  const [league, setLeague] = useState(null);
  const [mode, setMode] = useState("all");
  const [date, setDate] = useState("");
  const [sheet, setSheet] = useState(null); // { fx, sel }
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState([]);
  const [done, setDone] = useState(null);
  const [slip, setSlip] = useState([]);

  const shown = useMemo(() => {
    const today = ymd(new Date()), tomorrow = ymd(Date.now() + 864e5);
    return fixtures.filter((f) => {
      if (league && f.league !== league) return false;
      const d = ymd(f.kickoff_at), wd = new Date(f.kickoff_at).getDay();
      if (mode === "today") return d === today;
      if (mode === "tomorrow") return d === tomorrow;
      if (mode === "weekend") return wd === 6 || wd === 0;
      if (mode === "date") return !date || d === date;
      return true;
    });
  }, [fixtures, league, mode, date]);
  const active = Number(Boolean(league)) + Number(mode !== "all");

  function addToSlip() {
    setSlip((s) => (s.some((x) => x.fixtureId === sheet.fx.id) ? s : [...s, { fixtureId: sheet.fx.id, label: `${sheet.fx.home_team} vs ${sheet.fx.away_team}`, selection: sheet.sel, odds: sheet.fx.odds[sheet.sel] }]));
    close();
  }

  function close() { setSheet(null); setNote(""); setSteps([]); setDone(null); }

  async function post() {
    setBusy(true); setSteps(["Locking your call..."]);
    try {
      const r = await fetch("/api/picks/lock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fixtureId: sheet.fx.id, selection: sheet.sel, note }) });
      const j = await r.json();
      if (!r.ok) { setSteps([j.error]); setBusy(false); return; }
      setCalled((c) => ({ ...c, [sheet.fx.id]: sheet.sel }));
      setSteps([`Locked at ${j.odds}.`, "Saving to Walrus and stamping on Sui. This can take up to a minute, keep this open."]);
      const p = await (await fetch("/api/picks/prove", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pickId: j.pickId }) })).json();
      setDone({ id: j.pickId, odds: j.odds, walrus: p.snapshot, sui: p.anchor, digest: p.digest });
    } catch (e) {
      setSteps(["Your call is locked, but the proof step was interrupted. Open My Calls and tap Retry. It's safe to repeat."]);
    }
    setBusy(false);
  }

  return (
    <div className="mt-5">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white">
        <SlidersHorizontal size={16} /> Filters{active ? ` (${active})` : ""}
      </button>
      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-panel p-4">
          <div><p className="mb-1 text-xs text-white/50">League</p>
            <div className="flex flex-wrap gap-2">{LEAGUES.map(([k, n]) => <button key={k} onClick={() => setLeague(league === k ? null : k)} className={chip(league === k)}>{n}</button>)}</div></div>
          <div><p className="mb-1 text-xs text-white/50">When (your local time)</p>
            <div className="flex flex-wrap gap-2">{[["all", "Any"], ["today", "Today"], ["tomorrow", "Tomorrow"], ["weekend", "Weekend"], ["date", "Pick a date"]].map(([k, n]) => <button key={k} onClick={() => setMode(k)} className={chip(mode === k)}>{n}</button>)}</div>
            {mode === "date" && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-white" />}</div>
          <div><p className="mb-1 text-xs text-white/50">Market</p>
            <div className="flex flex-wrap gap-2"><span className={chip(true)}>1X2</span><span className={`${chip(false)} opacity-50`}>Over/Under, BTTS, Double Chance soon</span></div></div>
        </div>)}

      <div className="mt-4 space-y-3">
        {shown.map((f) => (
          <div key={f.id} className="rounded-2xl border border-white/10 bg-panel p-4">
            <div className="flex justify-between text-[11px] text-white/50"><span>{leagueFlag(f.league)} {lname[f.league] ?? f.league}</span>
              <span>{new Date(f.kickoff_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2"><Badge name={f.home_team} crest={f.hc} /><span className="truncate text-sm font-semibold text-white">{f.home_team}</span></div>
              <span className="text-xs text-white/30">vs</span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2"><span className="truncate text-right text-sm font-semibold text-white">{f.away_team}</span><Badge name={f.away_team} crest={f.ac} /></div>
            </div>
            {called[f.id] ? (
              <p className="mt-3 rounded-xl bg-accent/10 py-2 text-center text-sm text-accent">You called: {LABEL[called[f.id]]}</p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["home", "draw", "away"].map((k) => (
                  <button key={k} onClick={() => setSheet({ fx: f, sel: k })} className="rounded-xl bg-black/30 py-2 text-center active:bg-accent/20">
                    <span className="block text-[11px] text-white/40">{SHORT[k]}</span><span className="font-semibold text-white">{f.odds[k]}</span></button>))}
              </div>)}
          </div>))}
        {!shown.length && <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">{fixtures.length ? "No matches fit these filters." : "No matches loaded yet."}</p>}
      </div>

      {slip.length > 0 && <SlipTray legs={slip} onRemove={(id) => setSlip((s) => s.filter((x) => x.fixtureId !== id))} onDone={() => setSlip([])} />}
      {sheet && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/80">
          <div className="max-h-[92dvh] w-full max-w-md md:max-w-2xl space-y-3 overflow-y-auto rounded-t-3xl border border-white/10 bg-panel p-5">
            <div className="flex items-start justify-between"><div>
              <p className="text-xs text-white/50">{lname[sheet.fx.league]}</p>
              <p className="font-semibold text-white">{sheet.fx.home_team} vs {sheet.fx.away_team}</p></div>
              <button onClick={close} aria-label="Close" className="text-white/50"><X size={20} /></button></div>
            <div className="rounded-xl bg-black/30 p-3"><p className="text-xs text-white/50">Your call</p>
              <p className="text-lg font-semibold text-white">{LABEL[sheet.sel]} <span className="text-accent">@ {sheet.fx.odds[sheet.sel]}</span></p>
              <p className="mt-1 text-[11px] text-white/40">Odds are the average across European bookmakers when you post. The same source sets the closing line, so your edge is measured fairly.</p></div>
            {!steps.length && <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Why? (optional)" className="h-20 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-accent" />}
            {steps.map((x, i) => <p key={i} className="text-sm text-white/70">{x}</p>)}
            {done && (
              <div className="space-y-1 rounded-xl border border-accent/40 p-3 text-sm">
                <p className="text-white">Walrus snapshot: <b className={done.walrus?.startsWith("failed") ? "text-red-400" : "text-accent"}>{done.walrus}</b></p>
                <p className="text-white">Sui timestamp: <b className={done.sui?.startsWith("failed") ? "text-red-400" : "text-accent"}>{done.sui}</b></p>
                {done.digest && <a className="block break-all text-xs text-accent underline" href={`https://suiscan.xyz/mainnet/tx/${done.digest}`} target="_blank" rel="noreferrer">Tx {done.digest}</a>}
                <Link href={`/p/${done.id}`} className="block pt-1 text-accent underline">Share this call</Link>
              </div>)}
            {!done && !steps.length && <p className="text-xs text-white/40">Posting locks this call. You can't edit or delete it.</p>}
            {!done && !steps.length && <button disabled={busy} onClick={post} className="w-full rounded-full bg-accent py-3.5 font-semibold text-black disabled:opacity-50">Lock my call</button>}
            {!done && !steps.length && <button onClick={addToSlip} className="w-full rounded-full border border-accent/50 py-3 text-sm text-accent">Add to multi slip</button>}
            {(done || (steps.length > 0 && !busy)) && <button onClick={close} className="w-full rounded-full border border-white/15 py-3 text-sm text-white">Done</button>}
          </div>
        </div>)}
    </div>
  );
}
