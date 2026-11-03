import Link from "next/link";
import { formatKick } from "@/lib/kick/balance-rules";

// Shows testnet KICK for an account address. Never throws: a missing address or a failed read shows a clear line instead.
export function KickBalanceRow({ address, units }) {
  if (!address) {
    return <Link href="/kick" className="text-xs text-white/60 underline">Claim testnet KICK to see your balance</Link>;
  }
  const shown = formatKick(units);
  return (
    <Link href="/kick" className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-3 py-1.5 text-xs text-white">
      <span className="text-white/60">Testnet balance</span>
      <span className="font-semibold text-accent">{shown ? `${shown} KICK` : "unavailable"}</span>
    </Link>
  );
}

export function KickBalanceCard({ address, units }) {
  const shown = formatKick(units);
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Testnet KICK</p>
        <Link href="/kick" className="text-xs text-accent">Kick markets</Link>
      </div>
      {!address ? (
        <p className="mt-2 text-xs text-white/50">No testnet account yet. Claim on the Kick page to get 10,000 play-money KICK.</p>
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold text-white">{shown ? `${shown} KICK` : "—"}</p>
          <p className="mt-1 text-[11px] text-white/45">{shown ? "Play money on testnet. No real value." : "Balance unavailable right now."}</p>
          <a className="mt-2 block break-all text-[11px] text-accent underline" target="_blank" rel="noreferrer" href={`https://suiscan.xyz/testnet/account/${address}`}>{address}</a>
        </>
      )}
    </div>
  );
}
