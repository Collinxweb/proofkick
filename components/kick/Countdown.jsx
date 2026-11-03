"use client";
import { useEffect, useState } from "react";

// Ticks every second. Renders a placeholder until the client clock is ready, so server and client markup match.
export default function Countdown({ toMs, prefix = "" }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now == null) return <span>{prefix}--:--:--</span>;
  const s = Math.max(0, Math.floor((toMs - now) / 1000));
  const p = (x) => String(x).padStart(2, "0");
  return <span>{prefix}{p(Math.floor(s / 3600))}:{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}</span>;
}
