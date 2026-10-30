import { redirect } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import { supabaseServer } from "@/lib/supabase/server";
import { summarize } from "@/lib/calls";

export const dynamic = "force-dynamic";
const pct = (n) => (n == null ? "—" : `${(n * 100).toFixed(0)}%`);
const esc = (q) => q.replace(/[\\%_]/g, (m) => `\\${m}`);

export default async function Browse({ searchParams }) {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const q = String(searchParams?.q ?? "").trim().toLowerCase().replace(/^@/, "").slice(0, 20);

  let people = [];
  if (q) {
    const { data } = await s.from("profiles").select("id, handle, avatar_url, bio").ilike("handle", `${esc(q)}%`).limit(20);
    people = data ?? [];
  } else {
    // No search yet: show callers who posted most recently, so there is always someone to follow.
    const { data: recent } = await s.from("picks").select("user_id").not("user_id", "is", null).order("locked_at", { ascending: false }).limit(200);
    const order = [...new Set((recent ?? []).map((r) => r.user_id))].slice(0, 12);
    if (order.length) {
      const { data } = await s.from("profiles").select("id, handle, avatar_url, bio").in("id", order);
      people = order.map((id) => (data ?? []).find((p) => p.id === id)).filter(Boolean);
    }
  }
  people = people.filter((p) => p.id !== user.id);
  const ids = people.map((p) => p.id);
  const [{ data: picks }, { data: mine }] = await Promise.all([
    ids.length ? s.from("picks").select("user_id, status, odds_taken, closing_odds").in("user_id", ids) : { data: [] },
    s.from("user_follows").select("followee_id").eq("follower_id", user.id),
  ]);
  const following = new Set((mine ?? []).map((f) => f.followee_id));

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/create"><Logo size={32} /></Link>
      <h1 className="mt-6 text-3xl font-semibold text-white">Browse</h1>
      <p className="mt-1 text-sm text-white/55">Find callers by username and follow the ones whose record holds up.</p>
      <form className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-panel px-4">
        <Search size={16} className="text-white/40" />
        <input name="q" defaultValue={q} placeholder="Search username" className="w-full bg-transparent py-3 text-sm text-white outline-none" />
      </form>
      <p className="mt-4 text-xs uppercase tracking-wider text-white/40">{q ? `Results for "${q}"` : "Recently active callers"}</p>
      <div className="mt-2 space-y-3">
        {people.map((p) => {
          const r = summarize((picks ?? []).filter((x) => x.user_id === p.id));
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-panel p-4">
              <Link href={`/u/${p.handle}`}><Avatar url={p.avatar_url} name={p.handle} size={44} /></Link>
              <Link href={`/u/${p.handle}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">@{p.handle}</p>
                <p className="truncate text-xs text-white/50">{r.graded ? `${pct(r.hit)} hit rate over ${r.graded} graded` : `${r.total} call${r.total === 1 ? "" : "s"}, none graded yet`}</p>
              </Link>
              <FollowButton userId={p.id} following={following.has(p.id)} />
            </div>);
        })}
        {!people.length && <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">{q ? "No one found with that username." : "No callers yet. Be the first to post a call."}</p>}
      </div>
      <BottomNav />
    </main>
  );
}
