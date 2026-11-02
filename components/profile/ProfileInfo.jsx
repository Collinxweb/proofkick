"use client";
import { useState } from "react";
import { Globe, Mail, CalendarDays, Eye, EyeOff } from "lucide-react";

const mask = (e) => { const [u, d] = String(e).split("@"); return `${u.slice(0, 2)}${"*".repeat(Math.max(2, u.length - 2))}@${d ?? ""}`; };

// Country, email and date of birth. The eye hides the email and date of birth on screen only.
export default function ProfileInfo({ country, email, dob }) {
  const [hidden, setHidden] = useState(false);
  const rows = [
    [Globe, "Country", country ?? "Not set"],
    [Mail, "Email", email ? (hidden ? mask(email) : email) : "Not set"],
    [CalendarDays, "Date of birth", dob ? (hidden ? "••••" : dob) : "Not set"],
  ];
  return (
    <div className="rounded-3xl border border-white/10 bg-panel p-4">
      <div className="flex justify-end">
        <button onClick={() => setHidden(!hidden)} aria-label={hidden ? "Show details" : "Hide details"} className="text-white/50">{hidden ? <EyeOff size={18} /> : <Eye size={18} />}</button>
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
