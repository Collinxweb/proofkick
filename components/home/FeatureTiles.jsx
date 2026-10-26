import { HOME_FEATURES } from "./mockData";

export default function FeatureTiles() {
  return (
    <section className="mx-auto grid max-w-6xl gap-3 px-4 pb-8 sm:grid-cols-3">
      {HOME_FEATURES.map((t) => (
        <div key={t.title} className="rounded-2xl border border-white/10 bg-panel p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-base font-bold text-accent">
            {t.icon}
          </div>
          <h3 className="mt-3 font-bold text-white">{t.title}</h3>
          <p className="mt-1 text-sm text-white/60">{t.sub}</p>
        </div>
      ))}
    </section>
  );
}
