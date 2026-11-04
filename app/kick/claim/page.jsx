import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import KickClaim from "@/components/kick/KickClaim";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { kickBalance } from "@/lib/kick/balance";

export const dynamic = "force-dynamic";

// The only place the faucet claim appears. Once an account has claimed, this page says so and nothing offers a claim.
export default async function Claim() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return (<main className="mx-auto min-h-dvh max-w-md px-5 pt-10"><p className="text-white">Sign in to get testnet KICK.</p></main>);
  const { data: kp } = await supabaseAdmin().from("profiles").select("kick_address, sui_address, kick_claimed_at").eq("id", user.id).maybeSingle();
  const address = kp?.kick_address ?? kp?.sui_address ?? null;
  const units = address ? await kickBalance(address) : null;
  const claimed = Boolean(kp?.kick_claimed_at) || (units ?? 0) > 0;
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <Link href="/kick"><Logo size={30} /></Link>
      <h1 className="mt-6 text-3xl font-semibold text-white">Testnet KICK</h1>
      <p className="mt-1 text-sm text-white/55">Play money with no real value, for testnet Kick markets only.</p>
      <div className="mt-5">{claimed ? (
        <div className="rounded-2xl border border-white/10 bg-panel p-4 text-sm text-white/70">You have already claimed your testnet KICK.<Link href="/kick" className="mt-3 block text-accent underline">Back to Kick markets</Link></div>
      ) : <KickClaim />}</div>
      <BottomNav />
    </main>
  );
}
