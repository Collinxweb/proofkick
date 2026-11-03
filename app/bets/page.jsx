import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import CallCard from "@/components/CallCard";
import SlipTicket from "@/components/social/SlipTicket";
import { supabaseServer } from "@/lib/supabase/server";
import { CALL_COLS, summarize } from "@/lib/calls";
import { loadSlips, loadSocial } from "@/lib/social/data";
import { groupCalls } from "@/lib/social/group";

export const dynamic = "force-dynamic";
const pct = (n) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

export default async function MyCalls() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: calls } = await s.from("picks").select(CALL_COLS).eq("user_id", user.id).order("locked_at", { ascending: false }).limit(100);
  const pickIds = (calls ?? []).map((c) => c.id);
  const slips = await loadSlips(s, pickIds);
  const social = await loadSocial(s, pickIds, user.id);
  const items = groupCalls({ calls: calls ?? [], slips });
  const sum = summarize(calls ?? []);
  const tiles = [["Call hit rate", pct(sum.hit)], ["Graded", `${sum.graded}`], ["Pending", `${sum.pending}`], ["Avg CLV", sum.clv == null ? "—" : `${sum.clv >= 0 ? "+" : ""}${(sum.clv * 100).toFixed(1)}%`]];
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <Link href="/create"><Logo size={32} /></Link>
      <h1 className="mt-6 text-3xl font-semibold text-white">My calls</h1>
      <p className="mt-1 text-sm text-white/55">Single calls and multis, each shown once. A multi is one ticket and is graded as one.</p>
      <div className="mt-4 grid grid-cols-4 gap-2">{tiles.map(([k, v]) => <div key={k} className="rounded-xl border border-white/10 bg-panel p-3 text-center"><p className="text-[10px] text-white/50">{k}</p><p className="text-sm font-semibold text-white">{v}</p></div>)}</div>
      <div className="mt-5 space-y-3">
        {items.map((it) => it.type === "slip"
          ? <SlipTicket key={`s${it.slip.id}`} slip={it.slip} legs={it.legs} social={social} />
          : <CallCard key={it.c.id} c={it.c} mine social={social} />)}
        {!items.length && <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">No calls yet. <Link href="/create" className="text-accent underline">Make your first call</Link>.</p>}
      </div>
      <BottomNav />
    </main>
  );
}
