"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { LEAGUES, SELECTIONS, DAYS } from "@/lib/leagues";
import { createStrategy } from "@/app/actions";

const STEPS = [
  ["Pick the outcome", "Choose what the strategy backs: a home win, a draw or an away win."],
  ["Add conditions", "Narrow it with an odds range, leagues and match days. A strategy with no limits is just guessing, so add at least one."],
  ["Name it", "Give it a clear name and a one-line idea. Followers read this before they trust you."],
  ["Publish", "Rules lock as version 1. Editing later creates a new version with a fresh record. Every pick locks before kickoff, so results can't be edited."],
];
const field = "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-accent";
const chip = (on) => `rounded-full border px-3 py-1.5 text-xs ${on ? "border-accent bg-accent/15 text-accent" : "border-white/10 text-white/60"}`;
const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function StrategyBuilder() {
  const router = useRouter();
  const [guide, setGuide] = useState(true);
  const [s, setS] = useState({ name: "", description: "", selection: "home", minOdds: "", maxOdds: "", leagues: [], days: [] });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const up = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const lname = Object.fromEntries(LEAGUES);

  const rule = [`Back ${SELECTIONS[s.selection].label}`,
    (s.minOdds || s.maxOdds) && `when odds are ${s.minOdds || "any"} to ${s.maxOdds || "any"}`,
    s.leagues.length && `in ${s.leagues.map((l) => lname[l]).join(", ")}`,
    s.days.length && `on ${s.days.map((d) => DAYS[d]).join(", ")} (UTC)`].filter(Boolean).join(" ");

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await createStrategy(s);
    setBusy(false);
    if (res?.error) return setErr(res.error);
    router.push("/dashboard");
    router.refresh();
  }

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
            <p className="text-xs text-white/50">Tip: start narrow and judge a strategy after 30+ picks. Results never guarantee future returns. Team-form conditions (like goals in the last 3) arrive once results data is connected.</p>
          </div>)}
      </section>

      <form onSubmit={submit} className="space-y-5">
        <div><p className="mb-2 text-sm font-semibold text-white">1. Outcome</p>
          <div className="flex gap-2">{Object.entries(SELECTIONS).map(([k, v]) => <button type="button" key={k} onClick={() => setS({ ...s, selection: k })} className={chip(s.selection === k)}>{v.label}</button>)}</div></div>
        <div><p className="mb-2 text-sm font-semibold text-white">2. Conditions</p>
          <div className="grid grid-cols-2 gap-2">
            <input className={field} inputMode="decimal" placeholder="Min odds (1.80)" value={s.minOdds} onChange={up("minOdds")} />
            <input className={field} inputMode="decimal" placeholder="Max odds (2.30)" value={s.maxOdds} onChange={up("maxOdds")} /></div>
          <p className="mb-1 mt-3 text-xs text-white/50">Leagues (none selected = all)</p>
          <div className="flex flex-wrap gap-2">{LEAGUES.map(([k, n]) => <button type="button" key={k} onClick={() => setS({ ...s, leagues: toggle(s.leagues, k) })} className={chip(s.leagues.includes(k))}>{n}</button>)}</div>
          <p className="mb-1 mt-3 text-xs text-white/50">Match days (none selected = any)</p>
          <div className="flex flex-wrap gap-2">{DAYS.map((d, i) => <button type="button" key={d} onClick={() => setS({ ...s, days: toggle(s.days, i) })} className={chip(s.days.includes(i))}>{d}</button>)}</div></div>
        <div><p className="mb-2 text-sm font-semibold text-white">3. Name it</p>
          <input required className={field} placeholder="Strategy name" maxLength={50} value={s.name} onChange={up("name")} />
          <input className={`${field} mt-2`} placeholder="One-line idea (optional)" maxLength={200} value={s.description} onChange={up("description")} /></div>
        <div className="rounded-xl bg-black/30 p-3 text-sm text-white/70"><span className="text-xs text-white/40">Your rule</span><br />{rule}</div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={busy} className="w-full rounded-full bg-accent py-3.5 font-semibold text-black disabled:opacity-50">{busy ? "Publishing..." : "4. Publish strategy"}</button>
      </form>
    </div>
  );
}
