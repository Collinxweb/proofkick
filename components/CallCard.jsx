import Link from "next/link";
import RetryProof from "@/components/RetryProof";

const LABEL = { home: "Home Win", draw: "Draw", away: "Away Win" };
const STATUS = { pending: ["Pending", "text-white/60 border-white/15"], won: ["Won", "text-accent border-accent/50"], lost: ["Lost", "text-red-400 border-red-400/40"], void: ["Void", "text-white/60 border-white/15"] };
const when = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " UTC";

// One prediction. `owner` shows the caller's name (feed); `mine` shows the retry button when proof is unfinished.
export default function CallCard({ c, owner, mine }) {
  const f = c.fixtures ?? {}, [st, cls] = STATUS[c.status] ?? STATUS.pending;
  const proofDone = c.memory_blob_id && c.anchor_digest;
  const clv = c.closing_odds ? Number(c.odds_taken) / Number(c.closing_odds) - 1 : null;
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <div className="flex items-center justify-between text-[11px] text-white/50">
        {owner ? <Link href={`/u/${owner}`} className="text-accent">@{owner}</Link> : <span>Locked {when(c.locked_at)}</span>}
        <span className={`rounded-full border px-2 py-0.5 ${cls}`}>{st}{c.final_home != null ? ` · ${c.final_home}-${c.final_away}` : ""}</span>
      </div>
      <p className="mt-2 font-semibold text-white">{f.home_team} vs {f.away_team}</p>
      <p className="text-sm text-white/70">{LABEL[c.selection]} at {Number(c.odds_taken).toFixed(2)}{clv != null ? ` · CLV ${clv >= 0 ? "+" : ""}${(clv * 100).toFixed(1)}%` : ""}</p>
      {owner && <p className="text-[11px] text-white/40">Locked {when(c.locked_at)} · kick-off {when(f.kickoff_at)}</p>}
      <div className="mt-3 flex items-center justify-between text-xs">
        {c.anchor_digest ? <a className="text-accent underline" href={`https://suiscan.xyz/mainnet/tx/${c.anchor_digest}`} target="_blank" rel="noreferrer">Sui tx {c.anchor_digest.slice(0, 8)}…</a>
          : mine ? <RetryProof pickId={c.id} /> : <span className="text-white/40">Proof pending</span>}
        <Link href={`/p/${c.id}`} className="text-white/60 underline">Share</Link>
      </div>
      {mine && !proofDone && c.anchor_digest && <div className="mt-2"><RetryProof pickId={c.id} /></div>}
    </div>
  );
}
