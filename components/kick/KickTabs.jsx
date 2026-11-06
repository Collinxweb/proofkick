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
export default function KickTabs({ sections }) {
  const [tab, setTab] = useState("all");
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-accent text-black" : "border border-white/15 text-white/70"}`}>{label}</button>
        ))}
      </div>
      <div className="mt-5 space-y-6">
        {SHOWS[tab].map((key) => (sections[key] ? <div key={key}>{sections[key]}</div> : null))}
      </div>
    </div>
  );
}
