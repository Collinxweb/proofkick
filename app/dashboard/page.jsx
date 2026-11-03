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
import { loadSlips, loadSocial } from "@/lib/social/data";
import { groupCalls } from "@/lib/social/group";
import SlipTicket from "@/components/social/SlipTicket";
import { kickBalance } from "@/lib/kick/balance";
import { KickBalanceRow } from "@/components/kick/KickBalance";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: me } = await s.from("profiles").select("handle, avatar_url, caution_accepted_at, profile_completed_at, kick_address, sui_address").eq("id", user.id).single();
  const kickAddress = me?.kick_address ?? me?.sui_address ?? null;
  const kickUnits = kickAddress ? await kickBalance(kickAddress) : null;
  if (!me?.caution_accepted_at) redirect("/caution");

  const { data: follows } = await s.from("user_follows").select("followee_id").eq("follower_id", user.id);
  const ids = (follows ?? []).map((f) => f.followee_id);
  let q = s.from("picks").select(CALL_COLS).order("locked_at", { ascending: false }).limit(5);
  if (ids.length) q = q.in("user_id", ids);
  const { data: calls } = await q;
  const callIds = (calls ?? []).map((c) => c.id);
  const slips = await loadSlips(s, callIds);
  const social = await loadSocial(s, callIds, user.id);
  const items = groupCalls({ calls: calls ?? [], slips });
  const feedIds = items.flatMap((it) => (it.type === "slip" ? [it.legs[0].id] : [it.c.id]));
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
          <Link href="/profile" aria-label="Your profile"><Avatar url={me.avatar_url} name={me.handle} size={36} /></Link>
          <Link href="/kick" className="rounded-full border border-accent/50 px-3 py-1.5 text-xs font-semibold text-accent">KICK</Link>
          <NotificationBell userId={user.id} initial={unread ?? 0} />
        </div>
      </header>

      <div className="mt-4"><KickBalanceRow address={kickAddress} units={kickUnits} /></div>
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
          {items.map((it) => it.type === "slip"
            ? <SlipTicket key={`s${it.slip.id}`} slip={it.slip} legs={it.legs} owner={names[it.legs[0].user_id]} ownerAvatar={avatars[it.legs[0].user_id]} social={social} />
            : <CallCard key={it.c.id} c={it.c} owner={names[it.c.user_id]} ownerAvatar={avatars[it.c.user_id]} social={social} />)}
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
