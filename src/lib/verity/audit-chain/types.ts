export interface AuditChainEntry {
  sequenceNumber: number;
  eventType: AuditEventType;
  entityId: string;
  entityType: string;
  eventData: Record<string, unknown>;
  entryHash: string;
  previousHash: string;
  createdAt: string;
}

export type AuditEventType =
  | "ATTESTATION_CREATED"
  | "ATTESTATION_REVOKED"
  | "CERTIFICATE_ISSUED"
  | "CERTIFICATE_REVOKED"
  | "SCORE_COMPUTED"
  | "PASSPORT_GENERATED"
  | "P2P_REQUEST_CREATED"
  | "P2P_RESPONSE_SENT";

export interface ChainVerificationResult {
  valid: boolean;
  totalEntries: number;
  brokenAt: number | null;
  firstEntry: string;
  lastEntry: string;
  errors: string[];
}
