"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

// Bell with a live unread count. Opens /notifications, which marks everything read.
export default function NotificationBell({ userId, initial }) {
  const [n, setN] = useState(initial ?? 0);
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb.channel(`bell-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => setN((x) => x + 1))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [userId]);
  return (
    <Link href="/notifications" aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80">
      <Bell size={18} />
      {n > 0 && <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-[18px] text-black">{n > 9 ? "9+" : n}</span>}
    </Link>
  );
}
