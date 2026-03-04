/** A binary Merkle tree built from hex-encoded leaf hashes */
export interface MerkleTree {
  root: string;
  leaves: string[];
  layers: string[][];
}

/** Sibling hashes for reconstructing the root from a leaf */
export interface MerkleProofPath {
  leafIndex: number;
  leafHash: string;
  siblings: Array<{ hash: string; position: "left" | "right" }>;
}

/** A single transparency log entry */
export interface TransparencyEntry {
  entryId: string;
  entryHash: string;
  previousHash: string;
  sequenceNumber: number;
}

/** Result of hash chain verification */
export interface HashChainResult {
  valid: boolean;
  entriesChecked: number;
  firstBrokenLink?: {
    sequenceNumber: number;
    expected: string;
    actual: string;
  };
}

/** A transparency log checkpoint */
export interface TransparencyCheckpoint {
  checkpointId: string;
  entryCount: number;
  merkleRoot: string;
  previousCheckpointHash: string;
  firstSequence: number;
  lastSequence: number;
  platformSignature: string;
}

/** Result of checkpoint verification */
export interface CheckpointVerificationResult {
  valid: boolean;
  checks: {
    signature: boolean;
    merkleRoot: boolean;
    entryCount: boolean;
    sequenceRange: boolean;
  };
}
