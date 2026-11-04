import Link from "next/link";
import Avatar from "@/components/Avatar";
import LikeButton from "@/components/LikeButton";
import CommentThread from "@/components/social/CommentThread";
import ShareSlip from "@/components/social/ShareSlip";

const LABEL = { home: "Home", draw: "Draw", away: "Away" };
const STATUS = { pending: ["Pending", "text-white/60 border-white/15"], won: ["Won", "text-accent border-accent/50"], lost: ["Lost", "text-red-400 border-red-400/40"], void: ["Void", "text-white/60 border-white/15"] };
const LEG = { pending: "pending", won: "won", lost: "lost", void: "void" };

// One multi as one ticket: all legs, combined odds, the slip result and its stake (if any).
export default function SlipTicket({ slip, legs, owner, ownerAvatar, social }) {
  const anchor = legs[0]?.id; // likes and comments on a multi attach to its first leg
  const combined = legs.reduce((p, l) => p * Number(l.odds_taken), 1);
  const [st, cls] = STATUS[slip.status] ?? STATUS.pending;
  const likes = social?.likes?.[anchor];
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <div className="flex items-center justify-between text-[11px] text-white/50">
        {owner ? <Link href={`/u/${owner}`} className="flex items-center gap-1.5 text-accent"><Avatar url={ownerAvatar} name={owner} size={18} />@{owner}</Link> : <span>Multi</span>}
        <span className={`rounded-full border px-2 py-0.5 ${cls}`}>{st}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">Multi · {legs.length} legs · combined odds {combined.toFixed(2)}</p>
      <div className="mt-2 space-y-1">
        {legs.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate text-white/80">{l.fixtures?.home_team} vs {l.fixtures?.away_team} · {LABEL[l.selection]}</span>
            <span className="shrink-0 text-white/60">{Number(l.odds_taken).toFixed(2)} · {LEG[l.status] ?? l.status}</span>
          </div>))}
      </div>
      <p className="mt-2 text-[11px] text-white/45">
        {slip.stake ? `Stake ${slip.stake}${slip.status === "pending" ? " · pending" : slip.grossPayout != null ? ` · returns ${slip.grossPayout}` : ""}` : "Recorded, no stake"}
      </p>
      <div className="mt-3 flex items-center justify-end">
        <LikeButton pickId={anchor} count={likes?.count ?? 0} liked={likes?.liked ?? false} />
      </div>
      <ShareSlip slipId={slip.id} text={`Multi · ${legs.length} legs · combined ${combined.toFixed(2)} on ProofKick`} />
      <CommentThread pickId={anchor} comments={social?.comments?.[anchor] ?? []} />
    </div>
  );
}
