import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { supabaseServer } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  await supabaseServer().auth.signOut();
  redirect("/");
}

export default async function Dashboard() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: p } = await s.from("profiles").select("handle, caution_accepted_at").eq("id", user.id).single();
  if (!p?.caution_accepted_at) redirect("/caution");
  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-8">
      <header className="flex items-center justify-between"><Logo size={32} />
        <form action={signOut}><button className="text-sm text-white/50 underline">Sign out</button></form></header>
      <div className="mt-10 rounded-3xl border border-white/10 bg-panel p-6">
        <p className="text-sm text-white/50">Signed in as</p>
        <p className="text-xl font-semibold text-white">@{p.handle}</p>
        <p className="mt-4 text-sm text-white/60">Fixtures, top picks, strategies and booking cards land here next.</p>
      </div>
    </main>
  );
}
