"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Withdraws one settled fixed-odds kick back to the account.
export default function FixedRedeemButton({ entryId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function withdraw() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/kick/fixed/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entryId }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: j.error ?? "Withdraw did not go through." });
    setMsg({ ok: true, text: `Withdrawn ${j.paid} KICK.` });
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button disabled={busy} onClick={withdraw} className="rounded-full border border-accent px-3 py-1.5 text-xs text-accent disabled:opacity-50">{busy ? "Withdrawing…" : "Withdraw"}</button>
      {msg && <p className={`max-w-[180px] text-right text-[10px] ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}
