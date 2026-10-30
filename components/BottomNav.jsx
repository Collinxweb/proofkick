"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rss, Search, Plus, ListChecks, User } from "lucide-react";

const tabs = [
  { href: "/feed", label: "Feed", Icon: Rss },
  { href: "/browse", label: "Browse", Icon: Search },
  { href: "/create", label: "Call", Icon: Plus, main: true },
  { href: "/bets", label: "My Calls", Icon: ListChecks },
  { href: "/profile", label: "Profile", Icon: User },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-1 pb-2 pt-2">
        {tabs.map(({ href, label, Icon, main }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 text-[11px]">
              {main ? (
                <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black shadow-[0_0_24px_-4px_#19d36b]"><Icon size={24} /></span>
              ) : (
                <Icon size={22} className={active ? "text-accent" : "text-white/50"} />
              )}
              <span className={active || main ? "text-accent" : "text-white/50"}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
