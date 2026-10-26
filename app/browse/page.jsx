import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import LocalTime from "@/components/LocalTime";
import { LEAGUES } from "@/lib/leagues";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const lname = Object.fromEntries(LEAGUES);

export default async function Browse() {
  const { data: fx } = await supabaseServer().from("fixtures").select("*").gt("kickoff_at", new Date().toISOString()).order("kickoff_at").limit(80);
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/dashboard"><Logo size={32} /></Link>
      <h1 className="mt-8 text-3xl font-semibold text-white">Matches</h1>
      <p className="mt-1 text-sm text-white/55">Upcoming fixtures from the top leagues. Odds are the average across European bookmakers and may differ from your bookmaker.</p>
      <div className="mt-5 space-y-3">
        {(fx ?? []).map((f) => (
          <div key={f.id} className="rounded-2xl border border-white/10 bg-panel p-4">
            <div className="flex justify-between text-[11px] text-white/50"><span>{lname[f.league] ?? f.league}</span><LocalTime iso={f.kickoff_at} /></div>
            <p className="mt-2 font-semibold text-white">{f.home_team} <span className="text-white/40">vs</span> {f.away_team}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[["1", f.odds?.home], ["X", f.odds?.draw], ["2", f.odds?.away]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-black/30 py-2"><p className="text-[11px] text-white/40">{k}</p><p className="font-semibold text-white">{v ?? "—"}</p></div>))}
            </div>
          </div>))}
        {!fx?.length && <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">No matches loaded yet. Fixtures refresh once a day.</div>}
      </div>
      <BottomNav />
    </main>
  );
}
