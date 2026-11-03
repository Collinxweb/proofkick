import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import KickClaim from "@/components/kick/KickClaim";
import RoundCard from "@/components/kick/RoundCard";
import RedeemButton from "@/components/kick/RedeemButton";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadRounds, loadMyKicks } from "@/lib/kick/markets/load";

export const dynamic = "force-dynamic";

export default async function Kick() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  const db = supabaseAdmin();
  const [rounds, mine, account] = await Promise.all([
    loadRounds(db, Date.now()),
    user ? loadMyKicks(db, user.id) : Promise.resolve([]),
    user ? db.from("profiles").select("kick_address").eq("id", user.id).maybeSingle().then((r) => r.data) : Promise.resolve(null),
  ]);
  const canKick = Boolean(account?.kick_address);
  const withdrawable = mine.filter((e) => ["settled", "void"].includes(e.roundState) && !e.redeemed && e.status !== "lost");
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <Link href="/create"><Logo size={32} /></Link>
      <h1 className="mt-6 text-3xl font-semibold text-white">Kick Markets</h1>
      <p className="mt-1 text-sm text-white/55">Kick GREEN or RED on BTC, ETH and gold. Testnet play money only, 18+.</p>
      <div className="mt-4"><KickClaim /></div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-white">Rounds</h2>
        {!user && <p className="mt-2 text-xs text-white/50"><Link href="/" className="text-accent underline">Sign in</Link> to kick.</p>}
        {user && !canKick && <p className="mt-2 text-xs text-white/50">Claim testnet KICK above (without a wallet) to start kicking.</p>}
        <div className="mt-3 space-y-3">
          {rounds.map((r) => <RoundCard key={r.id} r={r} canKick={canKick} />)}
          {!rounds.length && <p className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-white/55">No rounds yet. The daily job opens BTC, ETH and gold rounds.</p>}
        </div>
      </section>

      {user && (
        <section className="mt-7">
          <h2 className="text-lg font-semibold text-white">My kicks</h2>
          {withdrawable.length > 0 && <p className="mt-1 text-xs text-accent">{withdrawable.length} round{withdrawable.length > 1 ? "s" : ""} ready to withdraw.</p>}
          <div className="mt-3 space-y-2">
            {mine.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-panel p-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{e.asset} {e.horizon} · {e.side === "long" ? "GREEN" : "RED"} · {e.stake.toLocaleString("en-US")} KICK</p>
                  <p className="text-white/50">{e.status}{e.payout != null ? ` · pays ${e.payout.toFixed(2)}` : ""}{e.redeemed ? " · withdrawn" : ""}</p>
                </div>
                {withdrawable.some((w) => w.id === e.id) && <RedeemButton roundId={e.roundId} />}
              </div>))}
            {!mine.length && <p className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-white/55">You have not kicked yet.</p>}
          </div>
        </section>
      )}
      <BottomNav />
    </main>
  );
}
