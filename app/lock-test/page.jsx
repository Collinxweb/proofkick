"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

const LABEL = { home: "1", draw: "X", away: "2" };

// Temporary test page. Step 1 locks the pick in the database (instant). Step 2 saves the Walrus snapshot and Sui receipt.
export default function LockTest() {
  const [fx, setFx] = useState([]);
  const [log, setLog] = useState([]);
  const [handle, setHandle] = useState(null);
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);
  const say = (m) => setLog((l) => [m, ...l]);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    const { data } = await sb.from("fixtures").select("id, home_team, away_team, kickoff_at, odds").gt("kickoff_at", new Date().toISOString()).order("kickoff_at").limit(12);
    setFx(data ?? []);
    if (!user) return;
    const { data: p } = await sb.from("profiles").select("handle").eq("id", user.id).maybeSingle();
    setHandle(p?.handle ?? null);
    const { data: m } = await sb.from("picks").select("id, selection, anchor_object_id, memory_blob_id, fixtures(home_team, away_team)").eq("user_id", user.id).or("memory_blob_id.is.null,anchor_object_id.is.null");
    setMine(m ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function prove(pickId) {
    say("Saving to Walrus and anchoring on Sui... up to a minute. Keep this tab open.");
    try {
      const r = await fetch("/api/picks/prove", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pickId }) });
      const j = await r.json();
      say(r.ok ? `Snapshot: ${j.snapshot}. Anchor: ${j.anchor}${j.via ? ` via ${j.via}` : ""}${j.digest ? ` (${j.digest.slice(0, 10)}…)` : ""}${j.error ? ` Error: ${j.error}` : ""}` : `Error: ${j.error}`);
    } catch (e) { say(`Proof request interrupted (${e.message}). Tap Retry below, it is safe to repeat.`); }
  }

  async function lock(f, selection) {
    setBusy(true);
    try {
      const r = await fetch("/api/picks/lock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fixtureId: f.id, selection, note: "test pick" }) });
      const j = await r.json();
      if (!r.ok) say(`Error: ${j.error}`);
      else { say(`Locked ${f.home_team} vs ${f.away_team} (${LABEL[selection]}) at ${j.odds}.`); await prove(j.pickId); }
    } catch (e) { say(`Error: ${e.message}`); }
    setBusy(false);
    load();
  }

  async function retry(id) { setBusy(true); await prove(id); setBusy(false); load(); }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 py-8">
      <h1 className="text-2xl font-semibold text-white">Lock a test pick</h1>
      <p className="mt-1 text-sm text-white/50">Manual pick, locked by the database, then saved to Walrus and anchored on Sui. Sign in first.</p>
      {handle && <Link className="mt-2 inline-block text-sm text-accent underline" href={`/s/${handle}`}>Open my statement</Link>}
      <div className="mt-4 space-y-1 rounded-xl bg-black/30 p-3 text-xs text-white/70">{log.length ? log.map((x, i) => <p key={i}>{x}</p>) : <p>Status messages appear here.</p>}</div>
      {mine.length > 0 && (
        <div className="mt-4 rounded-xl border border-accent/30 p-3">
          <p className="text-sm font-semibold text-white">Locked, proof not finished</p>
          {mine.map((m) => (
            <div key={m.id} className="mt-2 flex items-center justify-between text-xs text-white/70">
              <span>{m.fixtures?.home_team} vs {m.fixtures?.away_team} ({LABEL[m.selection]})</span>
              <button disabled={busy} onClick={() => retry(m.id)} className="rounded-full bg-accent px-3 py-1 text-black disabled:opacity-40">Retry</button>
            </div>))}
        </div>)}
      <div className="mt-4 space-y-3">
        {fx.map((f) => (
          <div key={f.id} className="rounded-2xl border border-white/10 bg-panel p-3">
            <p className="text-sm font-semibold text-white">{f.home_team} vs {f.away_team}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {["home", "draw", "away"].map((k) => (
                <button key={k} disabled={busy || !f.odds?.[k]} onClick={() => lock(f, k)} className="rounded-xl bg-black/30 py-2 text-sm text-white disabled:opacity-40">{LABEL[k]} · {f.odds?.[k] ?? "—"}</button>))}
            </div>
          </div>))}
      </div>
    </main>
  );
}
