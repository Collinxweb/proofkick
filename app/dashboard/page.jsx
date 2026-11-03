import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import CallCard from "@/components/CallCard";
import ProfileGate from "@/components/ProfileGate";
import LiveMarkets from "@/components/kick/LiveMarkets";
import NotificationBell from "@/components/NotificationBell";
import Avatar from "@/components/Avatar";
import MarkRead from "@/components/MarkRead";
import { supabaseServer } from "@/lib/supabase/server";
import { CALL_COLS } from "@/lib/calls";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: me } = await s.from("profiles").select("handle, avatar_url, caution_accepted_at, profile_completed_at").eq("id", user.id).single();
  if (!me?.caution_accepted_at) redirect("/caution");

  const { data: follows } = await s.from("user_follows").select("followee_id").eq("follower_id", user.id);
  const ids = (follows ?? []).map((f) => f.followee_id);
  let q = s.from("picks").select(CALL_COLS).order("locked_at", { ascending: false }).limit(5);
  if (ids.length) q = q.in("user_id", ids);
  const { data: calls } = await q;
  const uids = [...new Set((calls ?? []).map((c) => c.user_id))];
  const { data: profs } = uids.length ? await s.from("profiles").select("id, handle, avatar_url").in("id", uids) : { data: [] };
  const names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.handle]));
  const avatars = Object.fromEntries((profs ?? []).map((p) => [p.id, p.avatar_url]));
  const { count: unread } = await s.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);

  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <header className="flex items-center justify-between">
        <Logo size={32} />
        <div className="flex items-center gap-2">
          <Link href="/profile" className="flex items-center gap-1.5 rounded-full border border-white/15 py-1 pl-1 pr-3 text-xs text-white"><Avatar url={me.avatar_url} name={me.handle} size={20} />@{me.handle}</Link>
          <Link href="/kick" className="rounded-full border border-accent/50 px-3 py-1.5 text-xs font-semibold text-accent">KICK</Link>
          <NotificationBell userId={user.id} initial={unread ?? 0} />
        </div>
      </header>

      <section className="mt-7">
        <h1 className="text-[clamp(30px,9vw,40px)] font-semibold leading-[1.05] text-white">Your market.<br /><span className="text-accent">Your call.</span></h1>
        <p className="mt-3 text-sm text-white/55">Make calls people can verify. Kick testnet rounds with play money.</p>
        <Link href="/create" className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black"><Plus size={16} />Make a call</Link>
      </section>

      <section className="mt-6"><LiveMarkets /></section>

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{ids.length ? "Your feed" : "Recent calls"}</h2>
          <Link href="/feed" className="flex items-center gap-1 text-xs text-accent">See all <ArrowRight size={12} /></Link>
        </div>
        <div className="mt-3 space-y-3">
          {(calls ?? []).map((c) => <CallCard key={c.id} c={c} owner={names[c.user_id]} ownerAvatar={avatars[c.user_id]} />)}
          {!calls?.length && (
            <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-white/55">
              {ids.length ? "The people you follow haven't posted a call yet." : "No calls yet. Make the first one."}
              <Link href="/browse" className="mt-2 block text-accent underline">Find callers to follow</Link>
            </div>)}
        </div>
      </section>

      <MarkRead unread={unread ?? 0} />
      <ProfileGate open={!me.profile_completed_at} userId={user.id} />
      <BottomNav />
    </main>
  );
}
