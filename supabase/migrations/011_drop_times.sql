-- TITAN v4: first-class drop timing on releases

ALTER TABLE releases ADD COLUMN IF NOT EXISTS drop_at TIMESTAMPTZ;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS drop_time_confirmed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS drop_timezone TEXT DEFAULT 'UTC';
ALTER TABLE releases ADD COLUMN IF NOT EXISTS drop_event_type TEXT DEFAULT 'release'
  CHECK (drop_event_type IN ('preorder', 'release', 'presale', 'general_sale'));

-- Backfill from existing columns
UPDATE releases SET drop_at = COALESCE(release_starts_at, general_sale_starts_at, presale_starts_at)
  WHERE drop_at IS NULL;

UPDATE releases SET drop_timezone = COALESCE(NULLIF(timezone, ''), 'UTC')
  WHERE drop_timezone IS NULL OR drop_timezone = 'UTC';

CREATE INDEX IF NOT EXISTS idx_releases_drop_at ON releases(drop_at);
