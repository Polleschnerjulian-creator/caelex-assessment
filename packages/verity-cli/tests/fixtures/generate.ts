/**
 * Verity CLI — Test Fixture Generator
 *
 * Generates all test fixtures programmatically using verity-core and
 * verity-transparency. Run with: npx tsx tests/fixtures/generate.ts
 */

import {
  generateKeyPair,
  buildAttestation,
  buildCertificate,
  sign,
  DOMAIN_TAGS,
  canonicalizeToBytes,
  utcNow,
  utcFuture,
} from "@caelex/verity-core";
import {
  buildMerkleTree,
  computeInclusionProof,
} from "@caelex/verity-transparency";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, ".");
mkdirSync(dir, { recursive: true });

// ---------------------------------------------------------------------------
// Key pairs
// ---------------------------------------------------------------------------
const operator = generateKeyPair();
const attester = generateKeyPair();
const issuer = generateKeyPair();
const platform = generateKeyPair();

// ---------------------------------------------------------------------------
// Helper: build a test attestation
// ---------------------------------------------------------------------------
function makeAttestation(opts: {
  validFrom?: string;
  validUntil?: string;
  measurementType?: string;
  actualValue?: number;
  sequenceNumber?: number;
}) {
  return buildAttestation({
    tenantId: "tenant-test-001",
    subject: { asset_type: "satellite", asset_id: "SAT-2036-ALPHA" },
    statement: {
      predicate_type: "THRESHOLD",
      operator: "ABOVE",
      measurement_type: opts.measurementType ?? "fuel_margin",
      threshold_ref: "ESA-STD-2036/fuel/v3",
      valid_from: opts.validFrom ?? utcNow(),
      valid_until: opts.validUntil ?? utcFuture(90),
      sequence_number: opts.sequenceNumber,
    },
    actualValue: opts.actualValue ?? 42.5,
    commitmentDomain: "fuel_margin",
    commitmentContext: { unit: "kg", policy: "ESA-STD-2036/fuel/v3" },
    evidenceRef: "evidence://test/bundle-001",
    evidenceHash: createHash("sha256")
      .update("test-evidence-data")
      .digest("hex"),
    attesterId: "attester-001",
    attesterPrivateKey: attester.privateKey,
    attesterPublicKey: attester.publicKey,
    operatorPrivateKey: operator.privateKey,
    operatorKeyId: "operator-key-001",
  });
}

// ---------------------------------------------------------------------------
// 1. Valid attestation
// ---------------------------------------------------------------------------
const validAttestation = makeAttestation({});
writeFileSync(
  join(dir, "valid-attestation.json"),
  JSON.stringify(validAttestation, null, 2),
);

// ---------------------------------------------------------------------------
// 2. Expired attestation (valid signatures but validity window in the past)
//    We build it with dates far in the past. buildAttestation does not
//    validate that dates are in the future, so signatures are still valid.
// ---------------------------------------------------------------------------
const expiredAttestation = makeAttestation({
  validFrom: "2020-01-01T00:00:00.000Z",
  validUntil: "2020-06-01T00:00:00.000Z",
  sequenceNumber: 2,
});
writeFileSync(
  join(dir, "expired-attestation.json"),
  JSON.stringify(expiredAttestation, null, 2),
);

// ---------------------------------------------------------------------------
// 3. Invalid signature attestation (tamper with attestation_id after signing)
// ---------------------------------------------------------------------------
const invalidAttestation = {
  ...validAttestation,
  attestation_id: "tampered-id-12345",
};
writeFileSync(
  join(dir, "invalid-attestation.json"),
  JSON.stringify(invalidAttestation, null, 2),
);

// ---------------------------------------------------------------------------
// 4. Valid certificate with 3 attestations
// ---------------------------------------------------------------------------
const att1 = makeAttestation({
  measurementType: "fuel_margin",
  sequenceNumber: 1,
});
const att2 = makeAttestation({
  measurementType: "orbit_accuracy",
  sequenceNumber: 2,
  actualValue: 98.7,
});
const att3 = makeAttestation({
  measurementType: "comm_uptime",
  sequenceNumber: 3,
  actualValue: 99.99,
});

const validCertificate = buildCertificate({
  tenantId: "tenant-test-001",
  attestations: [att1, att2, att3],
  issuerPrivateKey: issuer.privateKey,
  issuerKeyId: "issuer-key-001",
  expiresInDays: 365,
  sequenceNumber: 1,
});
writeFileSync(
  join(dir, "valid-certificate.json"),
  JSON.stringify(validCertificate, null, 2),
);

// ---------------------------------------------------------------------------
// 5. Partially valid certificate (1 attestation expired, 2 valid)
// ---------------------------------------------------------------------------
const attExpired = makeAttestation({
  measurementType: "fuel_margin",
  validFrom: "2020-01-01T00:00:00.000Z",
  validUntil: "2020-06-01T00:00:00.000Z",
  sequenceNumber: 10,
});
const attValid1 = makeAttestation({
  measurementType: "orbit_accuracy",
  sequenceNumber: 11,
  actualValue: 95.0,
});
const attValid2 = makeAttestation({
  measurementType: "comm_uptime",
  sequenceNumber: 12,
  actualValue: 99.5,
});

