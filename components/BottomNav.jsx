"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Search, ListChecks, User } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

const tabs = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/browse", label: "Browse", Icon: Search },
  { href: "/kick", label: "KICK", main: true },
  { href: "/bets", label: "My Calls", Icon: ListChecks },
  { href: "/profile", label: "Profile", Icon: User },
];

export default function BottomNav() {
  const path = usePathname();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const sb = supabaseBrowser();
    let ch;
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null);
      setUnread(count ?? 0);
      ch = sb.channel(`n-${user.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => setUnread((n) => n + 1)).subscribe();
    })();
    return () => { if (ch) sb.removeChannel(ch); };
  }, []);
  useEffect(() => { if (path.startsWith("/feed") || path.startsWith("/dashboard")) setUnread(0); }, [path]);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink/95 backdrop-blur">
      <div className="mx-auto grid max-w-md md:max-w-2xl grid-cols-5 items-end px-1 pb-2 pt-2">
        {tabs.map(({ href, label, Icon, main }) => {
          const active = path.startsWith(href);
          return (
            <Link key={href} href={href} className="relative flex flex-col items-center gap-1 text-[11px]">
              {main ? (
                <span className="-mt-6 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-accent shadow-[0_0_24px_-4px_#19d36b]">
                  <Image src="/logo.png" alt="" width={34} height={34} />
                </span>
              ) : (
                <Icon size={22} className={active ? "text-accent" : "text-white/50"} />
              )}
              <span className={active || main ? "text-accent" : "text-white/50"}>{label}</span>
              {href === "/dashboard" && unread > 0 && <span className="absolute right-4 top-0 h-2.5 w-2.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
