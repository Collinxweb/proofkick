// Minimal Wallet Standard client (no extra packages): finds Sui wallets injected by extensions such as Slush.
function findWallets(wait = 450) {
  return new Promise((resolve) => {
    const found = [];
    const api = { register: (...ws) => { found.push(...ws); return () => {}; } };
    const onReg = (e) => { try { e.detail(api); } catch {} };
    window.addEventListener("wallet-standard:register-wallet", onReg);
    window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: api }));
    setTimeout(() => {
      window.removeEventListener("wallet-standard:register-wallet", onReg);
      resolve(found.filter((w) => w.features?.["standard:connect"] && w.features?.["sui:signPersonalMessage"]));
    }, wait);
  });
}

export async function signInWithWallet() {
  const wallets = await findWallets();
  const w = wallets.find((x) => /slush|sui/i.test(x.name)) ?? wallets[0];
  if (!w) throw new Error("No Sui wallet found in this browser. Open ProofKick in Kiwi or Mises with the Slush extension enabled.");
  const { accounts } = await w.features["standard:connect"].connect();
  const account = accounts.find((a) => a.chains?.some((c) => c.startsWith("sui:"))) ?? accounts[0];
  if (!account) throw new Error("The wallet did not share an account.");
  const { nonce } = await (await fetch("/api/auth/wallet", { cache: "no-store" })).json();
  const message = `ProofKick sign-in\nAddress: ${account.address}\nNonce: ${nonce}`;
  const { signature } = await w.features["sui:signPersonalMessage"].signPersonalMessage({ message: new TextEncoder().encode(message), account });
  const res = await fetch("/api/auth/wallet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: account.address, message, signature }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Wallet sign-in failed");
}
