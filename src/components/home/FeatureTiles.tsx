const TILES = [
  { title: "Verified Records", sub: "Real results. No fake claims.", icon: "✓" },
  { title: "Top Analysts", sub: "Follow and learn from experts.", icon: "★" },
  { title: "Strategy Library", sub: "Explore, save and share.", icon: "▤" },
];

export function FeatureTiles() {
  return (
    <section className="mx-auto grid max-w-6xl gap-3 px-4 pb-8 sm:grid-cols-3">
      {TILES.map((t) => (
        <div key={t.title} className="rounded-2xl border border-white/10 bg-[#111816] p-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2BE07E]/15 text-base font-bold text-[#2BE07E]">
            {t.icon}
          </div>
          <h3 className="mt-3 font-bold text-white">{t.title}</h3>
          <p className="mt-1 text-sm text-[#9AA7A1]">{t.sub}</p>
        </div>
      ))}
    </section>
  );
}
