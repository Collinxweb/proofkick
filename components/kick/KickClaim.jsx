"use client";
import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";

// Wallet Standard lookup for a Sui wallet that can sign transactions (Slush, Kiwi, Mises).
function findWallets(wait = 450) {
  return new Promise((resolve) => {
    const found = [];
    const api = { register: (...ws) => { found.push(...ws); return () => {}; } };
    const onReg = (e) => { try { e.detail(api); } catch {} };
    window.addEventListener("wallet-standard:register-wallet", onReg);
    window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: api }));
    setTimeout(() => {
      window.removeEventListener("wallet-standard:register-wallet", onReg);
      resolve(found.filter((w) => w.features?.["standard:connect"] && w.features?.["sui:signTransaction"]));
    }, wait);
  });
}

// The app pays gas. The wallet only approves the claim, so no SUI is needed in the wallet.
export default function KickClaim() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true); setStatus({ text: "Connecting your wallet..." });
    try {
      const wallets = await findWallets();
      const w = wallets.find((x) => /slush|sui/i.test(x.name)) ?? wallets[0];
      if (!w) throw new Error("No Sui wallet found. Open this page in Kiwi or Mises with Slush enabled, on Testnet.");
      const { accounts } = await w.features["standard:connect"].connect();
      const account = accounts.find((a) => a.chains?.some((c) => c.startsWith("sui:"))) ?? accounts[0];
      if (!account) throw new Error("The wallet did not share an account.");

      setStatus({ text: "Preparing your claim..." });
      const prep = await (await fetch("/api/kick/claim/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sender: account.address }) })).json();
      if (prep.error) throw new Error(prep.error);

      setStatus({ text: "Approve the claim in your wallet (Testnet). No SUI is needed; the app pays the gas." });
      // Wallets expect a Transaction object, not raw bytes, so rebuild it from the server-prepared bytes.
      const bytes = Uint8Array.from(atob(prep.bytes), (c) => c.charCodeAt(0));
      const transaction = Transaction.from(bytes);
      const { signature } = await w.features["sui:signTransaction"].signTransaction({ transaction, account, chain: "sui:testnet" });

      setStatus({ text: "Submitting..." });
      const done = await (await fetch("/api/kick/claim/execute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bytes: prep.bytes, signature, sponsorSignature: prep.sponsorSignature }) })).json();
      if (done.error) throw new Error(done.error);
      setStatus({ text: "Claimed 10,000 KICK (testnet play money).", digest: done.digest });
    } catch (e) {
      setStatus({ text: e.message, bad: true });
    }
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <p className="text-sm font-semibold text-white">Claim testnet KICK</p>
      <p className="mt-1 text-xs text-white/50">Play money with no value, for testnet Kick rounds only. One claim per wallet. No SUI needed.</p>
      <button onClick={claim} disabled={busy} className="mt-3 w-full rounded-full bg-accent py-3 font-semibold text-black disabled:opacity-50">{busy ? "Working..." : "Claim 10,000 KICK"}</button>
      {status && (
        <div className={`mt-3 break-words text-xs ${status.bad ? "text-red-400" : "text-white/70"}`}>
          <p>{status.text}</p>
          {status.digest && <a className="mt-1 block break-all text-accent underline" target="_blank" rel="noreferrer" href={`https://suiscan.xyz/testnet/tx/${status.digest}`}>Testnet tx {status.digest}</a>}
        </div>)}
    </div>
  );
}
