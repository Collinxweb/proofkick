import { redirect } from "next/navigation";
import Soon from "@/components/Soon";
import { supabaseServer } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  await supabaseServer().auth.signOut();
  redirect("/");
}

export default function Profile() {
  return (
    <Soon title="Profile">
      <form action={signOut} className="mt-8">
        <button className="rounded-full border border-white/15 px-6 py-3 text-sm text-white/80">Sign out</button>
      </form>
    </Soon>
  );
}
