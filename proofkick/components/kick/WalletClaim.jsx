"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDAppKit, DAppKitProvider, ConnectButton, useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";

const GRPC_URLS = { testnet: "https://fullnode.testnet.sui.io:443" };
const dAppKit = createDAppKit({
  networks: ["testnet"],
  createClient(network) {
    return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
  },
});

function ClaimInner() {
  const router = useRouter();
  const account = useCurrentAccount();
  const kit = useDAppKit();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function claim() {
    setBusy(true); setMsg(null);
    let step = "preparing";
    try {
      const prep = await fetch("/api/kick/claim/wallet/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sender: account.address }) });
      const pj = await prep.json().catch(() => ({}));
      if (!prep.ok) throw new Error(pj.error ?? `server returned ${prep.status}`);

      step = "waiting for your wallet";
      const signed = await kit.signTransaction({ transaction: Transaction.from(pj.txBytes) });

      step = "submitting";
      const ex = await fetch("/api/kick/claim/wallet/execute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txBytes: signed.bytes, signature: signed.signature, sender: account.address }) });
      const ej = await ex.json().catch(() => ({}));
      if (!ex.ok) throw new Error(ej.error ?? `server returned ${ex.status}`);
      setMsg({ ok: true, text: `Claimed to your wallet. Transaction ${String(ej.digest).slice(0, 12)}…` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: `Wallet claim failed while ${step}: ${e.message}` });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/60">Your wallet pays a small SUI gas fee for this transaction. KICK stays in your wallet. Set your wallet to the testnet network.</p>
      {!account ? (
        <ConnectButton />
      ) : (
        <button disabled={busy} onClick={claim} className="w-full rounded-full border border-accent py-3 text-sm font-semibold text-accent disabled:opacity-50">
          {busy ? "Working…" : "Claim 10,000 KICK to my wallet"}
        </button>
      )}
      {msg && <p className={`text-xs ${msg.ok ? "text-accent" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}

export default function WalletClaim() {
  return (
    <DAppKitProvider dAppKit={dAppKit}>
      <ClaimInner />
    </DAppKitProvider>
  );
}
