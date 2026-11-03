import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import KickClaim from "@/components/kick/KickClaim";
import MarketsList from "@/components/kick/MarketsList";
import RedeemButton from "@/components/kick/RedeemButton";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadRounds, loadMyKicks } from "@/lib/kick/markets/load";
import { kickBalance } from "@/lib/kick/balance";
import { formatKick } from "@/lib/kick/balance-rules";

export const dynamic = "force-dynamic";

export default async function Kick() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  const db = supabaseAdmin();
  const account = user ? (await db.from("profiles").select("kick_address").eq("id", user.id).maybeSingle()).data : null;
  const kickAddress = account?.kick_address ?? null;
  const [rounds, mine, units] = await Promise.all([
    loadRounds(db, Date.now()),
    user ? loadMyKicks(db, user.id) : Promise.resolve([]),
    kickAddress ? kickBalance(kickAddress) : Promise.resolve(null),
  ]);
  const balance = formatKick(units);
  const canKick = Boolean(kickAddress);
  const withdrawable = mine.filter((e) => ["settled", "void"].includes(e.roundState) && !e.redeemed && e.status !== "lost");
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <header className="flex items-center justify-between gap-2">
        <Logo size={34} />
        <div className="flex items-center gap-2">
          {kickAddress && <span className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/70">{kickAddress.slice(0, 6)}…{kickAddress.slice(-4)}</span>}
          <span className="rounded-full border border-accent/40 px-3 py-1.5 text-xs font-semibold text-white">{balance ?? "—"} <span className="text-white/60">KICK</span></span>
        </div>
      </header>

      <section className="mt-6">
        <h1 className="text-[clamp(30px,9vw,40px)] font-semibold leading-tight text-white">Kick Markets</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/55">
          24H rounds · Testnet play money
          <span className="rounded-full border border-accent/50 px-2.5 py-0.5 text-[11px] text-accent">Testnet</span>
        </p>
      </section>

      <section className="mt-5">
        <MarketsList rounds={rounds} canKick={canKick} />
        {!user && <p className="mt-3 text-xs text-white/50"><Link href="/" className="text-accent underline">Sign in</Link> to kick.</p>}
        {user && !canKick && <p className="mt-3 text-xs text-white/50">Claim testnet KICK below to start kicking.</p>}
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

      <section className="mt-7"><KickClaim /></section>

      <p className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-panel px-4 py-3 text-xs text-white/60">
        <span>Testnet · KICK has no real value · 18+ only</span>
      </p>
      <BottomNav />
    </main>
  );
}
