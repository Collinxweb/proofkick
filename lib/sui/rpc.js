// Raw JSON-RPC against Tatum's Sui gateway. Some "extended" indexer methods (coin listing, gas price) may not
// be served by Tatum, so those calls can opt in to a public-node fallback. Every fallback is recorded in `notes`.
const PUBLIC_RPC = "https://fullnode.mainnet.sui.io:443";

async function post(url, extra, method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...extra },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, ok: res.ok && !json?.error, json };
}

export async function rpc(method, params, { fallback = false, notes } = {}) {
  const url = process.env.SUI_RPC_URL?.trim();
  const key = process.env.TATUM_API_KEY?.trim();
  if (!url) throw new Error("SUI_RPC_URL is not set in this deployment");
  if (!key) throw new Error("TATUM_API_KEY is not set in this deployment");
  let r = await post(url, { "x-api-key": key }, method, params);
  const unsupported = r.status === 404 || r.json?.error?.code === -32601;
  if (!r.ok && fallback && unsupported) {
    r = await post(PUBLIC_RPC, {}, method, params);
    notes?.push(`${method} served by public node`);
  }
  if (!r.ok) throw new Error(`${method}: ${r.json?.error?.message ?? `HTTP ${r.status}`}`);
  return r.json.result;
}
