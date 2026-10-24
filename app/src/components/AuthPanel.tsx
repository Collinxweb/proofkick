"use client";
// Auth buttons. Google OAuth + email magic link go through Supabase auth.
// Sui wallet connect is a stub: it reads a wallet-standard provider if present and
// links the address to the signed-in profile. Without NEXT_PUBLIC_SUI_* keys it only
// shows the connect state; no network calls are made.
import { useState } from "react";
import { supabaseBrowser, hasSupabase } from "../lib/supabase/clients";

const origin = () => (typeof window !== "undefined" ? window.location.origin : "");

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const live = hasSupabase();

  async function google() {
    if (!live) return setMsg("supabase not configured (mock mode)");
    await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin()}/auth/callback` },
    });
  }

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    if (!live) return setMsg("supabase not configured (mock mode)");
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin()}/auth/callback` },
    });
    setMsg(error ? error.message : "check your email for the magic link");
  }

  async function connectSui() {
    const w = (globalThis as any).window?.suiWallet ?? null;
    if (!w?.connect) {
      setMsg("no sui wallet detected (install a wallet-standard wallet)");
      return;
    }
    try {
      const res = await w.connect();
      setWallet(res?.accounts?.[0]?.address ?? null);
      // TODO(keys): sign a nonce and POST to /api/auth/sui to link profiles.sui_address.
    } catch (err) {
      setMsg(String(err));
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <button onClick={connectSui} className="w-full rounded bg-sky-600 px-3 py-2 text-sm font-medium">
        {wallet ? `sui: ${wallet.slice(0, 8)}...` : "connect sui wallet"}
      </button>
      <button onClick={google} className="w-full rounded border border-zinc-700 px-3 py-2 text-sm">
        continue with google
      </button>
      <form onSubmit={magic} className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="you@email.com"
          className="flex-1 rounded border border-zinc-700 bg-transparent px-2 py-2 text-sm"
        />
        <button className="rounded border border-zinc-700 px-3 text-sm">magic link</button>
      </form>
      {msg && <p className="text-xs text-zinc-400">{msg}</p>}
    </div>
  );
}
