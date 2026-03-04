CREATE TABLE IF NOT EXISTS transparency_log (
  entry_id TEXT PRIMARY KEY,
  entry_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
  entry_hash TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  sequence_number BIGINT NOT NULL UNIQUE,
  payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transparency_log_tenant_seq ON transparency_log(tenant_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_transparency_log_reference ON transparency_log(reference_id);
CREATE INDEX IF NOT EXISTS idx_transparency_log_type_created ON transparency_log(entry_type, created_at DESC);
