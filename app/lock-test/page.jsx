"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

// Temporary test page: lock a manual pick, watch the Walrus + Sui steps, then open your statement. Delete once Browse has a Lock button.
export default function LockTest() {
  const [fx, setFx] = useState([]);
  const [log, setLog] = useState([]);
  const [handle, setHandle] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.from("fixtures").select("id, home_team, away_team, kickoff_at, odds").gt("kickoff_at", new Date().toISOString()).order("kickoff_at").limit(12).then(({ data }) => setFx(data ?? []));
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await sb.from("profiles").select("handle").eq("id", user.id).maybeSingle();
      setHandle(data?.handle ?? null);
    });
  }, []);

  async function lock(f, selection) {
    setBusy(true);
    setLog((l) => [`Locking ${f.home_team} vs ${f.away_team} (${selection})... this can take up to a minute`, ...l]);
    try {
      const r = await fetch("/api/picks/lock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fixtureId: f.id, selection, note: "test pick" }) });
      const j = await r.json();
      setLog((l) => [r.ok ? `Locked at ${j.odds}. Snapshot: ${j.proof.snapshot}. Anchor: ${j.proof.anchor}${j.proof.digest ? ` (${j.proof.digest.slice(0, 10)}…)` : ""}` : `Error: ${j.error}`, ...l]);
    } catch (e) { setLog((l) => [`Error: ${e.message}`, ...l]); }
    setBusy(false);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 py-8">
      <h1 className="text-2xl font-semibold text-white">Lock a test pick</h1>
      <p className="mt-1 text-sm text-white/50">Manual pick, locked by the database, saved to Walrus, anchored on Sui. Sign in first.</p>
      {handle && <Link className="mt-2 inline-block text-sm text-accent underline" href={`/s/${handle}`}>Open my statement</Link>}
      <div className="mt-4 space-y-3">
        {fx.map((f) => (
          <div key={f.id} className="rounded-2xl border border-white/10 bg-panel p-3">
            <p className="text-sm font-semibold text-white">{f.home_team} vs {f.away_team}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[["home", "1"], ["draw", "X"], ["away", "2"]].map(([k, l]) => (
                <button key={k} disabled={busy || !f.odds?.[k]} onClick={() => lock(f, k)} className="rounded-xl bg-black/30 py-2 text-sm text-white disabled:opacity-40">{l} · {f.odds?.[k] ?? "—"}</button>))}
            </div>
          </div>))}
      </div>
      <div className="mt-4 space-y-1 text-xs text-white/70">{log.map((x, i) => <p key={i}>{x}</p>)}</div>
    </main>
  );
}
