#!/usr/bin/env node
/**
 * pharos-verify — Standalone Pharos receipt verifier.
 *
 * Copyright 2026 Julian Polleschner. MIT License.
 *
 * USAGE
 *   npx pharos-verify <entryId-or-receipt-url>
 *   npx pharos-verify --file ./receipt.json
 *   cat receipt.json | npx pharos-verify --stdin
 *
 * WHAT IT DOES
 *   1. Fetches the receipt JSON (or reads from stdin/file)
 *   2. Recomputes the canonical receiptHash from inputHash || contextHash || ...
 *   3. Verifies the Ed25519 signature against the embedded public key
 *   4. Prints a clear ✓ / ✗ verdict with diagnostics
 *
 * ZERO DEPENDENCIES — uses only Node stdlib (crypto, https). No Caelex
 * code, no npm install needed beyond Node 18+. This is intentional:
 * a court / journalist / regulator should be able to verify a Pharos
 * receipt without trusting any Caelex-controlled software.
 */

import { createHash, createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import { argv, exit, stdin } from "node:process";

const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const DEFAULT_BASE = "https://caelex.app";

// Hoist color helpers — they're used everywhere below.
const isTty = !!process.stdout.isTTY;
const green = (s) => (isTty ? `\x1b[32m${s}\x1b[0m` : s);
const red = (s) => (isTty ? `\x1b[31m${s}\x1b[0m` : s);
const yellow = (s) => (isTty ? `\x1b[33m${s}\x1b[0m` : s);

const args = argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  printHelp();
  exit(args.length === 0 ? 1 : 0);
}

const flag = args[0];

try {
  let payload;
  if (flag === "--file") {
    if (!args[1]) die("--file needs a path");
    const raw = await readFile(args[1], "utf8");
    payload = JSON.parse(raw);
  } else if (flag === "--stdin") {
    const chunks = [];
    for await (const chunk of stdin) chunks.push(chunk);
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } else if (flag.startsWith("http://") || flag.startsWith("https://")) {
    payload = await fetchJson(flag);
  } else {
    // Treat as entryId — fetch from default base.
    payload = await fetchJson(`${DEFAULT_BASE}/api/pharos/receipt/${flag}`);
  }

  const verdict = verifyReceipt(payload);
  printVerdict(verdict);
  exit(verdict.ok ? 0 : 2);
} catch (err) {
  console.error(red("✗ pharos-verify error:"), err.message ?? err);
  exit(3);
}

// ─── Verification ────────────────────────────────────────────────────

function canonicalJson(value) {
  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = v[k];
      return out;
    }
    return v;
  });
}

function sha256Hex(input) {
  return createHash("sha256")
    .update(typeof input === "string" ? Buffer.from(input, "utf8") : input)
    .digest("hex");
}

function verifyReceipt(payload) {
  const issues = [];

  // Tolerant unwrap: accept either the full server response or just
  // the receipt block.
  const r = payload.receipt ?? payload;

  if (!r || typeof r !== "object") {
    return { ok: false, issues: ["receipt block missing"] };
  }

  const required = [
    "version",
    "inputHash",
    "contextHash",
    "outputHash",
    "receiptHash",
    "signature",
    "publicKeyBase64",
  ];
  for (const k of required) {
    if (!r[k]) issues.push(`missing field: ${k}`);
  }
  if (issues.length > 0) return { ok: false, issues };

  // 1. Recompute receiptHash.
  const recomputed = sha256Hex(
    [
      r.version,
      r.inputHash,
      r.contextHash,
      r.outputHash,
      r.previousReceiptHash ?? "",
    ].join("|"),
  );
  const hashMatch = recomputed === r.receiptHash;
  if (!hashMatch) {
    issues.push(
      `receiptHash mismatch — expected ${r.receiptHash.slice(0, 16)}…, recomputed ${recomputed.slice(0, 16)}…`,
    );
  }

  // 2. Verify Ed25519 signature.
  let sigMatch = false;
  try {
    const pubDer = Buffer.concat([
      SPKI_ED25519_PREFIX,
      Buffer.from(r.publicKeyBase64, "base64"),
    ]);
    const pub = createPublicKey({ key: pubDer, format: "der", type: "spki" });
    sigMatch = verify(
      null,
      Buffer.from(r.receiptHash, "hex"),
      pub,
      Buffer.from(r.signature, "base64"),
    );
  } catch (e) {
    issues.push(`signature verify error: ${e.message}`);
  }
  if (!sigMatch) issues.push("Ed25519 signature INVALID");

  return {
    ok: hashMatch && sigMatch,
    issues,
    receipt: r,
    chain: payload.chain ?? null,
    entryId: payload.entryId ?? null,
  };
}

// ─── Output ──────────────────────────────────────────────────────────

function printVerdict(v) {
  console.log("");
  if (v.ok) {
    console.log(green("✓ Pharos receipt VERIFIED"));
  } else {
    console.log(red("✗ Pharos receipt INVALID"));
  }
  console.log("");
  if (v.entryId) console.log(`  entryId       ${v.entryId}`);
  if (v.receipt?.receiptHash) {
    console.log(`  receiptHash   ${v.receipt.receiptHash}`);
  }
  if (v.receipt?.signedAt) console.log(`  signedAt      ${v.receipt.signedAt}`);
  if (v.receipt?.algorithm) console.log(`  algorithm     ${v.receipt.algorithm}`);
  if (v.receipt?.publicKeyBase64) {
    console.log(
      `  publicKey     ${v.receipt.publicKeyBase64.slice(0, 32)}…`,
    );
  }
  if (v.chain) {
    console.log(
      `  chain         prev=${v.chain.previousHash?.slice(0, 16) ?? "(root)"} entry=${v.chain.entryHash?.slice(0, 16)}`,
    );
  }
  if (v.issues.length > 0) {
    console.log("");
    console.log(yellow("Issues:"));
    for (const issue of v.issues) console.log(`  • ${issue}`);
  }
  console.log("");
}

function printHelp() {
  console.log(`pharos-verify — verify a Pharos AI receipt locally

Usage:
  pharos-verify <entryId>            Fetch from caelex.app and verify
  pharos-verify <url>                Fetch from arbitrary URL and verify
  pharos-verify --file <path>        Verify a local receipt JSON file
  pharos-verify --stdin              Read receipt JSON from stdin

Exit codes:
  0  ✓ verified
  2  ✗ invalid (hash or signature mismatch)
  3  error (network, parse, missing fields)

Algorithm:
  receiptHash = sha256(version|inputHash|contextHash|outputHash|previousReceiptHash)
  signature   = Ed25519(receiptHash, authorityPrivateKey)
  verify      = Ed25519.verify(signature, receiptHash, authorityPublicKey)

Zero dependencies. Source: https://github.com/caelex-platform/caelex-assessment
`);
}

// ─── Helpers ─────────────────────────────────────────────────────────

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "pharos-verify/1.0" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

function die(msg) {
  console.error(red("✗"), msg);
  exit(1);
}
