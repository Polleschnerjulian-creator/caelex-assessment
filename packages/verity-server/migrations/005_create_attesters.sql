CREATE TABLE IF NOT EXISTS attesters (
  attester_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
  name TEXT NOT NULL,
  attester_type TEXT NOT NULL,
  key_id TEXT NOT NULL REFERENCES keys(key_id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attesters_tenant_status ON attesters(tenant_id, status);
