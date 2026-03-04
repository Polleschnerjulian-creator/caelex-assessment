CREATE TABLE IF NOT EXISTS attestations (
  attestation_id TEXT PRIMARY KEY,
  protocol_version INTEGER NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
  subject_asset_type TEXT NOT NULL,
  subject_asset_id TEXT NOT NULL,
  predicate_type TEXT NOT NULL,
  operator TEXT NOT NULL,
  measurement_type TEXT NOT NULL,
  threshold_ref TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  sequence_number BIGINT NOT NULL,
  commitment_hash TEXT NOT NULL,
  commitment_scheme TEXT NOT NULL,
  commitment_version INTEGER NOT NULL,
  evidence_ref TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  attester_id TEXT NOT NULL REFERENCES attesters(attester_id),
  attester_signature TEXT NOT NULL,
  operator_signature TEXT NOT NULL,
  operator_key_id TEXT NOT NULL REFERENCES keys(key_id),
  nonce TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'VALID',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attestations_tenant_subject ON attestations(tenant_id, subject_asset_id);
CREATE INDEX IF NOT EXISTS idx_attestations_tenant_measurement ON attestations(tenant_id, measurement_type);
CREATE INDEX IF NOT EXISTS idx_attestations_tenant_created ON attestations(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attestations_validity ON attestations(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_attestations_status ON attestations(status);
CREATE INDEX IF NOT EXISTS idx_attestations_sequence ON attestations(sequence_number);
