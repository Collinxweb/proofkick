import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Plus, ArrowRight, Trophy } from "lucide-react";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import ContactSupport from "@/components/support/ContactSupport";
import DocsLink from "@/components/support/DocsLink";
import CallCard from "@/components/CallCard";
import SlipTicket from "@/components/social/SlipTicket";
import KickFeedItem from "@/components/social/KickFeedItem";
import NotificationBell from "@/components/NotificationBell";
import Avatar from "@/components/Avatar";
import LiveMarketsCard from "@/components/home/LiveMarketsCard";
import Explain from "@/components/Explain";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CALL_COLS } from "@/lib/calls";
import { loadSlips, loadSocial } from "@/lib/social/data";
import { groupCalls } from "@/lib/social/group";
import { loadKickFeed } from "@/lib/social/kicks";
import { kickBalance } from "@/lib/kick/balance";
import { formatKick } from "@/lib/kick/balance-rules";
import { hasClaimed } from "@/lib/kick/claimed";
import { loadRounds, loadMyKicks } from "@/lib/kick/markets/load";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: me } = await s.from("profiles").select("handle, avatar_url, caution_accepted_at, profile_completed_at").eq("id", user.id).single();
  // If the profile cannot be read, show an error instead of redirecting (a redirect loop happened before).
  if (!me) return (<main className="mx-auto min-h-dvh max-w-md px-5 pt-10"><p className="text-white">We could not load your profile. Please refresh.</p></main>);
  if (!me.caution_accepted_at) redirect("/caution");

  // Private columns are read with the admin client only.
  const db = supabaseAdmin();
  const { data: kp } = await db.from("profiles").select("kick_address, sui_address, kick_claimed_at").eq("id", user.id).maybeSingle();
  const kickAddress = kp?.kick_address ?? kp?.sui_address ?? null;
  const walletConnected = Boolean(kp?.sui_address);
  const [kickUnits, rounds, mine] = await Promise.all([
    kickAddress ? kickBalance(kickAddress) : Promise.resolve(null),
    loadRounds(db, Date.now()),
    loadMyKicks(db, user.id),
  ]);
  const claimed = hasClaimed(kp, kickUnits);
  const { count: unread } = await s.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);

  // Feed: calls and kicks from people you follow, or from everyone if you follow nobody yet.
  const { data: follows } = await s.from("user_follows").select("followee_id").eq("follower_id", user.id);
  const ids = (follows ?? []).map((f) => f.followee_id);
  let q = s.from("picks").select(CALL_COLS).order("locked_at", { ascending: false }).limit(10);
  if (ids.length) q = q.in("user_id", ids);
  const { data: calls } = await q;
  const uids = [...new Set((calls ?? []).map((c) => c.user_id))];
  const { data: profs } = uids.length ? await db.from("profiles").select("id, handle, avatar_url").in("id", uids) : { data: [] };
  const names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.handle]));
  const avatars = Object.fromEntries((profs ?? []).map((p) => [p.id, p.avatar_url]));
  const callIds = (calls ?? []).map((c) => c.id);
  const slips = await loadSlips(s, callIds);
  const social = await loadSocial(s, callIds, user.id);
  const kickFeed = await loadKickFeed(db, ids.length ? ids : null);
  const feed = [...groupCalls({ calls: calls ?? [], slips }), ...kickFeed].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 15);

  // Real settled wins only: nothing is shown unless a settled round paid out.
  const wins = mine.filter((e) => e.status === "won" && e.payout != null).slice(0, 2);
  const balance = formatKick(kickUnits);

  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-4 pb-28 pt-4">
      <header className="flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-1.5">
          <img src="/logo.png" alt="" width={24} height={24} className="shrink-0" />
          <span className="whitespace-nowrap text-base font-bold text-white">Proof<span className="text-accent">Kick</span></span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <Link href="/profile" aria-label="Your profile"><Avatar url={me.avatar_url} name={me.handle} size={26} /></Link>
          <Link href="/kick" className="whitespace-nowrap rounded-full border border-accent/40 px-2 py-0.5 text-[10px] font-semibold text-white">{balance ?? "—"} KICK</Link>
          <NotificationBell userId={user.id} initial={unread ?? 0} />
          <Link href="/settings" aria-label="Settings" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/80"><Settings size={13} /></Link>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-white/10 bg-panel px-3 py-1.5 text-[11px]">
        <span className="flex items-center gap-1 text-white"><span className={`h-1.5 w-1.5 rounded-full ${walletConnected ? "bg-accent" : "bg-white/30"}`} />{walletConnected ? "Wallet connected" : "No wallet connected"}</span>
        <span className="text-white/20">|</span>
        <span className="text-white/70">Testnet balance: <span className="font-semibold text-accent">{balance ? `${balance} KICK` : "—"}</span></span>
        {!claimed && <Link href="/kick/claim" className="ml-auto font-semibold text-accent underline">Get testnet KICK</Link>}
        <Explain text="Testnet KICK is play money with no real value. It is used only in Kick markets on testnet." />
      </div>

      <section className="mt-5">
        <h1 className="text-[clamp(28px,8.5vw,38px)] font-semibold leading-[1.05] text-white">Your market.<br /><span className="text-accent">Your call.</span></h1>
        <p className="mt-2 text-sm text-white/55">Make calls people can verify. Kick with play money.</p>
        <Link href="/create" className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black"><Plus size={16} />Make a call</Link>
      </section>

      <section className="mt-5"><LiveMarketsCard rounds={rounds} /></section>

      {wins.length > 0 && (
        <section className="mt-5 space-y-2">
          {wins.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-2xl border border-accent/40 bg-panel p-3">
              <div className="flex items-center gap-3">
                <Trophy size={18} className="text-accent" />
                <div>
                  <p className="text-sm font-semibold text-white">Market settled: {w.asset} {w.horizon}</p>
                  <p className="text-xs text-white/60">You won this round.</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-accent">+{(w.payout - w.stake).toFixed(2)} KICK</p>
            </div>))}
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{ids.length ? "Your feed" : "Recent activity"}</h2>
          <Link href="/feed" className="flex items-center gap-1 text-xs text-accent">See all <ArrowRight size={12} /></Link>
        </div>
        <div className="mt-3 space-y-3">
          {feed.map((it) => it.type === "kick"
            ? <KickFeedItem key={`k${it.id}`} k={it} />
            : it.type === "slip"
              ? <SlipTicket key={`s${it.slip.id}`} slip={it.slip} legs={it.legs} owner={names[it.legs[0].user_id]} ownerAvatar={avatars[it.legs[0].user_id]} social={social} />
              : <CallCard key={it.c.id} c={it.c} owner={names[it.c.user_id]} ownerAvatar={avatars[it.c.user_id]} social={social} />)}
          {!feed.length && (
            <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-white/55">
              {ids.length ? "The people you follow haven't posted a call or kick yet." : "No activity yet. Make the first call."}
              <Link href="/browse" className="mt-2 block text-accent underline">Find callers to follow</Link>
            </div>)}
        </div>
      </section>

      {!me.profile_completed_at && (
        <Link href="/settings" className="mt-6 block rounded-2xl border border-accent/50 bg-accent/10 p-4 text-sm text-white">
          <span className="font-semibold">Finish your profile</span>
          <span className="mt-1 block text-xs text-white/60">Add your name, date of birth, country and username to start making calls. Tap to open Settings.</span>
        </Link>
      )}
      <div className="mt-6"><DocsLink /></div>
      <div className="mt-6"><ContactSupport /></div>
      <BottomNav />
    </main>
  );
}
