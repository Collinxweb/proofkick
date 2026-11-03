import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Pencil, MoreHorizontal, ChevronRight, Rocket, Users, Trophy, ShieldCheck, LogOut } from "lucide-react";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import EditProfile from "@/components/EditProfile";
import NotificationBell from "@/components/NotificationBell";
import ProfileInfo from "@/components/profile/ProfileInfo";
import { COUNTRIES } from "@/lib/countries";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function signOut() {
  "use server";
  await supabaseServer().auth.signOut();
  redirect("/");
}

const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);

export default async function Profile() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) redirect("/");
  const db = supabaseAdmin();
  const [{ data: p }, { data: strategies }, { data: followers }, { data: picks }, { count: unread }] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).single(),
    db.from("strategies").select("id, name, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
    db.from("user_follows").select("follower_id").eq("followee_id", user.id),
    db.from("picks").select("status").eq("user_id", user.id),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);

  // Win rate counts settled calls only. Voids and pending calls are excluded, and no figure is shown without a sample.
  const graded = (picks ?? []).filter((x) => x.status === "won" || x.status === "lost");
  const winRate = graded.length ? graded.filter((x) => x.status === "won").length / graded.length : null;
  const country = COUNTRIES.find(([c]) => c === p?.country)?.[1] ?? null;
  const isWalletOnly = user.email?.endsWith("@wallet.proofkick.app");
  const email = isWalletOnly ? null : user.email;
  const stats = [
    [Rocket, String((strategies ?? []).length).padStart(2, "0"), "Published strategies"],
    [Users, String((followers ?? []).length), "Followers"],
    [Trophy, pct(winRate), graded.length ? `Win rate · ${graded.length} settled` : "Win rate"],
  ];

  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <header className="flex items-center justify-between">
        <Logo size={32} />
        <div className="flex items-center gap-2">
          <NotificationBell userId={user.id} initial={unread ?? 0} />
          <Link href="/settings" aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80"><Settings size={18} /></Link>
        </div>
      </header>

      <section className="mt-6 flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar url={p?.avatar_url} name={p?.full_name || p?.handle} size={96} />
          <EditProfile userId={user.id} initial={{ fullName: p?.full_name ?? "", dob: p?.date_of_birth ?? "", country: p?.country ?? "", avatar: p?.avatar_url ?? "" }}>
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-black"><Pencil size={14} /></span>
          </EditProfile>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold text-white">{p?.full_name || "Complete your profile"}</h1>
          <p className="text-sm text-white/50">@{p?.handle}</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-accent/50 px-3 py-1 text-xs text-accent">{(strategies ?? []).length || graded.length ? "Caller" : "New caller"}</span>
        </div>
      </section>

      <div className="mt-4 min-h-[44px] rounded-2xl border border-white/10 bg-panel px-4 py-3 text-sm text-white/70">
        {p?.bio ? p.bio : <span className="text-white/35">Your bio appears here. Add one in Settings.</span>}
      </div>

      <section className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-panel py-4">
        {stats.map(([Icon, v, label]) => (
          <div key={label} className="flex flex-col items-center gap-1 px-2 text-center">
            <Icon size={18} className="text-accent" />
            <p className="text-lg font-semibold text-white">{v}</p>
            <p className="text-[11px] leading-tight text-white/50">{label}</p>
          </div>))}
      </section>

      <section className="mt-5">
        <ProfileInfo country={country} countryCode={p?.country ?? null} email={email} dob={p?.date_of_birth ?? null} />
        <div className="mt-3 flex items-center gap-3">
          <EditProfile userId={user.id} initial={{ fullName: p?.full_name ?? "", dob: p?.date_of_birth ?? "", country: p?.country ?? "", avatar: p?.avatar_url ?? "" }}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-accent px-5 py-3 text-sm font-semibold text-accent">
            <Pencil size={16} />Edit profile
          </EditProfile>
          <Link href="/settings" aria-label="More settings" className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white/70"><MoreHorizontal size={18} /></Link>
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your strategies</h2>
          <Link href="/strategy" className="flex items-center gap-1 text-xs text-accent">Create <ChevronRight size={12} /></Link>
        </div>
        <div className="mt-3 space-y-2">
          {(strategies ?? []).map((s) => (
            <Link key={s.id} href="/strategy" className="flex items-center justify-between rounded-2xl border border-accent/30 bg-panel px-4 py-3">
              <div><p className="text-sm font-semibold text-white">{s.name}</p><p className="text-xs text-white/50">Published strategy</p></div>
              <ChevronRight size={16} className="text-white/40" />
            </Link>))}
          {!strategies?.length && <p className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-white/55">No strategies yet.</p>}
        </div>
      </section>

      <section className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-panel px-4 py-4">
        <div className="flex items-center gap-3">
          <ShieldCheck size={22} className="text-accent" />
          <div>
            <p className="text-sm font-semibold text-white">Account &amp; security</p>
            <p className="text-xs text-white/50">
              {p?.sui_address ? "Wallet connected" : "No wallet connected"} · {isWalletOnly ? "Signed in with wallet" : user.email_confirmed_at ? "Email verified" : "Email not verified"}
            </p>
          </div>
        </div>
        <form action={signOut}><button className="flex items-center gap-1 text-sm text-white/60"><LogOut size={14} />Sign out</button></form>
      </section>

      <BottomNav />
    </main>
  );
}
