"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Clock } from "lucide-react";

const ROWS = [
  { key: "BTC", name: "BTC", sub: "Bitcoin", tint: "bg-[#f7931a]", letter: "₿" },
  { key: "ETH", name: "ETH", sub: "Ethereum", tint: "bg-[#627eea]", letter: "Ξ" },
  { key: "PAXG", name: "GOLD", sub: "PAXG", tint: "bg-[#d4a72c]", letter: "Au" },
];
const ENTRY_CLOSE_UTC_HOUR = 6; // 24H rounds take kicks for 6 hours from 00:00 UTC

// Next moment entries close: today at 06:00 UTC if still open, otherwise tomorrow.
function nextEntryClose(now) {
  const d = new Date(now);
  let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), ENTRY_CLOSE_UTC_HOUR);
  if (t <= now) t += 864e5;
  return t;
}
const hms = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, "0")).join(":");
};

export default function LiveMarkets() {
  const [prices, setPrices] = useState({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/kick/prices", { cache: "no-store" }).then((r) => r.json()).then((j) => alive && setPrices(j)).catch(() => {});
    load();
    const p = setInterval(load, 60_000);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { alive = false; clearInterval(p); clearInterval(t); };
  }, []);

  const closeIn = hms(nextEntryClose(now) - now);
  const fmt = (n) => (n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 2 }));

  return (
    <div className="rounded-3xl border border-accent/40 bg-gradient-to-b from-accent/[0.08] to-transparent p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Zap size={18} className="text-accent" /><p className="font-semibold text-white">Live KICK markets</p></div>
        <span className="rounded-full border border-accent/50 px-2.5 py-0.5 text-[11px] text-accent">● Live</span>
      </div>
      <div className="mt-3 divide-y divide-white/10">
        {ROWS.map((r) => (
          <div key={r.key} className="flex items-center gap-3 py-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-black ${r.tint}`}>{r.letter}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{r.name} <span className="text-xs font-normal text-white/40">{r.sub}</span></p>
              <p className="text-xs text-white/60">${fmt(prices[r.key]?.price)}</p>
            </div>
            <div className="hidden text-right text-[11px] text-white/50 sm:block">
              <p className="flex items-center justify-end gap-1"><Clock size={11} />{closeIn}</p>
              <p>Entries close 06:00 GMT</p>
            </div>
            <button disabled title="Rounds open soon" className="w-16 rounded-xl border border-accent/30 py-2 text-[11px] font-semibold text-accent/50">GREEN ↑</button>
            <button disabled title="Rounds open soon" className="w-14 rounded-xl border border-red-400/30 py-2 text-[11px] font-semibold text-red-400/50">RED ↓</button>
          </div>))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[11px] text-white/45">Testnet · play money only · first rounds open soon</p>
        <Link href="/kick" className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black">Explore markets →</Link>
      </div>
    </div>
  );
}
