import Link from "next/link";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";

export default function Soon({ title, children }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
      <Link href="/dashboard"><Logo size={32} /></Link>
      <h1 className="mt-10 text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-white/55">Coming in the next update.</p>
      {children}
      <BottomNav />
    </main>
  );
}
