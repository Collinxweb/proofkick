"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { LEAGUES, DAYS, OUTCOMES, SIGNALS, STAT_SIGNALS, SIDE_SIGNALS, TEMPLATES, buildRules, evaluate, describe } from "@/lib/confluence";
import { createStrategy } from "@/app/strategy-actions";

const STEPS = [
  ["Pick the outcome", "What the strategy backs: a home win, a draw or an away win."],
  ["Set the scope", "Which leagues and match days it applies to. Leave empty for all."],
  ["Choose signals", "Each signal is a test a match must pass. Confluence means several signals agree before a pick fires, so weak spots get filtered out."],
  ["Name and publish", "Rules lock as version 1. Editing later makes a new version with a fresh record, and picks lock before kickoff so results can't be rewritten."],
];
const field = "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-accent";
const chip = (on) => `rounded-full border px-3 py-1.5 text-xs ${on ? "border-accent bg-accent/15 text-accent" : "border-white/10 text-white/60"}`;
const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const empty = { name: "", description: "", selection: "home", leagues: [], days: [], signals: {}, required: null };
const MARKET = Object.keys(SIGNALS).filter((id) => !STAT_SIGNALS.includes(id));

export default function StrategyBuilder({ fixtures = [] }) {
  const router = useRouter();
  const [guide, setGuide] = useState(true);
  const [s, setS] = useState(empty);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const ids = Object.keys(s.signals), n = ids.length;
  const required = Math.min(s.required ?? n, n);
  const input = { ...s, signals: ids.map((id) => ({ id, ...s.signals[id] })), required };
  const built = useMemo(() => buildRules(input), [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const results = useMemo(() => (built.rules ? fixtures.map((fx) => ({ fx, r: evaluate(built.rules, fx) })) : []), [built, fixtures]);
  const hits = results.filter((x) => x.r.pass);
  const withStats = fixtures.filter((f) => f.context).length;
  const usesStats = ids.some((id) => STAT_SIGNALS.includes(id));

  const setSignal = (id, patch) => setS({ ...s, signals: { ...s.signals, [id]: { ...s.signals[id], ...patch } } });
  const toggleSignal = (id) => {
    const next = { ...s.signals };
    if (next[id]) delete next[id]; else next[id] = { ...SIGNALS[id].defaults };
    setS({ ...s, signals: next, required: null });
  };
  const bump = (d) => setS({ ...s, required: Math.min(Math.max(required + d, 1), n) });

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await createStrategy(input);
    setBusy(false);
    if (res?.error) return setErr(res.error);
    router.push("/dashboard"); router.refresh();
  }

  const signalCard = (id) => {
    const def = SIGNALS[id], on = Boolean(s.signals[id]), blocked = s.selection === "draw" && SIDE_SIGNALS.includes(id);
    return (
      <div key={id} className={`rounded-xl border p-3 ${on ? "border-accent/50 bg-accent/[0.05]" : "border-white/10"} ${blocked ? "opacity-50" : ""}`}>
        <button type="button" onClick={() => toggleSignal(id)} className="flex w-full items-start justify-between gap-3 text-left">
          <span><span className="block text-sm font-semibold text-white">{def.label}</span>
            <span className="block text-xs text-white/50">{def.hint}{blocked ? " Needs a home or away pick." : ""}</span></span>
          <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border ${on ? "border-accent bg-accent" : "border-white/30"}`} />
        </button>
        {on && (
          <div className="mt-3 flex flex-wrap gap-2">
            {def.choice ? def.choice.map((c) => <button type="button" key={c} onClick={() => setSignal(id, { value: c })} className={chip(s.signals[id].value === c)}>{c}</button>)
              : def.fields.map(([k, label]) => (
                <label key={k} className="flex-1 text-[11px] text-white/50">{label}
                  <input inputMode="decimal" className={`${field} mt-1 py-2`} value={s.signals[id][k] ?? ""} onChange={(e) => setSignal(id, { [k]: e.target.value })} /></label>))}
          </div>)}
      </div>);
  };

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-2xl border border-accent/30 bg-accent/[0.04]">
        <button type="button" onClick={() => setGuide(!guide)} className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-white">
          How to build a strategy <ChevronDown size={18} className={guide ? "rotate-180" : ""} />
        </button>
        {guide && (
          <div className="space-y-3 px-4 pb-4">
            {STEPS.map(([t, d], i) => (
              <div key={t} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">{i + 1}</span>
                <p className="text-sm text-white/70"><b className="text-white">{t}.</b> {d}</p></div>))}
            <p className="text-xs text-white/50">Be critical: signals from the same odds overlap, so mix them with team-form signals, which come from real results. Injuries, suspensions and motivation are not in the data, so judge those yourself. Judge a strategy after 30+ picks. Past results never guarantee future returns.</p>
          </div>)}
      </section>

      <div><p className="mb-2 text-sm font-semibold text-white">Quick start</p>
        <div className="flex flex-wrap gap-2">{Object.entries(TEMPLATES).map(([name, t]) => (
          <button type="button" key={name} onClick={() => setS({ ...s, selection: t.selection, signals: Object.fromEntries(Object.entries(t.signals).map(([k, v]) => [k, { ...v }])), required: t.required })} className={chip(false)}>{name}</button>))}</div></div>

      <form onSubmit={submit} className="space-y-5">
        <div><p className="mb-2 text-sm font-semibold text-white">1. Outcome</p>
          <div className="flex gap-2">{Object.entries(OUTCOMES).map(([k, label]) => <button type="button" key={k} onClick={() => setS({ ...s, selection: k })} className={chip(s.selection === k)}>{label}</button>)}</div></div>

        <div><p className="mb-1 text-sm font-semibold text-white">2. Scope</p>
          <p className="mb-1 text-xs text-white/50">Leagues (none selected = all)</p>
          <div className="flex flex-wrap gap-2">{LEAGUES.map(([k, name]) => <button type="button" key={k} onClick={() => setS({ ...s, leagues: toggle(s.leagues, k) })} className={chip(s.leagues.includes(k))}>{name}</button>)}</div>
          <p className="mb-1 mt-3 text-xs text-white/50">Match days, UTC (none selected = any)</p>
          <div className="flex flex-wrap gap-2">{DAYS.map((d, i) => <button type="button" key={d} onClick={() => setS({ ...s, days: toggle(s.days, i) })} className={chip(s.days.includes(i))}>{d}</button>)}</div></div>

        <div><p className="mb-2 text-sm font-semibold text-white">3. Signals</p>
          <p className="mb-2 text-xs uppercase tracking-wider text-white/40">From the odds</p>
          <div className="space-y-2">{MARKET.map(signalCard)}</div>
          <p className="mb-1 mt-4 text-xs uppercase tracking-wider text-white/40">From team form and results</p>
          <p className="mb-2 text-xs text-white/50">{withStats ? `Team stats are loaded for ${withStats} of ${fixtures.length} upcoming matches.` : "Team stats are not loaded yet, so these signals will not match anything until they are."}</p>
          <div className="space-y-2">{STAT_SIGNALS.map(signalCard)}</div>
          {n >= 2 && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-black/30 px-4 py-3">
              <p className="pr-3 text-sm text-white/70"><b className="text-white">Confluence:</b> fire a pick when at least <b className="text-accent">{required}</b> of {n} signals agree.</p>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => bump(-1)} className="rounded-full border border-white/15 p-1.5 text-white"><Minus size={14} /></button>
                <button type="button" onClick={() => bump(1)} className="rounded-full border border-white/15 p-1.5 text-white"><Plus size={14} /></button>
              </div>
            </div>)}
        </div>

        <div><p className="mb-2 text-sm font-semibold text-white">4. Name it</p>
          <input required className={field} placeholder="Strategy name" maxLength={50} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
          <input className={`${field} mt-2`} placeholder="One-line idea (optional)" maxLength={200} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} /></div>

        <div className="rounded-xl bg-black/30 p-3 text-sm text-white/70">
          <span className="text-xs text-white/40">Your rule</span><br />
          {built.rules ? describe(built.rules) : <span className="text-white/40">{built.error}</span>}
          {built.rules && (
            <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/60">Would fire on <b className="text-accent">{hits.length}</b> of {fixtures.length} upcoming matches.
              {usesStats && !withStats ? " Load team stats to preview the form signals." : ""}
              {hits.slice(0, 3).map(({ fx, r }) => <span key={fx.id} className="mt-1 block text-white/50">{fx.home_team} vs {fx.away_team} · {r.score}/{r.total} signals</span>)}</p>)}
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={busy} className="w-full rounded-full bg-accent py-3.5 font-semibold text-black disabled:opacity-50">{busy ? "Publishing..." : "Publish strategy"}</button>
      </form>
    </div>
  );
}
