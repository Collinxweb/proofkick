import { MemWal } from "@mysten-incubation/memwal";

let client;
export const memwalConfigured = () => Boolean(process.env.MEMWAL_DELEGATE_KEY && process.env.MEMWAL_ACCOUNT_ID);
const mw = () =>
  (client ??= MemWal.create({
    key: process.env.MEMWAL_DELEGATE_KEY.trim(),
    accountId: process.env.MEMWAL_ACCOUNT_ID.trim(),
    serverUrl: process.env.MEMWAL_RELAYER_URL?.trim() || "https://relayer.memory.walrus.xyz",
  }));

// One namespace per user keeps every tipster's record separate inside the app's Walrus Memory account.
export const userNamespace = (userId) => `pk-${userId}`;

export async function saveBlob(userId, text) {
  const r = await mw().rememberAndWait(text, userNamespace(userId), { timeoutMs: 40000 });
  return { blobId: r.blob_id, memoryId: r.id };
}

// Content is Seal-encrypted, so only this server (the delegate key) can decrypt it. Newest first.
export async function readUser(userId, limit = 50) {
  const { results } = await mw().recall({ query: "proofkick pick snapshot and result", limit, sort: "recent", namespace: userNamespace(userId) });
  return results;
}

export const health = () => mw().health();
export const recallTest = (ns, q) => mw().recall({ query: q, limit: 3, namespace: ns });
export const saveRaw = (ns, text) => mw().rememberAndWait(text, ns, { timeoutMs: 40000 });
