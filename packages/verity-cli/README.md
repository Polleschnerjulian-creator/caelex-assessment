# @caelex/verity-cli

Command-line verification tool for Verity 2036 compliance attestations, certificates, and transparency proofs.

Built on top of `@caelex/verity-verifier-sdk`. All verification is performed offline using local public keys -- no server connection required.

## Installation

```bash
npm install -g @caelex/verity-cli
```

## Commands

### verify-attestation

Verify a Verity attestation against a trusted operator public key.

```bash
verity verify-attestation <file> --operator-key <key-file> [--attester-key <key-file>] [--strict] [--json]
```

**Example:**

```bash
verity verify-attestation attestation-2036-001.json \
  --operator-key operator.pub \
  --attester-key sentinel-alpha.pub
```

The operator key is matched to the attestation's `signatures.operator_key_id` field. The attester key (if provided) is matched to the `evidence.attester_id` field. Both key files contain hex-encoded Ed25519 public keys.

---

### verify-cert

Verify a Verity certificate and all embedded attestations.

```bash
verity verify-cert <file> --issuer-key <key-file> --operator-key <key-file> [--attester-key <key-file>] [--strict] [--json]
```

**Example:**

```bash
verity verify-cert certificate-Q1-2036.json \
  --issuer-key caelex-issuer.pub \
  --operator-key operator.pub \
  --attester-key sentinel.pub
```

Verifies the certificate signature, Merkle root, expiry, and each embedded attestation. The operator key is applied to all attestations that reference an operator key ID. The attester key is applied to all attestations that reference an attester ID.

---

### verify-proof

Verify a transparency log inclusion proof.

```bash
verity verify-proof <file> --platform-key <key-file> [--json]
```

**Example:**

```bash
verity verify-proof inclusion-proof-entry-42.json \
  --platform-key verity-platform.pub
```

Checks that the Merkle path recomputes to the checkpoint root and that the checkpoint signature is valid under the platform key.

---

### show

Display a human-readable summary of an attestation, certificate, or inclusion proof. Auto-detects the document type based on top-level fields.

```bash
verity show <file> [--json]
```

**Example:**

```bash
verity show attestation-2036-001.json
```

Sample output:

```
=== Attestation ===

ID:               att-2036-001-debris-norad-25544
Protocol:         v2
Tenant:           tenant-eu-sat-ops

Subject:
  Asset Type:     satellite
  Asset ID:       NORAD-25544

Statement:
  Predicate:      less_than_or_equal
  Measurement:    debris_probability
  Threshold Ref:  threshold-debris-001
  Valid From:     2036-01-15T00:00:00Z
  Valid Until:    2036-04-15T00:00:00Z
  Sequence:       7

Commitment:
  Scheme:         pedersen-sha256
  Version:        1
  Hash:           a3f7b2c1d4e6...

Evidence:
  Reference:      ev-sentinel-alpha-20360115
  Attester ID:    sentinel-alpha-7

Signatures:
  Operator Key:   op-sat-eu-001

Metadata:
  Created:        2036-01-15T12:00:00Z
```

Never displays private key material, blinding factors, or actual measurement values.

## Exit Codes

| Code | Constant              | Meaning                                                      |
| ---- | --------------------- | ------------------------------------------------------------ |
| 0    | `VALID`               | All checks passed                                            |
| 1    | `INVALID`             | Verification failed                                          |
| 2    | `EXPIRED`             | Cryptographically valid but expired                          |
| 3    | `PARTIALLY_VALID`     | Some attestations in a certificate are valid, others are not |
| 4    | `UNKNOWN_PROTOCOL`    | Unsupported protocol version                                 |
| 5    | `MALFORMED_INPUT`     | Invalid file, missing arguments, or unparseable JSON         |
| 6    | `MISSING_KEY`         | Required key file not found or unreadable                    |
| 7    | `ONLINE_CHECK_FAILED` | Online revocation check failed                               |

Exit codes allow scripted verification pipelines to branch on specific failure modes. In `--strict` mode, `EXPIRED` (2) and `PARTIALLY_VALID` (3) are promoted to `INVALID` (1).

## Flags Reference

| Flag                    | Commands                            | Description                                                          |
| ----------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `--operator-key <file>` | `verify-attestation`, `verify-cert` | Path to hex-encoded Ed25519 operator public key. Required.           |
| `--attester-key <file>` | `verify-attestation`, `verify-cert` | Path to hex-encoded Ed25519 attester public key. Optional.           |
| `--issuer-key <file>`   | `verify-cert`                       | Path to hex-encoded Ed25519 certificate issuer public key. Required. |
| `--platform-key <file>` | `verify-proof`                      | Path to hex-encoded Ed25519 platform public key. Required.           |
| `--strict`              | `verify-attestation`, `verify-cert` | Treat expired or partially valid results as invalid (exit code 1).   |
| `--json`                | All commands                        | Output results as JSON instead of human-readable text.               |
| `--help`                | Global                              | Show usage information.                                              |
| `--version`             | Global                              | Show CLI version.                                                    |

## Example: Verify a Certificate from a Supply-Chain Partner

A ground station operator receives a compliance certificate from a satellite operator and wants to verify it before accepting a tracking contract:

```bash
# 1. Inspect the certificate contents
verity show partner-certificate.json

# 2. Verify with all required keys
verity verify-cert partner-certificate.json \
  --issuer-key keys/caelex-issuer.pub \
  --operator-key keys/partner-operator.pub \
  --attester-key keys/sentinel-fleet.pub

# 3. Check the result
echo "Exit code: $?"
# 0 = proceed with contract
# 1 = reject, request re-issuance
# 2 = expired, request fresh certificate
# 3 = partially valid, request remediation for failed attestations
```

For machine-readable output in a CI pipeline:

```bash
verity verify-cert partner-certificate.json \
  --issuer-key keys/caelex-issuer.pub \
  --operator-key keys/partner-operator.pub \
  --json \
  --strict
```

## Example: Batch Verification Script

Verify all attestations in a directory and produce a summary report:

```bash
#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0
EXPIRED=0

for f in attestations/*.json; do
  verity verify-attestation "$f" --operator-key operator.pub
  code=$?

  case $code in
    0) PASS=$((PASS + 1)); echo "PASS  $f" ;;
    2) EXPIRED=$((EXPIRED + 1)); echo "EXPIRED  $f" ;;
    *) FAIL=$((FAIL + 1)); echo "FAIL($code)  $f" ;;
  esac
done

echo ""
echo "Results: $PASS passed, $FAIL failed, $EXPIRED expired"
echo "Total:   $((PASS + FAIL + EXPIRED))"
```

For strict mode where expired attestations count as failures:

```bash
for f in attestations/*.json; do
  verity verify-attestation "$f" --operator-key operator.pub --strict
  echo "$f: exit $?"
done
```

## Key File Format

Key files contain a single hex-encoded Ed25519 public key (64 hexadecimal characters, 32 bytes). No headers, no PEM encoding, no newline sensitivity.

```
3b7a9f2e1c8d4b6a0e5f7c9d2a4b6e8f1c3d5a7b9e0f2a4c6d8e0f1a3b5c7d
```

## Changelog

_No releases yet._
