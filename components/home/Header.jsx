import Logo from "@/components/Logo";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Logo size={28} />
        <div className="flex items-center gap-1">
          <button aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
          <button aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/50 hover:bg-white/5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
          </button>
          <div aria-label="Profile" className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-ink">
            PK
          </div>
        </div>
      </div>
    </header>
  );
}
