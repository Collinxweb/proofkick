"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RetryProof({ pickId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function retry() {
    setBusy(true); setMsg("Working, up to a minute...");
    try {
      const j = await (await fetch("/api/picks/prove", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pickId }) })).json();
      setMsg(j.error ?? `Walrus: ${j.snapshot}. Sui: ${j.anchor}`);
      router.refresh();
    } catch { setMsg("Interrupted. Tap again, it is safe to repeat."); }
    setBusy(false);
  }
  return <span className="text-xs"><button onClick={retry} disabled={busy} className="rounded-full bg-accent px-3 py-1 font-semibold text-black disabled:opacity-50">Retry proof</button>{msg && <span className="ml-2 text-white/60">{msg}</span>}</span>;
}
