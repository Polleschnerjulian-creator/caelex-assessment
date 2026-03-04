CREATE TABLE IF NOT EXISTS key_revocations (
  revocation_id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL REFERENCES keys(key_id),
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
  reason TEXT NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL,
  revocation_signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_key_revocations_key_id ON key_revocations(key_id);
CREATE INDEX IF NOT EXISTS idx_key_revocations_tenant_id ON key_revocations(tenant_id);
