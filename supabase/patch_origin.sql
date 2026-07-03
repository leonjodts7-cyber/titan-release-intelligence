-- TITAN v9: data provenance — mock seed hidden from live UI
-- Safe to run multiple times on existing databases

ALTER TABLE releases ADD COLUMN IF NOT EXISTS data_origin TEXT NOT NULL DEFAULT 'mock';

CREATE INDEX IF NOT EXISTS idx_releases_data_origin ON releases(data_origin);

COMMENT ON COLUMN releases.data_origin IS 'mock | api | curated — only api and curated are shown in live UI';

UPDATE releases SET data_origin = 'mock' WHERE data_origin IS NULL OR data_origin = '';

-- Re-assert all existing seed rows stay mock (not visible in live mode)
UPDATE releases
SET data_origin = 'mock'
WHERE source_name IN ('TITAN Mock', 'TITAN Mock Seed')
   OR external_source IS NULL
   OR external_source NOT IN ('ticketmaster', 'curated');
