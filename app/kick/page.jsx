import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import KickClaim from "@/components/kick/KickClaim";

export const dynamic = "force-dynamic";

// Kick Markets, step 1: claim the testnet play token. Rounds come next.
export default function Kick() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/create"><Logo size={32} /></Link>
      <h1 className="mt-6 text-3xl font-semibold text-white">Kick Markets</h1>
      <p className="mt-1 text-sm text-white/55">An alternative to recording calls: kick with play money on BTC, ETH and gold. Testnet only, no real value.</p>
      <div className="mt-5"><KickClaim /></div>
      <BottomNav />
    </main>
  );
}
