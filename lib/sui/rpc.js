// JSON-RPC against Tatum's Sui gateway. Tatum serves a small read-only subset (sui_getObject,
// sui_getTransactionBlock, sui_multiGetObjects, ...), so this is used for lookups and verification.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function rpc(method, params) {
  const url = process.env.SUI_RPC_URL?.trim();
  const key = process.env.TATUM_API_KEY?.trim();
  if (!url) throw new Error("SUI_RPC_URL is not set in this deployment");
  if (!key) throw new Error("TATUM_API_KEY is not set in this deployment");
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (res.status === 429 && attempt < 2) { await sleep(700 * (attempt + 1)); continue; }
    let json = null;
    try { json = await res.json(); } catch {}
    if (json?.error) throw new Error(`${method}: ${json.error.message}`);
    if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
    return json.result;
  }
}
