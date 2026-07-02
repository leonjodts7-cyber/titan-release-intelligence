-- TITAN v5: drop detail, ingest metadata, buy locations

ALTER TABLE releases ADD COLUMN IF NOT EXISTS buy_locations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS hype_reason TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'drop'
  CHECK (sale_type IN ('drop', 'raffle', 'preorder', 'voorverkoop', 'algemene_verkoop'));
ALTER TABLE releases ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS source_checked_at TIMESTAMPTZ;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS external_source TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS external_source_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_releases_external_source
  ON releases (external_source, external_source_id)
  WHERE external_source IS NOT NULL AND external_source_id IS NOT NULL;
