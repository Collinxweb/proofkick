// One loader for Sui private keys in any common format: suiprivkey1… (bech32), 64-character hex, or base64
// (32 bytes, or 33 bytes with the 0x00 scheme flag, as found in a keystore). Never prints the key.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

export function keypairFromEnv(raw, name) {
  if (!raw || !raw.trim()) throw new Error(`${name} is not set in this deployment`);
  const k = raw.trim().replace(/^["']|["']$/g, "");
  try {
    if (k.startsWith("suiprivkey")) {
      return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(k).secretKey);
    }
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(k)) {
      return Ed25519Keypair.fromSecretKey(Buffer.from(k.replace(/^0x/, ""), "hex"));
    }
    const bytes = Buffer.from(k, "base64");
    if (bytes.length === 32) return Ed25519Keypair.fromSecretKey(bytes);
    if (bytes.length === 33 && bytes[0] === 0) return Ed25519Keypair.fromSecretKey(bytes.subarray(1));
  } catch (e) {
    throw new Error(`${name} could not be read (${String(e.message).slice(0, 80)}). Check the value in Vercel.`);
  }
  throw new Error(`${name} is not in a recognised format. Use the suiprivkey… value, or hex, or base64. Check the value in Vercel.`);
}
