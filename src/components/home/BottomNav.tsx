const ITEM = "flex flex-1 flex-col items-center gap-1 text-[11px] font-medium text-[#9AA7A1]";

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-[#0A0E0C]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2 pb-1">
        <a href="#" className={ITEM}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>
          My Bets
        </a>
        <div className="flex flex-1 flex-col items-center gap-1 text-[11px] font-semibold text-[#2BE07E]">
          <a href="#" aria-label="Create" className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#2BE07E] text-2xl leading-none text-[#0A0E0C] shadow-[0_0_24px_rgba(43,224,126,0.45)]">
            +
          </a>
          Create
        </div>
        <a href="#live" className={ITEM}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          Browse
        </a>
        <a href="#" className={ITEM}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
          Profile
        </a>
      </div>
    </nav>
  );
}
