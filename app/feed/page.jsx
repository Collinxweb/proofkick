import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import CallCard from "@/components/CallCard";
import SlipTicket from "@/components/social/SlipTicket";
import MarkRead from "@/components/MarkRead";
import { supabaseServer } from "@/lib/supabase/server";
import { CALL_COLS } from "@/lib/calls";
import { loadSlips, loadSocial } from "@/lib/social/data";
import { groupCalls } from "@/lib/social/group";

export const dynamic = "force-dynamic";

const when = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " UTC";
function noteText(n) {
  const p = n.payload ?? {};
  if (n.kind === "call") return `@${p.handle} called ${p.selection} in ${p.match}`;
  if (n.kind === "like") return `@${p.handle} liked your call on ${p.match}`;
  if (n.kind === "comment") return `@${p.handle} commented on your call on ${p.match}`;
  if (n.kind === "follow") return `@${p.handle} started following you`;
  return "Notification";
}

export default async function Feed() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: follows } = await s.from("user_follows").select("followee_id").eq("follower_id", user.id);
  const ids = (follows ?? []).map((f) => f.followee_id);
  let calls = [], names = {}, avatars = {};
  if (ids.length) {
    const [{ data: c }, { data: p }] = await Promise.all([
      s.from("picks").select(CALL_COLS).in("user_id", ids).order("locked_at", { ascending: false }).limit(50),
      s.from("profiles").select("id, handle, avatar_url").in("id", ids),
    ]);
    calls = c ?? [];
    names = Object.fromEntries((p ?? []).map((x) => [x.id, x.handle]));
    avatars = Object.fromEntries((p ?? []).map((x) => [x.id, x.avatar_url]));
  }
  const pickIds = calls.map((c) => c.id);
  const slips = await loadSlips(s, pickIds);
  const social = await loadSocial(s, pickIds, user.id);
  const items = groupCalls({ calls, slips });
  const { data: notes } = await s.from("notifications").select("id, kind, payload, created_at, read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8);
  const unread = (notes ?? []).filter((n) => !n.read_at).length;

  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <Link href="/create"><Logo size={32} /></Link>
      <h1 className="mt-6 text-3xl font-semibold text-white">Feed</h1>
      <p className="mt-1 text-sm text-white/55">New calls from people you follow, newest first.</p>
      <MarkRead unread={unread} />
      {notes?.length > 0 && (
        <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-panel p-3">
          <p className="text-xs uppercase tracking-wider text-white/40">Notifications</p>
          {notes.map((n) => (
            <Link key={n.id} href={n.kind === "follow" ? `/u/${n.payload?.handle}` : `/p/${n.payload?.pickId}`} className={`block text-sm ${n.read_at ? "text-white/50" : "text-white"}`}>
              {noteText(n)}<span className="block text-[11px] text-white/40">{when(n.created_at)}</span>
            </Link>))}
        </div>)}
      <div className="mt-5 space-y-3">
        {items.map((it) => it.type === "slip"
          ? <SlipTicket key={`s${it.slip.id}`} slip={it.slip} legs={it.legs} owner={names[it.legs[0].user_id]} ownerAvatar={avatars[it.legs[0].user_id]} social={social} />
          : <CallCard key={it.c.id} c={it.c} owner={names[it.c.user_id]} ownerAvatar={avatars[it.c.user_id]} social={social} />)}
        {!items.length && (
          <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">
            {ids.length ? "The people you follow haven't posted a call yet." : "You aren't following anyone yet."}
            <Link href="/browse" className="mt-3 block text-accent underline">Find callers to follow</Link>
          </div>)}
      </div>
      <BottomNav />
    </main>
  );
}
