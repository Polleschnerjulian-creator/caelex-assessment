export function buildVerificationRequest(params: {
  requesterName: string;
  regulationRefs: string[];
  purpose: string;
  message?: string;
  expiresInDays?: number;
}): { requestId: string; expiresAt: string } {
  return {
    requestId: `vr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    expiresAt: new Date(
      Date.now() + (params.expiresInDays ?? 7) * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}
