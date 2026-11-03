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
      resolve(found.filter((w) => w.features?.["standard:connect"]));
    }, wait);
  });
}

const post = (url, body) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

export default function KickClaim() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [canSelfPay, setCanSelfPay] = useState(false);

  async function connect() {
    const wallets = await findWallets();
    const w = wallets.find((x) => /slush|sui/i.test(x.name)) ?? wallets[0];
    if (!w) throw new Error("No Sui wallet found. Open this page in Kiwi or Mises with Slush enabled, on Testnet.");
    const { accounts } = await w.features["standard:connect"].connect();
    const account = accounts.find((a) => a.chains?.some((c) => c.startsWith("sui:"))) ?? accounts[0];
    if (!account) throw new Error("The wallet did not share an account.");
    return { w, account };
  }

  // No wallet: the account's own testnet address (held by the app, derived from the account) claims. Play money only.
  async function claimWithoutWallet() {
    setBusy(true); setCanSelfPay(false); setStatus({ text: "Claiming to your account address..." });
    try {
      const r = await fetch("/api/kick/claim/custodial", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Claim failed");
      setStatus({ text: `Claimed 10,000 KICK to ${j.address.slice(0, 10)}… (testnet play money).`, digest: j.digest });
    } catch (e) {
      setStatus({ text: e.message, bad: true });
    }
    setBusy(false);
  }

  // Default: the app pays gas (sponsored). The wallet approves the complete transaction.
  async function claimSponsored() {
    setBusy(true); setCanSelfPay(false); setStatus({ text: "Connecting your wallet..." });
    try {
      const { w, account } = await connect();
      setStatus({ text: "Preparing your claim..." });
      const prep = await post("/api/kick/claim/prepare", { sender: account.address });
      if (prep.error) throw new Error(prep.error);
      setStatus({ text: "Adding the gas..." });
      const sp = await post("/api/kick/claim/sponsor", { sender: account.address, kind: prep.kind });
      if (sp.error) throw new Error(sp.error);
      setStatus({ text: "Approve the claim in your wallet (Testnet)." });
      const bytes = Uint8Array.from(atob(sp.bytes), (c) => c.charCodeAt(0));
      const transaction = Transaction.from(bytes);
      const { signature } = await w.features["sui:signTransaction"].signTransaction({ transaction, account, chain: "sui:testnet" });
      setStatus({ text: "Submitting..." });
      const done = await post("/api/kick/claim/execute", { bytes: sp.bytes, signature, sponsorSignature: sp.sponsorSignature });
      if (done.error) throw new Error(done.error);
      setStatus({ text: "Claimed 10,000 KICK (testnet play money).", digest: done.digest });
    } catch (e) {
      setStatus({ text: e.message, bad: true });
      setCanSelfPay(true);
    }
    setBusy(false);
  }

  // Diagnostic fallback: the wallet pays its own gas and submits the claim itself. No app sponsorship involved.
  async function claimSelfPaid() {
    setBusy(true); setStatus({ text: "Testing a self-paid claim (your wallet pays the gas)..." });
    try {
      const { w, account } = await connect();
      if (!w.features["sui:signAndExecuteTransaction"]) throw new Error("This wallet cannot submit transactions itself. Send me its name.");
      const prep = await post("/api/kick/claim/prepare", { sender: account.address });
      if (prep.error) throw new Error(prep.error);
      const tx = Transaction.fromKind(Uint8Array.from(atob(prep.kind), (c) => c.charCodeAt(0)));
      tx.setSender(account.address);
      const res = await w.features["sui:signAndExecuteTransaction"].signAndExecuteTransaction({ transaction: tx, account, chain: "sui:testnet" });
      setStatus({ text: "Self-paid claim submitted. Check the link below.", digest: res.digest });
    } catch (e) {
      setStatus({ text: `Self-paid test failed: ${e.message}`, bad: true });
    }
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <p className="text-sm font-semibold text-white">Claim testnet KICK</p>
      <p className="mt-1 text-xs text-white/50">Play money with no value, for testnet Kick rounds only. One claim per wallet. No SUI needed.</p>
      <button onClick={claimSponsored} disabled={busy} className="mt-3 w-full rounded-full bg-accent py-3 font-semibold text-black disabled:opacity-50">{busy ? "Working..." : "Claim 10,000 KICK"}</button>
      <button onClick={claimWithoutWallet} disabled={busy} className="mt-2 w-full rounded-full border border-accent/50 py-3 text-sm font-semibold text-accent disabled:opacity-50">Claim without a wallet</button>
      <p className="mt-2 text-[11px] text-white/45">Without a wallet, the app holds this testnet address for your account. Play money only: never send real funds to it.</p>
      {canSelfPay && !busy && (
        <button onClick={claimSelfPaid} className="mt-2 w-full rounded-full border border-white/20 py-2.5 text-xs text-white/80">Test: pay the gas from my wallet instead</button>
      )}
      {status && (
        <div className={`mt-3 break-words text-xs ${status.bad ? "text-red-400" : "text-white/70"}`}>
          <p>{status.text}</p>
          {status.digest && <a className="mt-1 block break-all text-accent underline" target="_blank" rel="noreferrer" href={`https://suiscan.xyz/testnet/tx/${status.digest}`}>Testnet tx {status.digest}</a>}
        </div>)}
    </div>
  );
}
