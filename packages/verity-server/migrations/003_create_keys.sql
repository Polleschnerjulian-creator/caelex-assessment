CREATE TABLE IF NOT EXISTS keys (
  key_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
  purpose TEXT NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  key_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  activated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  rotated_to TEXT REFERENCES keys(key_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_keys_tenant_status ON keys(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_keys_tenant_purpose_status ON keys(tenant_id, purpose, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_keys_public_key ON keys(public_key);
ALTER TABLE keys ADD CONSTRAINT uq_keys_tenant_purpose_version UNIQUE (tenant_id, purpose, key_version);
