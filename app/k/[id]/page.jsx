import { notFound } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import ShareCard from "@/components/ShareCard";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60;
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://proofkick-one.vercel.app";
const anon = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// Public page for one kick: its card, the Sui timestamps, and the share buttons. Testnet play money, labelled.
export default async function KickPage({ params }) {
  const sb = anon();
  const { data: e } = await sb.from("kick_entries").select("id, user_id, side, stake, status, kick_testnet_tx, kick_digest, kick_rounds(asset, horizon)").eq("id", params.id).maybeSingle();
  if (!e?.kick_rounds) notFound();
  const { data: owner } = await sb.from("profiles").select("handle").eq("id", e.user_id).maybeSingle();
  const r = e.kick_rounds;
  const text = `${r.asset} ${r.horizon} · ${e.side === "long" ? "GREEN" : "RED"} · ${Number(e.stake).toLocaleString("en-US")} KICK (testnet play money) on ProofKick`;
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-16 pt-6">
      <Link href="/"><Logo size={30} /></Link>
      <img src={`/api/card/kick-${e.id}`} alt="Kick card" className="mt-6 w-full rounded-2xl border border-white/10" />
      <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-panel p-4 text-xs text-white/70">
        {e.kick_testnet_tx && <a className="block break-all text-accent underline" target="_blank" rel="noreferrer" href={`https://suiscan.xyz/testnet/tx/${e.kick_testnet_tx}`}>Sui testnet timestamp: {e.kick_testnet_tx}</a>}
        {e.kick_digest && <a className="block break-all text-white/60 underline" target="_blank" rel="noreferrer" href={`https://suiscan.xyz/mainnet/tx/${e.kick_digest}`}>Mainnet receipt: {e.kick_digest}</a>}
        {owner?.handle && <Link href={`/u/${owner.handle}`} className="block text-accent">See the full record of @{owner.handle}</Link>}
      </div>
      <div className="mt-4"><ShareCard imageUrl={`/api/card/kick-${e.id}`} pageUrl={`${site()}/k/${e.id}`} text={text} /></div>
    </main>
  );
}
