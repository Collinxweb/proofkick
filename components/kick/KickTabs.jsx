"use client";
import { useState } from "react";

const TABS = [["all", "All"], ["opened", "Opened"], ["settled", "Settled"], ["competition", "Competition"], ["mine", "My Kicks"]];
const SHOWS = {
  all: ["positions", "markets"],
  opened: ["positions", "markets"],
  settled: ["settled"],
  competition: ["competition"],
  mine: ["mine"],
};

// Switches the sections on the Kick page. Every section is rendered on the server; the tabs only choose which to show.
// withdrawCount > 0 shows a notice that opens My Kicks, and a badge on the tab.
export default function KickTabs({ sections, initialTab = "all", withdrawCount = 0 }) {
  const [tab, setTab] = useState(TABS.some(([k]) => k === initialTab) ? initialTab : "all");
  return (
    <div>
      {withdrawCount > 0 && (
        <button onClick={() => setTab("mine")} className="mb-4 flex w-full items-center justify-between rounded-2xl border border-accent bg-accent/10 px-4 py-3 text-left">
          <span className="text-sm text-white">{withdrawCount} kick{withdrawCount > 1 ? "s" : ""} ready to withdraw</span>
          <span className="text-xs font-semibold text-accent">Open My Kicks →</span>
        </button>)}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-accent text-black" : "border border-white/15 text-white/70"}`}>
            {label}
            {k === "mine" && withdrawCount > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] text-black">{withdrawCount}</span>}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-6">
        {SHOWS[tab].map((key) => (sections[key] ? <div key={key}>{sections[key]}</div> : null))}
      </div>
    </div>
  );
}
