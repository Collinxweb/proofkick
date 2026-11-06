"use client";
import { useEffect, useState } from "react";

// Private, dismissible. It only reads your own history. Dismissing hides it and changes nothing else.
export default function RecallNote({ fixtureId, homeTeam, awayTeam, selection }) {
  const [note, setNote] = useState(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!["home", "away"].includes(selection)) { setNote(null); return; }
    const q = new URLSearchParams({ fixtureId: fixtureId ?? "", homeTeam, awayTeam, selection });
    let alive = true;
    fetch(`/api/history/recall?${q}`).then((r) => r.json()).then((j) => { if (alive) setNote(j.note ?? null); }).catch(() => {});
    return () => { alive = false; };
  }, [fixtureId, homeTeam, awayTeam, selection]);
  useEffect(() => setHidden(false), [fixtureId, selection]);
  if (!note || hidden) return null;
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/75">
      <div><p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Private · only you can see this</p>{note}</div>
      <button onClick={() => setHidden(true)} aria-label="Dismiss" className="shrink-0 text-white/50">×</button>
    </div>
  );
}
