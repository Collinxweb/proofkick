import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import Avatar from "@/components/Avatar";
import EditProfile from "@/components/EditProfile";
import { COUNTRIES } from "@/lib/countries";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function signOut() {
  "use server";
  await supabaseServer().auth.signOut();
  redirect("/");
}

export default async function Profile() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) redirect("/");
  const db = supabaseAdmin(); // private columns are only readable server-side, for the signed-in owner
  const [{ data: p }, { data: mine }] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).single(),
    db.from("strategies").select("id, name, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
  ]);
  const country = COUNTRIES.find(([c]) => c === p?.country)?.[1] ?? "Not set";
  const email = user.email?.endsWith("@wallet.proofkick.app") ? null : user.email;
  const rows = [["Country", country], ["Date of birth", p?.date_of_birth ?? "Not set"], email && ["Email", email],
    p?.sui_address && ["Wallet", `${p.sui_address.slice(0, 8)}…${p.sui_address.slice(-6)}`]].filter(Boolean);
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <Link href="/dashboard"><Logo size={32} /></Link>
      <div className="mt-8 flex items-center gap-4">
        <Avatar url={p?.avatar_url} name={p?.full_name || p?.handle} size={72} />
        <div className="min-w-0"><h1 className="truncate text-2xl font-semibold text-white">{p?.full_name || "Complete your profile"}</h1><p className="text-sm text-white/50">@{p?.handle}</p>{p?.bio && <p className="mt-1 text-sm text-white/70">{p.bio}</p>}</div>
      </div>
      <div className="mt-6 divide-y divide-white/10 rounded-2xl border border-white/10 bg-panel">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-white/50">{k}</span><span className="truncate text-white">{v}</span></div>)}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <EditProfile userId={user.id} initial={{ fullName: p?.full_name ?? "", dob: p?.date_of_birth ?? "", country: p?.country ?? "", avatar: p?.avatar_url ?? "" }} />
        <Link href="/settings" className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/70">Username &amp; bio</Link>
        <form action={signOut}><button className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/70">Sign out</button></form>
      </div>
      <h2 className="mt-8 text-lg font-semibold text-white">Your strategies</h2>
      <div className="mt-3 space-y-2">
        {(mine ?? []).map((s) => <div key={s.id} className="rounded-xl border border-white/10 bg-panel px-4 py-3 text-sm text-white">{s.name}</div>)}
        {!mine?.length && <p className="text-sm text-white/50">None yet. Tap Create to build your first.</p>}
      </div>
      <BottomNav />
    </main>
  );
}
