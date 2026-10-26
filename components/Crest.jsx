"use client";
import { useState } from "react";
import { initialsOf } from "@/lib/crests";

// Team crest with initials fallback: if the badge URL is missing or 404s, show initials.
export default function Crest({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/80" aria-label={name}>
        {initialsOf(name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={36} height={36} loading="lazy" onError={() => setFailed(true)} className="h-9 w-9 shrink-0 object-contain" />
  );
}