const partialCertificate = buildCertificate({
  tenantId: "tenant-test-001",
  attestations: [attExpired, attValid1, attValid2],
  issuerPrivateKey: issuer.privateKey,
  issuerKeyId: "issuer-key-001",
  expiresInDays: 365,
  sequenceNumber: 2,
});
writeFileSync(
  join(dir, "partial-certificate.json"),
  JSON.stringify(partialCertificate, null, 2),
);

// ---------------------------------------------------------------------------
// 6. Expired certificate (entire cert expired)
// ---------------------------------------------------------------------------
const expiredCertificate = buildCertificate({
  tenantId: "tenant-test-001",
  attestations: [att1],
  issuerPrivateKey: issuer.privateKey,
  issuerKeyId: "issuer-key-001",
  expiresInDays: -365, // 1 year in the past
  sequenceNumber: 3,
});
writeFileSync(
  join(dir, "expired-certificate.json"),
  JSON.stringify(expiredCertificate, null, 2),
);

// ---------------------------------------------------------------------------
// 7. Invalid certificate (tampered signature)
// ---------------------------------------------------------------------------
const invalidCertificate = {
  ...validCertificate,
  certificate_signature: "00".repeat(64),
};
writeFileSync(
  join(dir, "invalid-certificate.json"),
  JSON.stringify(invalidCertificate, null, 2),
);

// ---------------------------------------------------------------------------
// 8. Valid transparency proof
//    Build a Merkle tree from entry hashes, compute an inclusion proof,
//    sign the checkpoint with the platform key.
// ---------------------------------------------------------------------------
const entryHashes = [
  createHash("sha256").update("entry-0").digest("hex"),
  createHash("sha256").update("entry-1").digest("hex"),
  createHash("sha256").update("entry-2").digest("hex"),
  createHash("sha256").update("entry-3").digest("hex"),
];

const tree = buildMerkleTree(entryHashes);
const proofForEntry1 = computeInclusionProof(tree, 1);

// Sign the checkpoint
const checkpointBody = {
  checkpointId: "checkpoint-001",
  merkleRoot: tree.root,
};
const checkpointBytes = canonicalizeToBytes(checkpointBody);
const checkpointSig = sign(
  platform.privateKey,
  DOMAIN_TAGS.TRANSPARENCY_ENTRY,
  checkpointBytes,
);

const validProof = {
  entryId: "entry-001",
  referenceId: validAttestation.attestation_id,
  entryHash: entryHashes[1]!,
  sequenceNumber: 1,
  inclusionProof: {
    merklePath: proofForEntry1.siblings,
    checkpointId: "checkpoint-001",
    checkpointMerkleRoot: tree.root,
    checkpointSignature: checkpointSig.signature,
  },
};
writeFileSync(
  join(dir, "valid-proof.json"),
  JSON.stringify(validProof, null, 2),
);

// ---------------------------------------------------------------------------
// 9. Tampered proof (alter a merkle path hash)
// ---------------------------------------------------------------------------
const tamperedProof = JSON.parse(
  JSON.stringify(validProof),
) as typeof validProof;
if (tamperedProof.inclusionProof.merklePath.length > 0) {
  tamperedProof.inclusionProof.merklePath[0]!.hash = "ff".repeat(32);
}
writeFileSync(
  join(dir, "tampered-proof.json"),
  JSON.stringify(tamperedProof, null, 2),
);

// ---------------------------------------------------------------------------
// 10. Export public keys
// ---------------------------------------------------------------------------
writeFileSync(join(dir, "operator-key.pub"), operator.publicKey);
writeFileSync(join(dir, "attester-key.pub"), attester.publicKey);
writeFileSync(join(dir, "issuer-key.pub"), issuer.publicKey);
writeFileSync(join(dir, "platform-key.pub"), platform.publicKey);

// ---------------------------------------------------------------------------
// 11. Malformed JSON file
// ---------------------------------------------------------------------------
writeFileSync(join(dir, "malformed.txt"), "{ this is not valid json }");

// ---------------------------------------------------------------------------
// 12. Non-verity JSON file (no recognizable fields)
// ---------------------------------------------------------------------------
writeFileSync(
  join(dir, "unknown-type.json"),
  JSON.stringify({ foo: "bar", baz: 123 }, null, 2),
);

console.log("Fixtures generated successfully in", dir);
console.log("  Keys: operator, attester, issuer, platform");
console.log("  Attestations: valid, expired, invalid-signature");
console.log("  Certificates: valid, partial, expired, invalid-signature");
console.log("  Proofs: valid, tampered");
console.log("  Other: malformed.txt, unknown-type.json");
