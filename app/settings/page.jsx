import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import SettingsForm from "@/components/SettingsForm";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) redirect("/");
  const { data: p } = await supabaseAdmin().from("profiles").select("handle, bio").eq("id", user.id).single();
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/dashboard"><Logo size={32} /></Link>
      <h1 className="mt-8 text-3xl font-semibold text-white">Profile settings</h1>
      <SettingsForm initial={{ handle: p?.handle, bio: p?.bio }} />
      <BottomNav />
    </main>
  );
}
