import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Logo from "@/components/Logo";
import ShareSlip from "@/components/social/ShareSlip";

export const revalidate = 60;
const LABEL = { home: "Home", draw: "Draw", away: "Away" };
const anon = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// Public page for one multi ticket: every leg, the combined odds and the slip result.
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
      <div className="mt-6 rounded-2xl border border-white/10 bg-panel p-4">
        <div className="flex items-center justify-between text-[11px] text-white/50">
          {owner?.handle ? <Link href={`/u/${owner.handle}`} className="text-accent">@{owner.handle}</Link> : <span>Multi</span>}
          <span className="rounded-full border border-white/15 px-2 py-0.5">{slip.status}</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-white">Multi · {legs?.length ?? 0} legs · combined odds {combined.toFixed(2)}</p>
        <div className="mt-2 space-y-1">
          {(legs ?? []).map((l) => (
            <div key={l.position} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-white/80">{l.picks?.fixtures?.home_team} vs {l.picks?.fixtures?.away_team} · {LABEL[l.picks?.selection]}</span>
              <span className="shrink-0 text-white/60">{Number(l.picks?.odds_taken).toFixed(2)} · {l.picks?.status}</span>
            </div>))}
        </div>
        <p className="mt-2 text-[11px] text-white/45">{slip.stake ? `Stake ${slip.stake}` : "Recorded, no stake"}</p>
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">Each leg was locked before kick-off and is graded from the match data. A losing leg loses the multi.</p>
      </div>
      <p className="mt-4 text-center text-[11px] text-white/50">Shared from ProofKick</p>
      <div className="mt-2"><ShareSlip slipId={slip.id} text={text} /></div>
    </main>
  );
}
