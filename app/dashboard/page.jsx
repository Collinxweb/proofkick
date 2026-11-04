import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Plus, ArrowRight, Wallet, Trophy } from "lucide-react";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import CallCard from "@/components/CallCard";
import SlipTicket from "@/components/social/SlipTicket";
import ProfileGate from "@/components/ProfileGate";
import NotificationBell from "@/components/NotificationBell";
import Avatar from "@/components/Avatar";
import LiveMarketsCard from "@/components/home/LiveMarketsCard";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CALL_COLS } from "@/lib/calls";
import { loadSlips, loadSocial } from "@/lib/social/data";
import { groupCalls } from "@/lib/social/group";
import { kickBalance } from "@/lib/kick/balance";
import { formatKick } from "@/lib/kick/balance-rules";
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

  // Private columns are read with the admin client only (the browser client cannot read them).
  const db = supabaseAdmin();
  const { data: kp } = await db.from("profiles").select("kick_address, sui_address").eq("id", user.id).maybeSingle();
  const kickAddress = kp?.kick_address ?? kp?.sui_address ?? null;
  const walletConnected = Boolean(kp?.sui_address);
  const [kickUnits, rounds, mine] = await Promise.all([
    kickAddress ? kickBalance(kickAddress) : Promise.resolve(null),
    loadRounds(db, Date.now()),
    loadMyKicks(db, user.id),
  ]);
  const { count: unread } = await s.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);

  // Feed: people you follow, or recent calls if you follow nobody yet.
  const { data: follows } = await s.from("user_follows").select("followee_id").eq("follower_id", user.id);
  const ids = (follows ?? []).map((f) => f.followee_id);
  let q = s.from("picks").select(CALL_COLS).order("locked_at", { ascending: false }).limit(5);
  if (ids.length) q = q.in("user_id", ids);
  const { data: calls } = await q;
  const uids = [...new Set((calls ?? []).map((c) => c.user_id))];
  const { data: profs } = uids.length ? await db.from("profiles").select("id, handle, avatar_url").in("id", uids) : { data: [] };
  const names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.handle]));
  const avatars = Object.fromEntries((profs ?? []).map((p) => [p.id, p.avatar_url]));
  const callIds = (calls ?? []).map((c) => c.id);
  const slips = await loadSlips(s, callIds);
  const social = await loadSocial(s, callIds, user.id);
  const items = groupCalls({ calls: calls ?? [], slips });

  // Real settled wins only: nothing is shown unless a settled round paid out.
  const wins = mine.filter((e) => e.status === "won" && e.payout != null).slice(0, 2);
  const balance = formatKick(kickUnits);

  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <header className="flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <img src="/logo.png" alt="" width={28} height={28} className="shrink-0" />
          <span className="truncate text-lg font-bold text-white">Proof<span className="text-accent">Kick</span></span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/profile" aria-label="Your profile"><Avatar url={me.avatar_url} name={me.handle} size={30} /></Link>
          <Link href="/kick" className="whitespace-nowrap rounded-full border border-accent/40 px-2.5 py-1 text-[11px] font-semibold text-white">K {balance ?? "—"} KICK</Link>
          <NotificationBell userId={user.id} initial={unread ?? 0} />
          <Link href="/settings" aria-label="Settings" className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/80"><Settings size={15} /></Link>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-white/10 bg-panel px-4 py-2 text-xs">
        <span className="flex items-center gap-1.5 text-white"><span className={`h-2 w-2 rounded-full ${walletConnected ? "bg-accent" : "bg-white/30"}`} />{walletConnected ? "Wallet connected" : "No wallet connected"}</span>
        <span className="text-white/20">|</span>
        <span className="flex items-center gap-1.5 text-white/70"><Wallet size={13} />Testnet balance: <span className="font-semibold text-accent">{balance ? `${balance} KICK` : "—"}</span></span>
      </div>

      <section className="mt-6">
        <h1 className="text-[clamp(30px,9vw,40px)] font-semibold leading-[1.05] text-white">Your market.<br /><span className="text-accent">Your call.</span></h1>
        <p className="mt-3 text-sm text-white/55">Make calls people can verify. Kick with play money.</p>
        <Link href="/create" className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-black"><Plus size={16} />Make a call</Link>
      </section>

      <section className="mt-6"><LiveMarketsCard rounds={rounds} /></section>

      {wins.length > 0 && (
        <section className="mt-6 space-y-2">
          {wins.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-2xl border border-accent/40 bg-panel p-4">
              <div className="flex items-center gap-3">
                <Trophy size={20} className="text-accent" />
                <div>
                  <p className="text-sm font-semibold text-white">Market settled: {w.asset} {w.horizon}</p>
                  <p className="text-xs text-white/60">You won this round.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-accent">WON</p>
                <p className="text-xs text-accent">+{(w.payout - w.stake).toFixed(2)} KICK</p>
              </div>
            </div>))}
        </section>
      )}

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{ids.length ? "Your feed" : "Recent calls"}</h2>
          <Link href="/feed" className="flex items-center gap-1 text-xs text-accent">See all <ArrowRight size={12} /></Link>
        </div>
        <div className="mt-3 space-y-3">
          {items.map((it) => it.type === "slip"
            ? <SlipTicket key={`s${it.slip.id}`} slip={it.slip} legs={it.legs} owner={names[it.legs[0].user_id]} ownerAvatar={avatars[it.legs[0].user_id]} social={social} />
            : <CallCard key={it.c.id} c={it.c} owner={names[it.c.user_id]} ownerAvatar={avatars[it.c.user_id]} social={social} />)}
          {!items.length && (
            <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-white/55">
              {ids.length ? "The people you follow haven't posted a call yet." : "No calls yet. Make the first one."}
              <Link href="/browse" className="mt-2 block text-accent underline">Find callers to follow</Link>
            </div>)}
        </div>
      </section>

      <ProfileGate open={!me.profile_completed_at} userId={user.id} />
      <BottomNav />
    </main>
  );
}
