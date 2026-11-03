"use client";
import { useState } from "react";
import { Globe, Mail, CalendarDays, Eye, EyeOff } from "lucide-react";
import { flagEmoji, coverYear } from "@/lib/flags";

const mask = (e) => { const [u, d] = String(e).split("@"); return `${u.slice(0, 2)}${"*".repeat(Math.max(2, u.length - 2))}@${d ?? ""}`; };

// The year of birth is always covered. The eye reveals the full date of birth and the full email on this screen only.
export default function ProfileInfo({ country, countryCode, email, dob }) {
  const [revealed, setRevealed] = useState(false);
  const rows = [
    [Globe, "Country", country ? `${flagEmoji(countryCode)} ${country}` : "Not set"],
    [Mail, "Email", email ? (revealed ? email : mask(email)) : "Not set"],
    [CalendarDays, "Date of birth", revealed && dob ? dob : coverYear(dob)],
  ];
  return (
    <div className="rounded-3xl border border-white/10 bg-panel p-4">
      <div className="flex justify-end">
        <button onClick={() => setRevealed(!revealed)} aria-label={revealed ? "Hide details" : "Show details"} className="text-white/50">{revealed ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
      <div className="divide-y divide-white/10">
        {rows.map(([Icon, k, v]) => (
          <div key={k} className="flex items-center gap-3 py-3">
            <Icon size={18} className="shrink-0 text-white/50" />
            <span className="text-sm text-white/50">{k}</span>
            <span className="ml-auto truncate text-right text-sm text-white">{v}</span>
          </div>))}
      </div>
    </div>
  );
}
