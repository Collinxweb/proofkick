import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Logo from "@/components/Logo";
import ShareCard from "@/components/ShareCard";

export const revalidate = 60;
const LABEL = { home: "Home", draw: "Draw", away: "Away" };
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://proofkick-one.vercel.app";
const anon = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// Public page for one multi, shared exactly like a single call: the card image, download, and the share buttons.
export default async function Ticket({ params }) {
  const sb = anon();
  const { data: slip } = await sb.from("slips").select("id, kind, stake, status, gross_payout").eq("id", params.id).maybeSingle();
  if (!slip || slip.kind !== "multi") notFound();
  const { data: legs } = await sb.from("slip_legs").select("position, picks(selection, odds_taken, status, user_id, fixtures(home_team, away_team))").eq("slip_id", slip.id).order("position");
  const ownerId = legs?.[0]?.picks?.user_id;
  const { data: owner } = ownerId ? await sb.from("profiles").select("handle").eq("id", ownerId).maybeSingle() : { data: null };
  const combined = (legs ?? []).reduce((p, l) => p * Number(l.picks?.odds_taken ?? 1), 1);
  const text = `Multi · ${legs?.length ?? 0} legs · combined ${combined.toFixed(2)} on ProofKick`;
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-16 pt-6">
      <Link href="/"><Logo size={30} /></Link>
      <img src={`/api/card/slip-${slip.id}`} alt="Multi prediction card" className="mt-6 w-full rounded-2xl border border-white/10" />
      <div className="mt-4 rounded-2xl border border-white/10 bg-panel p-4 text-xs text-white/70">
        {(legs ?? []).map((l) => (
          <div key={l.position} className="flex justify-between gap-2 py-1">
            <span className="min-w-0 truncate">{l.picks?.fixtures?.home_team} vs {l.picks?.fixtures?.away_team} · {LABEL[l.picks?.selection]}</span>
            <span className="shrink-0">{Number(l.picks?.odds_taken).toFixed(2)} · {l.picks?.status}</span>
          </div>))}
        {owner?.handle && <Link href={`/u/${owner.handle}`} className="mt-2 block text-accent">See the full record of @{owner.handle}</Link>}
      </div>
      <div className="mt-4"><ShareCard imageUrl={`/api/card/slip-${slip.id}`} pageUrl={`${site()}/t/${slip.id}`} text={text} /></div>
    </main>
  );
}
