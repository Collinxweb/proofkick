// Raw JSON-RPC against Tatum's Sui gateway. Kept explicit so every call is visible and rate-limit friendly.
export async function rpc(method, params) {
  const url = process.env.SUI_RPC_URL?.trim();
  const key = process.env.TATUM_API_KEY?.trim();
  if (!url) throw new Error("SUI_RPC_URL is not set in this deployment");
  if (!key) throw new Error("TATUM_API_KEY is not set in this deployment");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result;
}
