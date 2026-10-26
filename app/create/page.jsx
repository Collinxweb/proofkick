import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import StrategyBuilder from "@/components/StrategyBuilder";

export default function Create() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/dashboard"><Logo size={32} /></Link>
      <h1 className="mt-8 text-3xl font-semibold text-white">Create Strategy</h1>
      <p className="mt-1 text-white/55">Build rules once. ProofKick applies them to every match.</p>
      <StrategyBuilder />
      <BottomNav />
    </main>
  );
}
