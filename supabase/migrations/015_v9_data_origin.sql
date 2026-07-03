-- TITAN v9: data provenance — only api/curated visible in live mode

ALTER TABLE releases ADD COLUMN IF NOT EXISTS data_origin TEXT NOT NULL DEFAULT 'mock';

CREATE INDEX IF NOT EXISTS idx_releases_data_origin ON releases(data_origin);

COMMENT ON COLUMN releases.data_origin IS 'mock | api | curated — only api and curated are shown in live UI';

UPDATE releases SET data_origin = 'mock' WHERE data_origin IS NULL OR data_origin = '';
