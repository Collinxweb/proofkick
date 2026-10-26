"use client";
import { useState } from "react";
import Link from "next/link";
import { Wallet, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import GoogleLogo from "@/components/GoogleLogo";
import { signInWithWallet } from "@/lib/wallet";
import { supabaseBrowser } from "@/lib/supabase/client";

const pill = "flex w-full items-center gap-3 rounded-full border px-3 py-2";

function Row({ icon, title, sub, onClick, primary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${pill} text-left transition disabled:opacity-50 ${primary ? "border-accent/60 bg-gradient-to-r from-accent/10 to-accent/40 shadow-[0_0_30px_-8px_#19d36b]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-base font-semibold text-white">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold text-white">{title}</span><span className="block truncate text-xs text-white/50">{sub}</span></span>
      <ArrowRight size={18} className="mr-1 shrink-0 text-white/60" />
    </button>
  );
}

export default function Onboarding() {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState("menu");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function google() {
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) setMsg(error.message);
  }
  async function wallet() {
    setBusy(true); setMsg("");
    try { await signInWithWallet(); window.location.href = "/caution"; } catch (e) { setMsg(e.message); setBusy(false); }
  }
  async function magic(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setBusy(false);
    if (error) setMsg(error.message); else setMode("sent");
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-between gap-5 overflow-hidden px-5 pb-5 pt-5">
      <div className="pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      <header className="relative flex items-center justify-between">
        <Logo size={34} />
        <span className="text-[11px] text-white/40">Football × Data × Trust</span>
      </header>

      <section className="relative">
        <p className="mb-3 flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/50 [@media(max-height:640px)]:hidden"><span className="h-px w-8 bg-accent" />Welcome to ProofKick</p>
        <h1 className="text-[clamp(30px,9vw,40px)] font-semibold leading-[1.08] text-white">Smarter <span className="text-accent">Football</span><br />Predictions.</h1>
        <p className="mt-3 max-w-[16rem] text-sm text-white/55">Real strategies. Verified records. Built for those who think beyond the hype.</p>
      </section>

      <section className="relative rounded-3xl border border-white/10 bg-panel/90 p-4">
        <div className="mx-auto mb-2 h-px w-8 bg-accent" />
        <h2 className="text-center text-lg font-semibold text-white">Get Started</h2>
        <p className="mb-4 text-center text-xs text-white/50">Choose how you want to sign in</p>
        <div className="space-y-2.5">
          <Row primary icon={<Wallet size={20} />} title="Connect Sui Wallet" sub={busy ? "Waiting for your wallet..." : "Slush and other Sui wallets"} onClick={wallet} disabled={busy} />
          <Row icon={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-white"><GoogleLogo size={20} /></span>} title="Continue with Google" sub="Quick and easy" onClick={google} />
          {mode === "menu" && <Row icon={<Mail size={20} />} title="Continue with Email" sub="Magic link · no password" onClick={() => setMode("email")} />}
          {mode === "email" && (
            <form onSubmit={magic} className={`${pill} border-accent/60 bg-white/[0.04] pr-2`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white"><Mail size={20} /></span>
              <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/35" />
              <button disabled={busy} aria-label="Send magic link" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-black disabled:opacity-50"><ArrowRight size={20} /></button>
            </form>
          )}
          {mode === "sent" && (
            <div className={`${pill} border-accent/60 bg-accent/10`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-black"><Mail size={20} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-white">Check your inbox</span><span className="block truncate text-xs text-white/60">Link sent to {email}</span></span>
            </div>
          )}
        </div>
        {mode !== "menu" && (
          <button onClick={() => { setMode("menu"); setMsg(""); }} className="mx-auto mt-3 flex items-center gap-1 text-xs text-white/50"><ArrowLeft size={12} />{mode === "sent" ? "Use a different email" : "Other options"}</button>
        )}
        {msg && <p className="mt-3 text-center text-xs text-red-400">{msg}</p>}
        <p className="mt-4 text-center text-[11px] leading-snug text-white/40">By continuing, you agree to our <Link className="underline" href="/terms">Terms of Service</Link> and <Link className="underline" href="/privacy">Privacy Policy</Link>.</p>
      </section>
    </main>
  );
}
