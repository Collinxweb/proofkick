"use client";
import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { supabaseBrowser } from "@/lib/supabase/client";

function Row({ icon, title, sub, onClick, primary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex w-full items-center gap-4 rounded-full border px-5 py-4 text-left transition disabled:opacity-50 ${
        primary ? "border-accent/60 bg-gradient-to-r from-accent/10 to-accent/40 shadow-[0_0_30px_-8px_#19d36b]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl">{icon}</span>
      <span className="flex-1"><span className="block font-semibold text-white">{title}</span><span className="block text-sm text-white/50">{sub}</span></span>
      <span className="text-xl text-white/70">→</span>
    </button>
  );
}

export default function Onboarding() {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState("menu");
  const [msg, setMsg] = useState("");
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function google() {
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) setMsg(error.message);
  }
  async function magic(e) {
    e.preventDefault();
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setMsg(error ? error.message : "Check your inbox for the sign-in link.");
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-md overflow-hidden px-6 pb-10 pt-8">
      <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <header className="flex items-center justify-between">
        <Logo />
        <span className="text-xs text-white/40">Football × Data × Trust</span>
      </header>
      <section className="relative mt-14">
        <p className="mb-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-white/50"><span className="h-px w-8 bg-accent" />Welcome to ProofKick</p>
        <h1 className="text-5xl font-semibold leading-[1.05] text-white">Smarter <span className="text-accent">Football</span> Predictions.</h1>
        <p className="mt-6 max-w-[16rem] text-white/55">Real strategies. Verified records. Built for those who think beyond the hype.</p>
      </section>
      <section className="relative mt-12 rounded-3xl border border-white/10 bg-panel/90 p-5">
        <div className="mx-auto mb-3 h-px w-8 bg-accent" />
        <h2 className="text-center text-xl font-semibold text-white">Get Started</h2>
        <p className="mb-5 text-center text-sm text-white/50">Choose how you want to sign in</p>
        <div className="space-y-3">
          <Row primary icon="💧" title="Connect Sui Wallet" sub="Coming soon · Web3" disabled />
          <Row icon="G" title="Continue with Google" sub="Quick and easy" onClick={google} />
          {mode === "menu" ? (
            <Row icon="✉" title="Continue with Email Magic Link" sub="No password needed" onClick={() => setMode("email")} />
          ) : (
            <form onSubmit={magic} className="flex gap-2">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-5 py-3 text-white outline-none focus:border-accent" />
              <button className="rounded-full bg-accent px-5 font-semibold text-black">Send</button>
            </form>
          )}
        </div>
        {msg && <p className="mt-4 text-center text-sm text-accent">{msg}</p>}
        <p className="mt-6 text-center text-xs text-white/40">
          By continuing, you agree to our <Link className="underline" href="/terms">Terms of Service</Link> and <Link className="underline" href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </main>
  );
}
