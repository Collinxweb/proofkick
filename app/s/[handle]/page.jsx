import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import { memwalConfigured, readUser } from "@/lib/proof/memory";
import { fromText, hashOf } from "@/lib/proof/snapshot";
import { hex } from "@/lib/proof/hash";
import { computeRecord } from "@/lib/proof/record";
import { readReceipt } from "@/lib/sui/read";
import ProfileFollow from "@/components/ProfileFollow";
import { credibility, WEIGHTS } from "@/lib/credibility";

export const revalidate = 120;
export const maxDuration = 60;
const LABEL = { home: "Home Win", draw: "Draw", away: "Away Win" };
const pct = (n) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);
const when = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " UTC";

async function chain(objectId) {
  for (const via of ["tatum", "public"]) { try { return await readReceipt(objectId, via); } catch {} }
  return null;
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);

export async function generateMetadata({ params }) {
  return { title: `${params.handle} on ProofKick`, description: "Football picks locked on Walrus and anchored on Sui. Verify every number." };
}

export default async function Statement({ params }) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: prof } = await sb.from("profiles").select("id, handle, avatar_url, bio").eq("handle", params.handle).maybeSingle();
  if (!prof) notFound();
  const { data: index } = await sb.from("picks").select("id, anchor_object_id, anchor_digest, result_anchor_digest, memory_blob_id, selection, odds_taken, locked_at, closing_odds, fixtures(home_team, away_team)").eq("user_id", prof.id);
  const idx = Object.fromEntries((index ?? []).map((r) => [r.id, r]));

  // Numbers come from Walrus (decrypted by the server), not from database columns.
  let blobs = [], walrusError = null;
  if (memwalConfigured()) { try { blobs = await withTimeout(readUser(prof.id, 50), 40000); } catch (e) { walrusError = String(e.message ?? e); } }
  const picks = {};
  for (const b of blobs) {
    const p = fromText(b.text);
    if (!p?.data?.pick_id) continue;
    const e = (picks[p.data.pick_id] ??= {});
    if (p.data.kind === "pick") { e.snap = p.data; e.hash = hex(hashOf(p.data)); } else if (p.data.kind === "result") e.res = p.data;
  }
  const rows = Object.entries(picks).filter(([, e]) => e.snap).map(([id, e]) => ({ id, ...e })).sort((a, b) => new Date(b.snap.locked_at) - new Date(a.snap.locked_at)).slice(0, 30);
  await Promise.all(rows.map(async (r) => {
    const o = idx[r.id]?.anchor_object_id;
    const c = o ? await chain(o) : null;
    r.verified = Boolean(c && c.immutable && c.recordHash === r.hash);
    r.object = o; r.digest = idx[r.id]?.anchor_digest;
  }));

  const pendingProof = (index ?? []).filter((r) => !r.memory_blob_id);
  const asPick = (r) => ({ result: r.res?.result ?? "pending", odds_taken: r.snap.odds_taken, graded_at: r.res?.graded_at });
  const all = computeRecord(rows.map(asPick));
  const manual = computeRecord(rows.filter((r) => r.snap.source === "manual").map(asPick));
  const verifiedAll = rows.length > 0 && rows.every((r) => r.verified);
  const clvs = (index ?? []).filter((r) => r.closing_odds).map((r) => Number(r.odds_taken) / Number(r.closing_odds) - 1);
  const clvAvg = clvs.length ? clvs.reduce((a, b) => a + b, 0) / clvs.length : null;
  // Likes count only if the liker has enough graded calls themselves, so fresh fake accounts add nothing.
  const MIN = Number(process.env.NEXT_PUBLIC_MIN_GRADED ?? 10);
  const { data: likes } = (index ?? []).length ? await sb.from("call_likes").select("user_id, pick_id").in("pick_id", index.map((r) => r.id)) : { data: [] };
  const likerIds = [...new Set((likes ?? []).map((l) => l.user_id))];
  const { data: likerPicks } = likerIds.length ? await sb.from("picks").select("user_id").in("user_id", likerIds).in("status", ["won", "lost"]) : { data: [] };
  const gradedBy = {};
  for (const p of likerPicks ?? []) gradedBy[p.user_id] = (gradedBy[p.user_id] ?? 0) + 1;
  const qualifiedLikes = (likes ?? []).filter((l) => (gradedBy[l.user_id] ?? 0) >= MIN).length;
  const cred = credibility({ wins: all.wins, graded: all.graded, avgClv: clvAvg, clvN: clvs.length, qualifiedLikes, minGraded: MIN });
  const tiles = [["Credibility", cred ? `${cred.score}/100` : all.graded ? `Needs ${MIN} graded` : "—"], ["Hit rate", pct(all.winrate)], ["Streak", all.streak.type ? `${all.streak.n}${all.streak.type}` : "—"],
    ["Calls", `${all.graded} graded / ${all.total}${all.voids ? ` (${all.voids} void)` : ""}`], ["Avg CLV", clvAvg == null ? "—" : `${clvAvg >= 0 ? "+" : ""}${(clvAvg * 100).toFixed(1)}%`]];

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-5">
      <Logo size={32} />
      <div className="mt-8 flex items-center gap-4">
        <Avatar url={prof.avatar_url} name={prof.handle} size={64} />
        <div><h1 className="text-2xl font-semibold text-white">@{prof.handle}</h1>
          {prof.bio && <p className="mt-1 text-sm text-white/70">{prof.bio}</p>}
          <span className={`mt-1 inline-block rounded-full border px-3 py-1 text-xs ${verifiedAll ? "border-accent text-accent" : "border-white/15 text-white/50"}`}>{verifiedAll ? "Verified on Sui" : "Verification pending"}</span></div>
      </div>
      <div className="mt-4"><ProfileFollow userId={prof.id} /></div>
      <div className="mt-4 grid grid-cols-2 gap-3">{tiles.map(([k, v]) => <div key={k} className="rounded-2xl border border-white/10 bg-panel p-4"><p className="text-xs text-white/50">{k}</p><p className="text-xl font-semibold text-white">{v}</p></div>)}</div>
      {manual.total > 0 && <p className="mt-3 text-xs text-white/50">Manual picks: {manual.wins}W {manual.losses}L, {manual.voids} void, win rate {pct(manual.winrate)}. Reported separately from strategy picks.</p>}
      {walrusError && <p className="mt-4 rounded-xl border border-white/10 p-3 text-xs text-white/60">Walrus read is unavailable right now ({walrusError}). Try again shortly.</p>}
      <h2 className="mt-8 text-lg font-semibold text-white">Pick timeline</h2>
      <div className="mt-3 space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-panel p-4">
            <div className="flex justify-between text-[11px] text-white/50"><span>Locked {when(r.snap.locked_at)}</span><span>{r.snap.source === "manual" ? "Manual" : "Strategy"}</span></div>
            <p className="mt-2 font-semibold text-white">{r.snap.fixture.home} vs {r.snap.fixture.away}</p>
            <p className="text-sm text-white/70">{LABEL[r.snap.selection]} at {r.snap.odds_taken} · kick-off {when(r.snap.fixture.kickoff_at)}</p>
            {r.snap.reasoning?.note && <p className="mt-1 text-sm text-white/60">“{r.snap.reasoning.note}”</p>}
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={r.res ? (r.res.result === "won" ? "text-accent" : r.res.result === "lost" ? "text-red-400" : "text-white/60") : "text-white/50"}>
                {r.res ? `${r.res.result.toUpperCase()}${r.res.final ? ` · ${r.res.final.home}-${r.res.final.away}` : ""}` : "Pending"}</span>
              <span className="flex gap-3"><a className="text-white/60 underline" href={`/p/${r.id}`}>Share</a>{r.verified ? <a className="text-accent underline" href={`https://suiscan.xyz/mainnet/object/${r.object}`}>Verified on Sui</a> : <span className="text-white/40">Not anchored</span>}</span>
            </div>
          </div>))}
        {pendingProof.map((r) => (
          <div key={r.id} className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-white/60">
            <p className="font-semibold text-white">{r.fixtures?.home_team} vs {r.fixtures?.away_team}</p>
            <p>{LABEL[r.selection]} at {r.odds_taken} · locked {when(r.locked_at)}</p>
            <p className="mt-1 text-xs">Locked by the database. The Walrus snapshot and Sui receipt are still pending.</p>
          </div>))}
        {!rows.length && !pendingProof.length && !walrusError && <p className="text-sm text-white/50">No locked picks yet.</p>}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-white/35">Credibility (experimental) = {WEIGHTS.record}% hit rate adjusted for sample size, {WEIGHTS.clv}% closing-line value, {WEIGHTS.social}% likes on graded calls from callers with {MIN}+ graded calls of their own ({qualifiedLikes} so far). It describes discipline, not future results.</p>
      <p className="mt-8 text-xs leading-relaxed text-white/40">Each pick is saved to Walrus before kick-off. Its SHA-256 hash is minted into an immutable Sui receipt. “Verified” means the hash of the pick shown here equals the hash on chain. Results come only from the match data source. Voids are never counted as losses.</p>
    </main>
  );
}
