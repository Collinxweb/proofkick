import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import MarketsList from "@/components/kick/MarketsList";
import RedeemButton from "@/components/kick/RedeemButton";
import Competition from "@/components/kick/Competition";
import KickHero from "@/components/kick/KickHero";
import PositionCard from "@/components/kick/PositionCard";
import KickTabs from "@/components/kick/KickTabs";
import FixedMarkets from "@/components/kick/FixedMarkets";
import FixedRedeemButton from "@/components/kick/FixedRedeemButton";
import ContactSupport from "@/components/support/ContactSupport";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadRounds, loadMyKicks } from "@/lib/kick/markets/load";
import { kickBalance } from "@/lib/kick/balance";
import { formatKick } from "@/lib/kick/balance-rules";
import { hasClaimed } from "@/lib/kick/claimed";
import { standings } from "@/lib/kick/competition";
import { potentialPayout } from "@/lib/kick/potential";

export const dynamic = "force-dynamic";

export default async function Kick() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  const db = supabaseAdmin();
  const account = user ? (await db.from("profiles").select("kick_address, sui_address, kick_claimed_at").eq("id", user.id).maybeSingle()).data : null;
  const kickAddress = account?.kick_address ?? account?.sui_address ?? null;
  const [rounds, mine, units, { data: allSettled }] = await Promise.all([
    loadRounds(db, Date.now()),
    user ? loadMyKicks(db, user.id) : Promise.resolve([]),
    kickAddress ? kickBalance(kickAddress) : Promise.resolve(null),
    db.from("kick_entries").select("user_id, stake, payout, status").in("status", ["won", "lost", "refunded"]).limit(5000),
  ]);
  const balance = formatKick(units);
  const claimed = hasClaimed(account, units);
  const roundById = Object.fromEntries(rounds.map((r) => [r.id, r]));

  // Open positions: your kicks in rounds that are still open, with the current price and a payout estimate.
  const positions = mine
    .filter((e) => e.status === "open" && roundById[e.roundId]?.state === "open")
    .map((e) => {
      const r = roundById[e.roundId];
      return { ...e, round: r, potential: potentialPayout({ kind: r.kind, side: e.side, stake: e.stake, chanceBps: null, longPool: r.long, shortPool: r.short }) };
    });

  // Hero: real figures only.
  const graded = mine.filter((e) => ["won", "lost", "refunded"].includes(e.status));
  const decided = graded.filter((e) => e.status !== "refunded");
  const wins = decided.filter((e) => e.status === "won").length;
  const winRate = decided.length ? (wins / decided.length) * 100 : null;
  const staked = graded.reduce((a, e) => a + e.stake, 0);
  const net = graded.reduce((a, e) => a + ((e.payout ?? 0) - e.stake), 0);
  const yourReturn = staked ? (net / staked) * 100 : null;

  const top = standings(allSettled ?? []);
  const topIds = top.map((t) => t.user_id);
  const { data: topProfiles } = topIds.length ? await db.from("profiles").select("id, handle").in("id", topIds) : { data: [] };
  const handles = Object.fromEntries((topProfiles ?? []).map((p) => [p.id, p.handle]));
  const withdrawable = mine.filter((e) => {
    const rr = roundById[e.roundId];
    return rr && ["settled", "void"].includes(rr.state) && !e.redeemed && (e.status === "won" || e.status === "refunded");
  });
  const settledRounds = rounds.filter((r) => r.state === "settled" || r.state === "void");

  const sections = {
    positions: positions.length ? (
      <div className="space-y-3">
        <div className="flex items-center justify-between"><p className="text-base font-semibold text-white">Opened positions ({positions.length})</p></div>
        {positions.map((p) => <PositionCard key={p.id} p={p} />)}
      </div>) : null,
    markets: (
      <div className="space-y-3">
        <p className="text-base font-semibold text-white">Markets</p>
        <MarketsList rounds={rounds.filter((r) => r.kind !== "fixed")} canKick={Boolean(kickAddress)} />
        <FixedMarkets rounds={rounds.filter((r) => r.kind === "fixed")} canKick={Boolean(kickAddress)} />
        {!user && <p className="text-xs text-white/50"><Link href="/" className="text-accent underline">Sign in</Link> to kick.</p>}
        {user && !kickAddress && <p className="text-xs text-white/50">Get testnet KICK first, then you can kick. <Link href="/kick/claim" className="text-accent underline">Get testnet KICK</Link></p>}
        {user && kickAddress && !claimed && <p className="text-xs text-white/50"><Link href="/kick/claim" className="text-accent underline">Get testnet KICK</Link></p>}
      </div>),
    settled: (
      <div className="space-y-2">
        <p className="text-base font-semibold text-white">Settled rounds</p>
        {settledRounds.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-panel p-3 text-xs">
            <span className="text-white">{r.asset} · {r.horizon}</span>
            <span className="text-white/60">{r.state === "void" ? "Refunded" : r.outcome === "long" ? "GREEN won" : "RED won"}</span>
          </div>))}
        {!settledRounds.length && <p className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-white/55">No settled rounds yet.</p>}
      </div>),
    competition: (
      <div className="space-y-3">
        <Competition rows={top} handles={handles} />
      </div>),
    mine: (
      <div className="space-y-2">
        <p className="text-base font-semibold text-white">My kicks</p>
        {withdrawable.length > 0 && <p className="text-xs text-accent">{withdrawable.length} round{withdrawable.length > 1 ? "s" : ""} ready to withdraw.</p>}
        {mine.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-panel p-3 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-white">{e.asset} {e.horizon} · {e.side === "long" ? "GREEN" : "RED"} · {e.stake.toLocaleString("en-US")} KICK</p>
              <p className="text-white/50">{e.status}{e.payout != null ? ` · pays ${e.payout.toFixed(2)}` : ""}{e.redeemed ? " · withdrawn" : ""}</p>
            </div>
            {withdrawable.some((w) => w.id === e.id) && (roundById[e.roundId]?.kind === "fixed" ? <FixedRedeemButton entryId={e.id} /> : <RedeemButton roundId={e.roundId} />)}
          </div>))}
        {!mine.length && <p className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-white/55">You have not kicked yet.</p>}
      </div>),
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-4 pb-28 pt-4">
      <header className="flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-1.5">
          <img src="/logo.png" alt="" width={24} height={24} className="shrink-0" />
          <span className="whitespace-nowrap text-base font-bold text-white">Proof<span className="text-accent">Kick</span></span>
        </Link>
        <span className="whitespace-nowrap rounded-full border border-accent/40 px-2.5 py-1 text-[11px] font-semibold text-white">{balance ?? "—"} KICK</span>
      </header>

      <div className="mt-5"><KickHero totalRounds={rounds.length} winRate={winRate} yourReturn={yourReturn} /></div>

      <div className="mt-5"><KickTabs sections={sections} /></div>

      {user && (
        <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-panel p-4">
            <p className="text-sm font-semibold text-white">My Kicks</p>
            <p className="mt-2 text-2xl font-semibold text-white">{balance ?? "—"} <span className="text-sm text-white/60">KICK</span></p>
            <p className="mt-1 text-[11px] text-white/50">Your testnet balance for kicking. Play money.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-panel p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">Play Money Competition <span className="rounded-full border border-accent/50 px-2 py-0.5 text-[10px] text-accent">Testnet</span></p>
            <p className="mt-2 text-xs text-white/55">Coming soon. Rules and any prizes are not set yet.</p>
          </div>
        </section>
      )}

      <p className="mt-6 rounded-2xl border border-white/10 bg-panel px-4 py-3 text-xs text-white/60">Testnet · KICK has no real value · 18+ only</p>
      <div className="mt-4"><ContactSupport /></div>
      <BottomNav />
    </main>
  );
}
