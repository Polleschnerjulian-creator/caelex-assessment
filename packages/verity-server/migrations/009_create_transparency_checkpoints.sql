CREATE TABLE IF NOT EXISTS transparency_checkpoints (
  checkpoint_id TEXT PRIMARY KEY,
  entry_count BIGINT NOT NULL,
  merkle_root TEXT NOT NULL,
  previous_checkpoint_hash TEXT NOT NULL,
  first_sequence BIGINT NOT NULL,
  last_sequence BIGINT NOT NULL,
  platform_signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checkpoints_last_seq ON transparency_checkpoints(last_sequence DESC);
