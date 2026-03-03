import type {
  CommitmentContext,
  CommitmentResult,
  Commitment,
  CommitmentSecret,
  GenerateAttestationParams,
  ThresholdAttestation,
  VerificationResult,
} from "./types";

/**
 * Crypto provider abstraction for Phase 2 swap.
 *
 * Phase 1: HashBasedCryptoProvider (Node.js built-in crypto)
 * Phase 2: PedersenCryptoProvider (@noble/curves Ristretto255)
 *
 * The interface ensures that swapping the crypto backend
 * requires NO changes to API, UI, or DB.
 */
export interface CryptoProvider {
  createCommitment(value: number, context: CommitmentContext): CommitmentResult;

  openCommitment(commitment: Commitment, secret: CommitmentSecret): boolean;

  createThresholdAttestation(
    params: GenerateAttestationParams,
  ): ThresholdAttestation;

  verifyThresholdAttestation(
    attestation: ThresholdAttestation,
    publicKeyHex: string,
    issuerKnown?: boolean,
  ): VerificationResult;

  sign(data: Buffer, privateKeyDer: Buffer): string;

  verify(data: Buffer, signatureHex: string, publicKeyHex: string): boolean;
}

// Phase 1: Implemented via commitment.ts + attestation.ts
// Phase 2 (NOT built): PedersenCryptoProvider with @noble/curves
