import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import CallCard from "@/components/CallCard";
import { supabaseServer } from "@/lib/supabase/server";
import { CALL_COLS, summarize } from "@/lib/calls";

export const dynamic = "force-dynamic";
const pct = (n) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

export default async function MyCalls() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: calls } = await s.from("picks").select(CALL_COLS).eq("user_id", user.id).order("locked_at", { ascending: false }).limit(100);
  const sum = summarize(calls ?? []);
  const tiles = [["Hit rate", pct(sum.hit)], ["Graded", `${sum.graded}`], ["Pending", `${sum.pending}`], ["Avg CLV", sum.clv == null ? "—" : `${sum.clv >= 0 ? "+" : ""}${(sum.clv * 100).toFixed(1)}%`]];
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/create"><Logo size={32} /></Link>
      <h1 className="mt-6 text-3xl font-semibold text-white">My calls</h1>
      <p className="mt-1 text-sm text-white/55">Every call you locked, and how it was graded. Voids are never counted as losses.</p>
      <div className="mt-4 grid grid-cols-4 gap-2">{tiles.map(([k, v]) => <div key={k} className="rounded-xl border border-white/10 bg-panel p-3 text-center"><p className="text-[10px] text-white/50">{k}</p><p className="text-sm font-semibold text-white">{v}</p></div>)}</div>
      <div className="mt-5 space-y-3">
        {(calls ?? []).map((c) => <CallCard key={c.id} c={c} mine />)}
        {!calls?.length && <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">No calls yet. <Link href="/create" className="text-accent underline">Make your first call</Link>.</p>}
      </div>
      <BottomNav />
    </main>
  );
}
