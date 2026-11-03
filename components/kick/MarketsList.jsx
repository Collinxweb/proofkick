"use client";
import { useState } from "react";
import RoundCard from "@/components/kick/RoundCard";

const TABS = [["all", "All"], ["crypto", "Crypto"], ["gold", "Gold"]];
const MATCH = { all: () => true, crypto: (r) => r.asset === "BTC" || r.asset === "ETH", gold: (r) => r.asset === "PAXG" };

// Segmented filter over the markets. Filtering is local: no request is made.
export default function MarketsList({ rounds, canKick }) {
  const [tab, setTab] = useState("all");
  const shown = rounds.filter(MATCH[tab]);
  return (
    <div>
      <div className="flex rounded-full border border-white/15 p-1">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-full py-2 text-sm font-semibold ${tab === k ? "bg-accent text-black" : "text-white/70"}`}>{label}</button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {shown.map((r) => <RoundCard key={r.id} r={r} canKick={canKick} />)}
        {!shown.length && <p className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-white/55">No markets in this group right now. Rounds open daily at 00:00 UTC.</p>}
      </div>
    </div>
  );
}
