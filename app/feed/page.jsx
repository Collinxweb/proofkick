import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import CallCard from "@/components/CallCard";
import { supabaseServer } from "@/lib/supabase/server";
import { CALL_COLS } from "@/lib/calls";

export const dynamic = "force-dynamic";

export default async function Feed() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: follows } = await s.from("user_follows").select("followee_id").eq("follower_id", user.id);
  const ids = (follows ?? []).map((f) => f.followee_id);
  let calls = [], names = {};
  if (ids.length) {
    const [{ data: c }, { data: p }] = await Promise.all([
      s.from("picks").select(CALL_COLS).in("user_id", ids).order("locked_at", { ascending: false }).limit(50),
      s.from("profiles").select("id, handle").in("id", ids),
    ]);
    calls = c ?? []; names = Object.fromEntries((p ?? []).map((x) => [x.id, x.handle]));
  }
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/create"><Logo size={32} /></Link>
      <h1 className="mt-6 text-3xl font-semibold text-white">Feed</h1>
      <p className="mt-1 text-sm text-white/55">New calls from people you follow, newest first.</p>
      <div className="mt-5 space-y-3">
        {calls.map((c) => <CallCard key={c.id} c={c} owner={names[c.user_id]} />)}
        {!calls.length && (
          <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">
            {ids.length ? "The people you follow haven't posted a call yet." : "You aren't following anyone yet."}
            <Link href="/browse" className="mt-3 block text-accent underline">Find callers to follow</Link>
          </div>)}
      </div>
      <BottomNav />
    </main>
  );
}
