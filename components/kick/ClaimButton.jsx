"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Claims testnet KICK to the account's own testnet address. No wallet needed.
export default function ClaimButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function claim() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/kick/claim/custodial", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `server returned ${r.status}`);
      setMsg({ ok: true, text: "Claimed. Your testnet KICK has been added to your account." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: `Claim failed: ${e.message}` });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <button disabled={busy} onClick={claim} className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-black disabled:opacity-50">{busy ? "Claiming…" : "Claim 10,000 testnet KICK"}</button>
      {msg && <p className={`text-xs ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}
