import Link from "next/link";
import Avatar from "@/components/Avatar";

const SIDE = { long: "GREEN", short: "RED" };
const fmt = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

// One kick in the feed. Clearly marked as testnet play money.
export default function KickFeedItem({ k }) {
  const status = k.status === "open" ? "Open" : k.status === "won" ? "Won" : k.status === "lost" ? "Lost" : k.status === "refunded" ? "Refunded" : k.status;
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <Link href={`/u/${k.handle}`} className="flex items-center gap-1.5 text-accent"><Avatar url={k.avatar} name={k.handle} size={18} />@{k.handle}</Link>
        <span className="rounded-full border border-accent/40 px-2 py-0.5 text-accent">Kick · testnet</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">Kicked {fmt(k.stake)} KICK {SIDE[k.side]} on {k.asset} {k.horizon}</p>
      <p className="mt-1 text-[11px] text-white/50">{status}{k.payout != null && k.status !== "open" ? ` · paid ${fmt(k.payout)} KICK` : ""} · play money, no real value</p>
      {k.id && <Link href={`/k/${k.id}`} className="mt-2 inline-block text-xs text-white/60 underline">Share</Link>}
    </div>
  );
}
