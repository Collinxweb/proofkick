import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { supabaseServer } from "@/lib/supabase/server";

async function accept() {
  "use server";
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  await s.from("profiles").update({ caution_accepted_at: new Date().toISOString() }).eq("id", user.id);
  redirect("/dashboard");
}

const checks = [
  "I am 18 years old or older. ProofKick is not for anyone under 18.",
  "I understand ProofKick records predictions. It is not a betting service, takes no bets and handles no money.",
  "I understand a good record shows discipline, not guaranteed results. Past calls do not predict future ones.",
];

export default async function Caution() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/");
  const { data: p } = await s.from("profiles").select("caution_accepted_at").eq("id", user.id).single();
  if (p?.caution_accepted_at) redirect("/dashboard");
  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-10">
      <Logo />
      <h1 className="mt-10 text-3xl font-semibold text-white">Before you continue</h1>
      <p className="mt-2 text-white/55">Please read and confirm each point.</p>
      <form action={accept} className="mt-8 space-y-4">
        {checks.map((c) => (
          <label key={c} className="flex gap-3 rounded-2xl border border-white/10 bg-panel p-4 text-sm text-white/80">
            <input type="checkbox" required className="mt-1 h-4 w-4 accent-[#19d36b]" /><span>{c}</span>
          </label>
        ))}
        <button className="w-full rounded-full bg-accent py-4 font-semibold text-black">I understand, continue</button>
      </form>
      <p className="mt-6 text-center text-xs text-white/40">If betting is affecting you, speak to a trusted person or a local support service.</p>
    </main>
  );
}
