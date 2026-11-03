"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RedeemButton({ roundId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  async function redeem() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/kick/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ roundId }) });
    const j = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ bad: true, text: j.error });
    setMsg({ text: `Withdrawn ${j.paid.toFixed(2)} KICK to your account.` });
    router.refresh();
  }
  return (
    <span className="inline-flex flex-col items-end">
      <button onClick={redeem} disabled={busy} className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-black disabled:opacity-50">{busy ? "Withdrawing…" : "Withdraw"}</button>
      {msg && <span className={`mt-1 text-[10px] ${msg.bad ? "text-red-400" : "text-white/60"}`}>{msg.text}</span>}
    </span>
  );
}
