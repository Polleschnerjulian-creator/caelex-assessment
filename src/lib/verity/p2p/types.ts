export interface P2PVerificationRequest {
  requestId: string;
  requesterName: string;
  regulationRefs: string[];
  purpose: string;
  message: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface P2PVerificationResponse {
  requestId: string;
  status: "APPROVED" | "DECLINED";
  message: string | null;
  attestations: Array<{
    attestationId: string;
    regulationRef: string;
    result: boolean;
    trustLevel: string;
    issuedAt: string;
    expiresAt: string;
    signature: string;
  }>;
  certificateId: string | null;
  respondedAt: string;
}

export type P2PPurpose =
  | "conjunction_coordination"
  | "ride_share_verification"
  | "insurance_due_diligence"
  | "nca_cross_check"
  | "general";
