import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import MarketsList from "@/components/kick/MarketsList";
import RedeemButton from "@/components/kick/RedeemButton";
import Competition from "@/components/kick/Competition";
import Explain from "@/components/Explain";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadRounds, loadMyKicks } from "@/lib/kick/markets/load";
import { kickBalance } from "@/lib/kick/balance";
import { formatKick } from "@/lib/kick/balance-rules";
import { hasClaimed } from "@/lib/kick/claimed";
import { standings } from "@/lib/kick/competition";

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
  const top = standings(allSettled ?? []);
  const topIds = top.map((t) => t.user_id);
  const { data: topProfiles } = topIds.length ? await db.from("profiles").select("id, handle").in("id", topIds) : { data: [] };
  const handles = Object.fromEntries((topProfiles ?? []).map((p) => [p.id, p.handle]));
  const withdrawable = mine.filter((e) => ["settled", "void"].includes(e.roundState) && !e.redeemed && e.status !== "lost");
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-4 pb-28 pt-4">
      <header className="flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-1.5">
          <img src="/logo.png" alt="" width={24} height={24} className="shrink-0" />
          <span className="whitespace-nowrap text-base font-bold text-white">Proof<span className="text-accent">Kick</span></span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <span className="whitespace-nowrap rounded-full border border-accent/40 px-2 py-0.5 text-[10px] font-semibold text-white">K {balance ?? "—"} KICK</span>
        </div>
      </header>

      <section className="mt-5">
        <h1 className="flex items-center gap-2 text-[clamp(26px,8vw,34px)] font-semibold leading-tight text-white">Kick Markets <span className="rounded-full border border-accent/50 px-2 py-0.5 text-[11px] font-medium text-accent">Testnet</span></h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-white/55">24H and weekly rounds · play money <Explain text="Kick markets are games of chance on testnet. You stake play-money KICK on whether the price closes up (GREEN) or down (RED). It is not a real-money market and it is 18+ only." /></p>
      </section>

      <section className="mt-4">
        <div className="mb-3 flex items-center gap-1 text-base font-semibold text-white">Rounds <Explain text="A round opens at its start time, takes kicks until entries close, and settles at expiry from the price. 24H rounds take entries for 6 hours. Weekly rounds take entries for 48 hours." /></div>
        <MarketsList rounds={rounds} canKick={Boolean(kickAddress)} />
        {!user && <p className="mt-3 text-xs text-white/50"><Link href="/" className="text-accent underline">Sign in</Link> to kick.</p>}
        {user && !kickAddress && <p className="mt-3 text-xs text-white/50">Get testnet KICK first, then you can kick. <Link href="/kick/claim" className="text-accent underline">Get testnet KICK</Link></p>}
        {user && kickAddress && !claimed && <p className="mt-3 text-xs text-white/50"><Link href="/kick/claim" className="text-accent underline">Get testnet KICK</Link></p>}
      </section>

      <section className="mt-6"><Competition rows={top} handles={handles} /></section>

      {user && (
        <section className="mt-6">
          <div className="flex items-center gap-1 text-base font-semibold text-white">My kicks <Explain text="Your kicks, with their status. Winners and refunds show a Withdraw button once the round has settled." /></div>
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

      <p className="mt-6 rounded-2xl border border-white/10 bg-panel px-4 py-3 text-xs text-white/60">Testnet · KICK has no real value · 18+ only</p>
      <BottomNav />
    </main>
  );
}
