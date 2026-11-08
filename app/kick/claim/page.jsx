import { redirect } from "next/navigation";
import Link from "next/link";
import ClaimButton from "@/components/kick/ClaimButton";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { kickBalance } from "@/lib/kick/balance";
import { formatKick } from "@/lib/kick/balance-rules";

export const dynamic = "force-dynamic";

export default async function ClaimKick() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) redirect("/");
  const { data: p } = await supabaseAdmin().from("profiles").select("kick_address, kick_claimed_at").eq("id", user.id).maybeSingle();
  let balance = null;
  if (p?.kick_address) {
    try { balance = formatKick(await kickBalance(p.kick_address)); } catch { balance = null; }
  }
  const hasBalance = balance != null && Number(String(balance).replace(/,/g, "")) > 0;

  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-4 pb-16 pt-6">
      <Link href="/kick" className="text-sm text-white/60">← Kick Markets</Link>
      <h1 className="mt-4 text-2xl font-semibold text-white">Get testnet KICK</h1>
      <p className="mt-2 text-sm text-white/60">KICK is play money on Sui testnet. It has no real value and can't be exchanged. 18+ only.</p>

      <section className="mt-6 rounded-2xl border border-white/10 bg-panel p-4">
        <p className="text-xs text-white/50">Your testnet balance</p>
        <p className="mt-1 text-2xl font-semibold text-white">{balance ?? "—"} <span className="text-sm text-white/60">KICK</span></p>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-panel p-4">
        {hasBalance ? (
          <p className="text-sm text-white/70">You already have testnet KICK. You can start kicking on the markets page.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-white/70">This adds 10,000 testnet KICK to your account. You don't need a wallet.</p>
            <ClaimButton />
          </>
        )}
      </section>

      <p className="mt-6 text-xs text-white/50">Wallet claims are not available right now. Use the button above.</p>
    </main>
  );
}
