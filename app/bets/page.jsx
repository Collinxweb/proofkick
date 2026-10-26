import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import LocalTime from "@/components/LocalTime";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SEL_LABEL } from "@/lib/booking";

export const dynamic = "force-dynamic";

export default async function Bets() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");

  const { data: slips } = await s
    .from("bookings")
    .select("id, operator, code, combined_odds, created_at, mocked, booking_picks(selection, odds, fixture:fixtures(home_team, away_team, kickoff_at, status, home_goals, away_goals))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const OP = { sportybet: { label: "SportyBet", link: "https://www.sportybet.com/ng/sport/football" }, bet9ja: { label: "Bet9ja", link: "https://sports.bet9ja.com/" } };

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/dashboard"><Logo size={32} /></Link>
      <h1 className="mt-8 text-3xl font-semibold text-white">My Bets</h1>
      <p className="mt-1 text-sm text-white/55">Slips you booked from Browse. Booking codes are mock until the bookmaker partnerships are live.</p>

      <div className="mt-5 space-y-3">
        {(slips ?? []).map((b) => {
          const op = OP[b.operator] ?? { label: b.operator, link: "#" };
          const picks = b.booking_picks ?? [];
          return (
            <div key={b.id} className="rounded-2xl border border-accent/40 bg-accent/[0.05] p-4">
              <p className="text-xs text-white/50">Booking code · {op.label} · mock</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-accent">{b.code}</p>
              <p className="mt-1 text-xs text-white/50">
                Combined odds {Number(b.combined_odds).toFixed(2)} · {picks.length} {picks.length === 1 ? "pick" : "picks"} · booked <LocalTime iso={b.created_at} />
              </p>
              <ul className="mt-3 space-y-2">
                {picks.map((p, i) => {
                  const f = p.fixture ?? {};
                  const finished = f.status === "finished";
                  return (
                    <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-black/30 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-white">{f.home_team} v {f.away_team} · {SEL_LABEL[p.selection] ?? p.selection}</span>
                      <span className="shrink-0 text-right">
                        <span className="font-semibold text-accent">{Number(p.odds).toFixed(2)}</span>
                        <span className="block text-[11px] text-white/45">{finished ? `${f.home_goals}-${f.away_goals}` : <LocalTime iso={f.kickoff_at} />}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <a href={op.link} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl bg-accent py-2.5 text-center text-sm font-semibold text-black">Open {op.label}</a>
            </div>
          );
        })}
        {!slips?.length && (
          <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">
            No booked slips yet. Pick matches on Browse and book them to see them here.
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
