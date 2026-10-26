import Link from "next/link";
import Logo from "@/components/Logo";
export default function Legal({ title, updated, sections }) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <Link href="/"><Logo size={32} /></Link>
      <h1 className="mt-10 text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-1 text-sm text-white/40">Last updated {updated}</p>
      {sections.map(([h, ...ps]) => (
        <section key={h} className="mt-8"><h2 className="text-lg font-semibold text-accent">{h}</h2>
          {ps.map((t) => <p key={t} className="mt-2 text-sm leading-relaxed text-white/70">{t}</p>)}</section>
      ))}
    </main>
  );
}
