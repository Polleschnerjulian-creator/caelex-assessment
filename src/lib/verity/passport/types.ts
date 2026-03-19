export interface PassportData {
  passportId: string;
  label: string;
  operatorId: string;
  satelliteNorad: string | null;
  satelliteName: string | null;
  complianceScore: number;
  scoreBreakdown: Record<string, number>;
  jurisdictions: string[];
  attestations: PassportAttestationSummary[];
  certificates: PassportCertificateSummary[];
  generatedAt: string;
  expiresAt: string;
  verificationUrl: string;
}

export interface PassportAttestationSummary {
  regulationRef: string;
  regulationName: string;
  dataPoint: string;
  result: boolean;
  trustLevel: string;
  issuedAt: string;
  expiresAt: string;
  attestationId: string;
}

export interface PassportCertificateSummary {
  certificateId: string;
  claimsCount: number;
  minTrustLevel: string;
  issuedAt: string;
  expiresAt: string;
}

export interface GeneratePassportParams {
  organizationId: string;
  operatorId: string;
  satelliteNorad?: string | null;
  satelliteName?: string | null;
  label: string;
  isPublic?: boolean;
  expiresInDays?: number;
}
