"use client";
import { useEffect, useState } from "react";

// Dark is the default. Light is opt-in and remembered on this device.
export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  useEffect(() => { setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"); }, []);
  function choose(t) {
    setTheme(t);
    if (t === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("pk-theme", t); } catch {}
  }
  const btn = (t, label) => (
    <button onClick={() => choose(t)} className={`flex-1 rounded-full border px-4 py-2 text-sm ${theme === t ? "border-accent bg-accent/15 text-accent" : "border-white/15 text-white/70"}`}>{label}</button>
  );
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-panel p-4">
      <p className="text-sm font-semibold text-white">Appearance</p>
      <p className="mt-1 text-xs text-white/50">Dark is the default.</p>
      <div className="mt-3 flex gap-2">{btn("dark", "Dark")}{btn("light", "Light")}</div>
    </div>
  );
}
