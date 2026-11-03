import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import MarkRead from "@/components/MarkRead";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const when = (iso) => new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " UTC";

function text(n) {
  const p = n.payload ?? {};
  if (n.kind === "call") return `@${p.handle} called ${p.selection} in ${p.match}`;
  if (n.kind === "like") return `@${p.handle} liked your call on ${p.match}`;
  if (n.kind === "follow") return `@${p.handle} started following you`;
  if (n.kind === "comment") return `@${p.handle} commented on your call on ${p.match}`;
  return "Notification";
}
function target(n) {
  const p = n.payload ?? {};
  if (n.kind === "follow") return p.handle ? `/u/${p.handle}` : "/profile";
  return p.pickId ? `/p/${p.pickId}` : "/feed";
}

export default async function Notifications() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) redirect("/");
  const { data: list } = await supabaseServer().from("notifications").select("id, kind, payload, created_at, read_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  const unread = (list ?? []).filter((n) => !n.read_at).length;
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <Link href="/profile"><Logo size={32} /></Link>
      <div className="mt-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-white">Notifications</h1>
        <span className="text-xs text-white/50">{unread} new</span>
      </div>
      <MarkRead unread={unread} />
      <div className="mt-5 space-y-2">
        {(list ?? []).map((n) => (
          <Link key={n.id} href={target(n)} className={`block rounded-2xl border p-4 text-sm ${n.read_at ? "border-white/10 text-white/60" : "border-accent/40 text-white"}`}>
            <p>{text(n)}</p>
            <p className="mt-1 text-[11px] text-white/40">{when(n.created_at)}</p>
          </Link>))}
        {!list?.length && <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-white/55">No notifications yet. Follows, likes and new calls from people you follow appear here.</p>}
      </div>
      <BottomNav />
    </main>
  );
}
