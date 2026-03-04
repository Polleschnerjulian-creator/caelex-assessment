CREATE TABLE IF NOT EXISTS certificates (
  cert_id TEXT PRIMARY KEY,
  protocol_version INTEGER NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
  issuer_key_id TEXT NOT NULL REFERENCES keys(key_id),
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attestation_ids TEXT[] NOT NULL,
  merkle_root TEXT NOT NULL,
  certificate_signature TEXT NOT NULL,
  sequence_number BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'VALID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_certificates_tenant ON certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_certificates_tenant_status ON certificates(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_certificates_issued ON certificates(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_expires ON certificates(expires_at);
