import Link from "next/link";
import RetryProof from "@/components/RetryProof";
import LikeButton from "@/components/LikeButton";
import CommentThread from "@/components/social/CommentThread";
import Avatar from "@/components/Avatar";

const LABEL = { home: "Home Win", draw: "Draw", away: "Away Win" };
const STATUS = { pending: ["Pending", "text-white/60 border-white/15"], won: ["Won", "text-accent border-accent/50"], lost: ["Lost", "text-red-400 border-red-400/40"], void: ["Void", "text-white/60 border-white/15"] };
const when = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " UTC";

// One call. `social` carries likes and comments for every call on the page. `owner` shows who made it.
export default function CallCard({ c, owner, ownerAvatar, mine, social }) {
  const f = c.fixtures ?? {}, [st, cls] = STATUS[c.status] ?? STATUS.pending;
  const proofDone = c.memory_blob_id && c.anchor_digest;
  const clv = c.closing_odds ? Number(c.odds_taken) / Number(c.closing_odds) - 1 : null;
  const likes = social?.likes?.[c.id];
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <div className="flex items-center justify-between text-[11px] text-white/50">
        {owner ? <Link href={`/u/${owner}`} className="flex items-center gap-1.5 text-accent"><Avatar url={ownerAvatar} name={owner} size={18} />@{owner}</Link> : <span>Locked {when(c.locked_at)}</span>}
        <span className={`rounded-full border px-2 py-0.5 ${cls}`}>{st}{c.final_home != null ? ` · ${c.final_home}-${c.final_away}` : ""}</span>
      </div>
      <p className="mt-2 font-semibold text-white">{f.home_team} vs {f.away_team}</p>
      {c.source === "rule" && <p className="mt-1 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">Strategy triggered{c.reasoning?.strategy ? `: ${c.reasoning.strategy}` : ""}</p>}
      <p className="text-sm text-white/70">{LABEL[c.selection]} at {Number(c.odds_taken).toFixed(2)}{clv != null ? ` · CLV ${clv >= 0 ? "+" : ""}${(clv * 100).toFixed(1)}%` : ""}</p>
      {owner && <p className="text-[11px] text-white/40">Locked {when(c.locked_at)} · kick-off {when(f.kickoff_at)}</p>}
      <div className="mt-3 flex items-center justify-between text-xs">
        {c.anchor_digest ? <a className="text-accent underline" href={`https://suiscan.xyz/mainnet/tx/${c.anchor_digest}`} target="_blank" rel="noreferrer">Sui tx {c.anchor_digest.slice(0, 8)}…</a>
          : mine ? <RetryProof pickId={c.id} /> : <span className="text-white/40">Proof pending</span>}
        <span className="flex items-center gap-3">
          <LikeButton pickId={c.id} count={likes?.count ?? 0} liked={likes?.liked ?? false} />
          <Link href={`/p/${c.id}`} className="text-white/60 underline">Share</Link>
        </span>
      </div>
      <CommentThread pickId={c.id} comments={social?.comments?.[c.id] ?? []} />
    </div>
  );
}
