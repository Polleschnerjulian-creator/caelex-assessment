/**
 * Verity 2036 — Demo Script
 *
 * Demonstrates the full attestation lifecycle:
 * 1. Generate key pairs (attester + operator + issuer)
 * 2. Create an attestation for satellite fuel margin
 * 3. Validate the attestation
 * 4. Bundle into a certificate with Merkle root
 * 5. Validate the certificate
 * 6. Demonstrate V1 compatibility detection
 */

import {
  generateKeyPair,
  buildAttestation,
  validateAttestation,
  buildCertificate,
  validateCertificate,
  ThresholdCommitmentProofProvider,
  detectProtocolVersion,
  utcFuture,
} from "./index.js";

async function main() {
  console.log("=== Verity 2036 Demo ===\n");

  // 1. Generate key pairs
  const attesterKeys = generateKeyPair();
  const operatorKeys = generateKeyPair();
  const issuerKeys = generateKeyPair();
  console.log("Generated key pairs (attester, operator, issuer)");

  // 2. Create an attestation
  const attestation = buildAttestation({
    tenantId: "tenant-demo-001",
    subject: {
      asset_type: "satellite",
      asset_id: "SAT-2036-ALPHA",
    },
    statement: {
      predicate_type: "THRESHOLD",
      operator: "ABOVE",
      measurement_type: "fuel_margin_pct",
      threshold_ref: "eu_space_act_art_70_v2",
      valid_from: new Date().toISOString(),
      valid_until: utcFuture(90),
    },
    actualValue: 42.7, // SECRET: never appears in output
    commitmentDomain: "VERITY2036_ATTESTATION_V2",
    commitmentContext: {
      regulation: "eu_space_act_art_70",
      asset_id: "SAT-2036-ALPHA",
    },
    evidenceRef: "sentinel://packet/abc123",
    evidenceHash: "a".repeat(64), // placeholder hash
    attesterId: "attester-001",
    attesterPrivateKey: attesterKeys.privateKey,
    attesterPublicKey: attesterKeys.publicKey,
    operatorPrivateKey: operatorKeys.privateKey,
    operatorKeyId: "op-key-001",
  });

  console.log(`Created attestation: ${attestation.attestation_id}`);
  console.log(`  Protocol version: ${attestation.protocol_version}`);
  console.log(
    `  Subject: ${attestation.subject.asset_type} ${attestation.subject.asset_id}`,
  );
  console.log(
    `  Commitment: ${attestation.commitment.hash.substring(0, 16)}...`,
  );

  // Verify no actual value leaked
  const json = JSON.stringify(attestation);
  const hasValue = json.includes("42.7");
  console.log(`  Value leaked: ${hasValue ? "YES (BUG!)" : "No (correct)"}`);

  // 3. Validate attestation
  const attestResult = validateAttestation(
    attestation,
    operatorKeys.publicKey,
    attesterKeys.publicKey,
  );
  console.log(
    `\nAttestation validation: ${attestResult.valid ? "PASS" : "FAIL"}`,
  );
  if (attestResult.errors.length > 0) {
    console.log(`  Errors: ${attestResult.errors.join(", ")}`);
  }

  // 4. Build certificate
  const certificate = buildCertificate({
    tenantId: "tenant-demo-001",
    attestations: [attestation],
    issuerPrivateKey: issuerKeys.privateKey,
    issuerKeyId: "issuer-key-001",
    expiresInDays: 365,
    sequenceNumber: 1,
  });

  console.log(`\nIssued certificate: ${certificate.cert_id}`);
  console.log(`  Merkle root: ${certificate.merkle_root.substring(0, 16)}...`);
  console.log(`  Attestations: ${certificate.attestations.length}`);

  // 5. Validate certificate
  const certResult = validateCertificate(certificate, issuerKeys.publicKey);
  console.log(`Certificate validation: ${certResult.valid ? "PASS" : "FAIL"}`);
  if (certResult.errors.length > 0) {
    console.log(`  Errors: ${certResult.errors.join(", ")}`);
  }

  // 6. Protocol version detection
  console.log(`\nProtocol detection:`);
  console.log(
    `  V2 attestation: version=${detectProtocolVersion(attestation).version}`,
  );
  console.log(
    `  V1 attestation: version=${detectProtocolVersion({ version: "1.0" }).version}`,
  );

  // 7. Proof provider demo
  const provider = new ThresholdCommitmentProofProvider();
  const proof = await provider.createProof({
    predicateType: "ABOVE",
    actualValue: 42.7,
    thresholdRef: "eu_space_act_art_70_v2",
    thresholdValue: 10.0,
    domain: "VERITY2036_ATTESTATION_V2",
    context: { regulation: "eu_space_act_art_70" },
    attesterPrivateKey: attesterKeys.privateKey,
    attesterPublicKey: attesterKeys.publicKey,
    attesterId: "attester-001",
  });

  console.log(`\nProof created:`);
  console.log(`  Scheme: ${proof.scheme}`);
  console.log(`  Predicate: ABOVE -> ${proof.predicateResult}`);

  const proofValid = await provider.verifyProof(proof, {
    domain: "VERITY2036_ATTESTATION_V2",
    context: { regulation: "eu_space_act_art_70" },
    trustedAttesterKeys: new Set([attesterKeys.publicKey]),
  });
  console.log(`  Verification: ${proofValid ? "PASS" : "FAIL"}`);

  console.log("\n=== Demo Complete ===");
}

main().catch(console.error);
