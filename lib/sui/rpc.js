// Raw JSON-RPC against Tatum's Sui gateway. Kept explicit so every call is visible and rate-limit friendly.
export async function rpc(method, params) {
  const res = await fetch(process.env.SUI_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.TATUM_API_KEY },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result;
}
