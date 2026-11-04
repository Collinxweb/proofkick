"use client";
import { useState } from "react";

// Switches between the football strategy builder and the Kick market strategy builder.
export default function StrategyTabs({ football, kick }) {
  const [tab, setTab] = useState("kick");
  const btn = (k, label) => (
    <button onClick={() => setTab(k)} className={`flex-1 rounded-full py-2 text-sm font-semibold ${tab === k ? "bg-accent text-black" : "text-white/70"}`}>{label}</button>
  );
  return (
    <div>
      <div className="flex rounded-full border border-white/15 p-1">{btn("kick", "Kick markets")}{btn("football", "Football")}</div>
      <div className="mt-5">{tab === "kick" ? kick : football}</div>
    </div>
  );
}
