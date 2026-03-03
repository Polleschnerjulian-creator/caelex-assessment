import {
  generateKeyPairSync,
  createHash,
  createPublicKey,
  createPrivateKey,
  type KeyObject,
} from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = process.env["SENTINEL_DATA_DIR"] || "/data";
const KEYS_DIR = join(DATA_DIR, "keys");

export interface AgentKeyPair {
  publicKey: KeyObject;
  privateKey: KeyObject;
  publicKeyPem: string;
}

/**
 * Load or generate Ed25519 key pair.
 * Keys are stored as PEM in /data/keys/.
 */
export function loadOrGenerateKeys(): AgentKeyPair {
  const pubPath = join(KEYS_DIR, "sentinel_ed25519.pub");
  const privPath = join(KEYS_DIR, "sentinel_ed25519.key");

  if (existsSync(pubPath) && existsSync(privPath)) {
    console.log("[keys] Loading existing key pair");
    const pubPem = readFileSync(pubPath, "utf-8");
    const privPem = readFileSync(privPath, "utf-8");
    return {
      publicKey: createPublicKey(pubPem),
      privateKey: createPrivateKey(privPem),
      publicKeyPem: pubPem,
    };
  }

  console.log("[keys] Generating new Ed25519 key pair");
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  const pubPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const privPem = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString();

  // Persist keys
  mkdirSync(KEYS_DIR, { recursive: true });
  writeFileSync(pubPath, pubPem, { mode: 0o644 });
  writeFileSync(privPath, privPem, { mode: 0o600 });

  return { publicKey, privateKey, publicKeyPem: pubPem };
}

/**
 * Generate a unique Sentinel ID from the public key.
 */
export function deriveSentinelId(publicKeyPem: string): string {
  const hash = createHash("sha256")
    .update(publicKeyPem)
    .digest("hex")
    .slice(0, 16);
  return `snt_${hash}`;
}
