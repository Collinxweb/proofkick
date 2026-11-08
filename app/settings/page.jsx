import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import AccountForm from "@/components/settings/AccountForm";
import ThemeToggle from "@/components/ThemeToggle";
import ContactSupport from "@/components/support/ContactSupport";
import DocsLink from "@/components/support/DocsLink";
import ExportButtons from "@/components/settings/ExportButtons";
import FeedbackForm from "@/components/settings/FeedbackForm";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function Settings({ searchParams }) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) redirect("/");
  const { data: p } = await supabaseAdmin().from("profiles").select("handle, bio, full_name, date_of_birth, country, avatar_url, profile_completed_at").eq("id", user.id).single();
  const incomplete = !p?.profile_completed_at;
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-5 pb-28 pt-5">
      <header className="flex items-center justify-between"><Link href="/dashboard" className="flex items-center gap-2"><img src="/logo.png" alt="" width={28} height={28} /><span className="text-lg font-bold text-white">Proof<span className="text-accent">Kick</span></span></Link></header>
      <h1 className="mt-6 text-3xl font-semibold text-white">Your profile</h1>
      <p className="mt-1 text-sm text-white/55">{incomplete ? "Finish these details to start making calls." : "Everything about your account lives here."}</p>
      <div className="mt-5"><AccountForm userId={user.id} initial={{ handle: p?.handle, bio: p?.bio, fullName: p?.full_name, dob: p?.date_of_birth, country: p?.country, avatar: p?.avatar_url }} /></div>
      <div className="mt-6"><ThemeToggle /></div>
      <div className="mt-6"><ExportButtons /></div>
      <div className="mt-6"><FeedbackForm /></div>
      <div className="mt-6"><DocsLink /></div>
      <div className="mt-6"><ContactSupport /></div>
      <BottomNav />
    </main>
  );
}
