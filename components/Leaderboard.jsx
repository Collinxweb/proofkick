"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import Avatar from "@/components/Avatar";
import { LEAGUES } from "@/lib/leagues";
import { rankUsers } from "@/lib/leaderboard";

const chip = (on) => `rounded-full border px-3 py-1.5 text-xs ${on ? "border-accent bg-accent/15 text-accent" : "border-white/10 text-white/60"}`;

export default function Leaderboard({ rows, users, minGraded }) {
  const [metric, setMetric] = useState("hit");
  const [league, setLeague] = useState(null);
  const [open, setOpen] = useState(false); // filters stay hidden until tapped
  const list = useMemo(() => rankUsers({ rows, users, league, metric, minGraded }).slice(0, 20), [rows, users, league, metric, minGraded]);
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white"><SlidersHorizontal size={14} />Filters{league ? " (1)" : ""}</button>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setMetric("hit")} className={chip(metric === "hit")}>Hit rate</button>
        <button onClick={() => setMetric("clv")} className={chip(metric === "clv")}>CLV</button>
      </div>
      {open && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-panel p-4">
          <p className="mb-1 text-xs text-white/50">League</p>
          <div className="flex flex-wrap gap-2">{LEAGUES.map(([k, n]) => <button key={k} onClick={() => setLeague(league === k ? null : k)} className={chip(league === k)}>{n}</button>)}</div>
          <p className="mb-1 mt-3 text-xs text-white/50">Market</p>
          <div className="flex gap-2"><span className={chip(true)}>1X2</span></div>
        </div>)}
      <div className="mt-3 space-y-2">
        {list.map((p, i) => (
          <Link key={p.handle} href={`/u/${p.handle}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-panel p-3">
            <span className="w-6 text-center text-sm font-semibold text-accent">{i + 1}</span>
            <Avatar url={p.avatar_url} name={p.handle} size={36} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">@{p.handle}</p><p className="text-[11px] text-white/50">{p.graded} graded calls</p></div>
            <div className="text-right"><p className="text-sm font-semibold text-white">{metric === "hit" ? `${(p.hit * 100).toFixed(0)}%` : `${p.clv >= 0 ? "+" : ""}${(p.clv * 100).toFixed(1)}%`}</p><p className="text-[10px] text-white/40">{metric === "hit" ? "hit rate" : `CLV, ${p.clvN} calls`}</p></div>
          </Link>))}
        {!list.length && <p className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-xs text-white/55">No one has {minGraded}+ graded calls{league ? " in this league" : ""} yet. Rankings need a minimum sample so a lucky streak can't top the board. Voids never count.</p>}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-white/35">Hit rate is graded wins over graded calls. CLV compares the price at call time with the average closing price across European bookmakers: positive means the call beat the closing line. Neither guarantees future results.</p>
    </section>
  );
}
