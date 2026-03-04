/**
 * Verity 2036 — Key Encryption
 *
 * AES-256-GCM encryption for private key storage at rest.
 * Uses scrypt for key derivation from a master passphrase.
 *
 * Format: iv_hex:authTag_hex:ciphertext_hex
 *
 * Key material MUST NEVER appear in logs, errors, or stack traces.
 */

import { scrypt } from "@noble/hashes/scrypt";
import { bytesToHex, hexToBytes } from "../commitments/schemes.js";

/** AES-256-GCM parameters */
const IV_BYTES = 12; // NIST SP 800-38D recommended
const AUTH_TAG_BITS = 128;
const KEY_BYTES = 32; // AES-256

/** Scrypt parameters (OWASP 2024+ recommended) */
const SCRYPT_N = 32768; // 2^15
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/** Convert Uint8Array to ArrayBuffer (Web Crypto compatibility) */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}

/**
 * Derive an AES-256 encryption key from a passphrase and salt using scrypt.
 *
 * @param passphrase - The master passphrase (or hex-encoded master key)
 * @param salt - Salt for key derivation (should be unique per key)
 * @returns 32-byte derived key
 */
export function deriveKey(passphrase: string, salt: string): Uint8Array {
  const passphraseBytes = new TextEncoder().encode(passphrase);
  const saltBytes = new TextEncoder().encode(salt);

  return scrypt(passphraseBytes, saltBytes, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    dkLen: KEY_BYTES,
  });
}

/**
 * Encrypt private key bytes with AES-256-GCM.
 *
 * @param plaintext - The private key bytes to encrypt
 * @param passphrase - Master passphrase for key derivation
 * @param salt - Unique salt for this key
 * @returns Encrypted string in format iv_hex:authTag_hex:ciphertext_hex
 */
export async function encryptPrivateKey(
  plaintext: Uint8Array,
  passphrase: string,
  salt: string,
): Promise<string> {
  const derivedKey = deriveKey(passphrase, salt);

  // Generate random IV
  const iv = new Uint8Array(IV_BYTES);
  crypto.getRandomValues(iv);

  // Import key for Web Crypto API
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(derivedKey),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  // Encrypt
  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv), tagLength: AUTH_TAG_BITS },
    cryptoKey,
    toArrayBuffer(plaintext),
  );

  // Web Crypto appends auth tag to ciphertext
  const resultBytes = new Uint8Array(ciphertextWithTag);
  const authTagStart = resultBytes.length - AUTH_TAG_BITS / 8;
  const ciphertext = resultBytes.slice(0, authTagStart);
  const authTag = resultBytes.slice(authTagStart);

  return `${bytesToHex(iv)}:${bytesToHex(authTag)}:${bytesToHex(ciphertext)}`;
}

/**
 * Decrypt private key bytes with AES-256-GCM.
 *
 * @param encrypted - Encrypted string in format iv_hex:authTag_hex:ciphertext_hex
 * @param passphrase - Master passphrase for key derivation
 * @param salt - The salt used during encryption
 * @returns Decrypted private key bytes
 * @throws Error if decryption fails (wrong passphrase, tampered data)
 */
export async function decryptPrivateKey(
  encrypted: string,
  passphrase: string,
  salt: string,
): Promise<Uint8Array> {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted key format");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];

  const iv = hexToBytes(ivHex);
  const authTag = hexToBytes(authTagHex);
  const ciphertext = hexToBytes(ciphertextHex);

  if (iv.length !== IV_BYTES) {
    throw new Error("Invalid IV length");
  }
  if (authTag.length !== AUTH_TAG_BITS / 8) {
    throw new Error("Invalid auth tag length");
  }

  const derivedKey = deriveKey(passphrase, salt);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(derivedKey),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // Web Crypto expects auth tag appended to ciphertext
  const ciphertextWithTag = new Uint8Array(ciphertext.length + authTag.length);
  ciphertextWithTag.set(ciphertext, 0);
  ciphertextWithTag.set(authTag, ciphertext.length);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv), tagLength: AUTH_TAG_BITS },
      cryptoKey,
      toArrayBuffer(ciphertextWithTag),
    );
    return new Uint8Array(plaintext);
  } catch {
    throw new Error("Decryption failed: invalid passphrase or tampered data");
  }
}
