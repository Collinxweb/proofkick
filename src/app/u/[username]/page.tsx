import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../lib/supabase/server";
import { computeTrackStats } from "../../../lib/track/stats";
import { formatClv } from "../../../lib/track/clv";

export const dynamic = "force-dynamic";

// Public statement. Reads picks from Supabase. Blob ids and anchor status are shown only when they are
// real values stored on the pick. If the data source is not configured, the page says so as "unverified"
// and shows no numbers.
export default async function StatementPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!/^[a-z0-9_]{3,24}$/.test(username)) notFound();

  const db = supabaseAdmin();
  if (!db) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold">@{username}</h1>
        <p className="mt-4 text-amber-300">unverified: the record source is not connected, so no statement is shown.</p>
      </main>
    );
  }

  const { data: profile } = await db.from("profiles").select("id, username").eq("username", username).maybeSingle();
  if (!profile) notFound();

  const { data: rows } = await db
    .from("picks")
    .select("id, selection, market, odds_at_log, result, settled_at, kickoff_time, reasoning, memwal_blob_id, settlement_blob_id, anchor_status, anchor_digest, closing_odds, clv_pct, strategies!inner(user_id)")
    .eq("strategies.user_id", profile.id)
    .order("logged_at", { ascending: true });
  const picks = rows ?? [];

  const stats = computeTrackStats(
    picks.map((p: any) => ({
      id: p.id,
      selection: p.selection,
      market: p.market,
      oddsAtLog: Number(p.odds_at_log),
      result: p.result,
      settledAt: p.settled_at,
    }))
  );
  const clvVals = picks.map((p: any) => (p.clv_pct === null ? null : Number(p.clv_pct))).filter((v): v is number => v !== null);
  const avgClv = clvVals.length ? clvVals.reduce((a, b) => a + b, 0) / clvVals.length : null;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">@{username}</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {stats.settled} settled · {stats.won}W {stats.lost}L · win rate {stats.winRate === null ? "n/a" : `${(stats.winRate * 100).toFixed(1)}%`} · streak {stats.streak ? `${stats.streak.type}${stats.streak.length}` : "n/a"}
      </p>
      <p className="mt-1 text-sm text-zinc-400">avg clv {formatClv(avgClv)} over {clvVals.length} picks with closing odds</p>
      <ul className="mt-6 space-y-3">
        {picks.map((p: any) => (
          <li key={p.id} className="rounded border border-zinc-800 p-3 text-sm">
            <div>{p.market} · {p.selection} @ {Number(p.odds_at_log).toFixed(2)} · {p.result}</div>
            <div className="text-zinc-400">clv {formatClv(p.clv_pct === null ? null : Number(p.clv_pct))} (close {p.closing_odds ?? "n/a"})</div>
            {p.reasoning ? <div className="text-zinc-400">{p.reasoning}</div> : null}
            <div className="text-xs text-zinc-500">
              {p.memwal_blob_id ? `walrus blob ${p.memwal_blob_id}` : "walrus: unverified (no blob)"}
              {p.anchor_status === "anchored" && p.anchor_digest ? ` · sui tx ${p.anchor_digest}` : " · onchain: not anchored"}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
