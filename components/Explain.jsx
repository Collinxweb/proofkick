"use client";
import { useState } from "react";
import { HelpCircle } from "lucide-react";

// A small "?" that shows a plain-language explanation. Use it next to any label people might not understand.
export default function Explain({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={() => setOpen(!open)} aria-label="What does this mean?" className="inline-flex text-white/45"><HelpCircle size={13} /></button>
      {open && <span className="mt-1 max-w-[18rem] rounded-xl border border-white/10 bg-panel p-2 text-[11px] leading-snug text-white/70">{text}</span>}
    </span>
  );
}
