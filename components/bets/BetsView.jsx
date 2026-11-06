"use client";
import { useMemo, useState } from "react";
import { ArrowUp, ArrowRight, Clock, Check, Trophy } from "lucide-react";

const LABEL = { home: "Home", draw: "Draw", away: "Away" };
const FILTERS = [["all", "All"], ["today", "Today"], ["week", "Last 7 days"]];
const day = (iso) => new Date(iso).toISOString().slice(0, 10);
const when = (iso) => new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC";

function Crest({ url, label }) {
  return url ? <img src={url} alt="" className="h-9 w-9 object-contain" /> : (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/80">{(label ?? "?").slice(0, 2).toUpperCase()}</span>
  );
}
const badge = (status) => status === "pending"
  ? <span className="flex items-center gap-1 rounded-full border border-accent/50 px-3 py-1 text-xs text-accent"><Clock size={12} />Open</span>
  : status === "won" ? <span className="flex items-center gap-1 rounded-full border border-accent/50 px-3 py-1 text-xs text-accent"><Check size={12} />Won</span>
  : status === "lost" ? <span className="rounded-full border border-red-400/50 px-3 py-1 text-xs text-red-400">Lost</span>
  : <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60">Void</span>;

export default function BetsView({ items, stats }) {
  const [tab, setTab] = useState("open");
  const [range, setRange] = useState("all");
  const now = Date.now();
  const isOpen = (it) => it.status === "pending";
  const counts = { open: items.filter(isOpen).length, settled: items.filter((it) => !isOpen(it)).length };
  const shown = useMemo(() => items.filter((it) => {
    if (tab === "open" ? !isOpen(it) : isOpen(it)) return false;
    const at = Date.parse(it.at);
    if (range === "today") return day(it.at) === new Date().toISOString().slice(0, 10);
    if (range === "week") return now - at <= 7 * 864e5;
    return true;
  }), [items, tab, range, now]);

  return (
    <div>
      <div className="flex rounded-full border border-white/15 p-1">
        {[["open", "Open", counts.open], ["settled", "Settled", counts.settled]].map(([k, label, n]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold ${tab === k ? "bg-accent text-black" : "text-white/70"}`}>
            {label}<span className={`rounded-full px-2 text-xs ${tab === k ? "bg-black/80 text-accent" : "bg-white/10"}`}>{n}</span>
          </button>))}
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setRange(k)} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${range === k ? "border-accent bg-accent text-black" : "border-white/15 text-white/70"}`}>{label}</button>))}
      </div>
      <div className="mt-5 space-y-4">
        {shown.map((it) => it.type === "multi" ? (
          <div key={it.id} className="rounded-2xl border border-white/10 bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Multi · {it.legs.length} legs</p>
              {badge(it.status)}
            </div>
            <p className="mt-1 text-xs text-white/50">Combined odds {it.combined.toFixed(2)} · {when(it.at)}</p>
            <div className="mt-3 space-y-2">
              {it.legs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl bg-black/30 p-2">
                  <Crest url={l.homeCrest} label={l.home} /><Crest url={l.awayCrest} label={l.away} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-white">{l.home} vs {l.away}</p>
                    <p className="text-[11px] text-accent">{LABEL[l.selection]} @ {l.odds.toFixed(2)}</p>
                  </div>
                  <span className="text-[11px] text-white/50">{l.status}</span>
                </div>))}
            </div>
            <p className="mt-3 text-[11px] text-white/50">{it.stake ? `Stake ${it.stake} KICK` : "Recorded, no stake"}{it.grossPayout != null ? ` · returns ${it.grossPayout}` : ""}</p>
          </div>
        ) : (
          <div key={it.id} className="rounded-2xl border border-white/10 bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2"><Crest url={it.homeCrest} label={it.home} /><Crest url={it.awayCrest} label={it.away} /></div>
                <div>
                  <p className="text-sm font-semibold text-white">{it.home} vs {it.away}</p>
                  <p className="text-[11px] text-white/50">{when(it.kickoff)}</p>
                </div>
              </div>
              {badge(it.status)}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">{it.selection === "home" ? <ArrowUp size={16} /> : <ArrowRight size={16} />}</span>
                <div>
                  <p className="text-sm font-semibold text-accent">{it.selection === "draw" ? "Draw" : `${it.selection === "home" ? it.home : it.away} to Win`}</p>
                  <p className="text-[11px] text-white/50">{it.source === "rule" && it.strategy ? `Strategy: ${it.strategy}` : "Recorded call"}</p>
                </div>
              </div>
              <div className="text-right">
                {it.status === "pending" ? (
                  <><p className="text-[11px] text-white/50">Odds</p><p className="text-base font-semibold text-accent">{it.odds.toFixed(2)}</p></>
                ) : (
                  <><p className="flex items-center justify-end gap-1 text-[11px] text-white/50">Result <Trophy size={11} /></p><p className="text-sm font-semibold text-white">{it.finalScore ?? "—"}</p></>
                )}
              </div>
            </div>
          </div>))}
        {!shown.length && <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">No {tab === "open" ? "open" : "settled"} calls{range !== "all" ? " for this range" : ""} yet.</p>}
      </div>
    </div>
  );
}
