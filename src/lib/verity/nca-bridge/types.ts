export interface NCASubmissionBundle {
  bundleId: string;
  jurisdiction: string;
  authority: string;
  operatorId: string;
  satelliteNorad: string | null;
  generatedAt: string;
  attestations: Array<{
    attestationId: string;
    regulationRef: string;
    result: boolean;
    trustLevel: string;
    signature: string;
    issuedAt: string;
    expiresAt: string;
  }>;
  verification: {
    publicKeyUrl: string;
    verificationUrl: string;
    instructions: string;
  };
  complianceScore: number;
}
