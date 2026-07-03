-- TITAN v7: main + sub category taxonomy

ALTER TABLE releases ADD COLUMN IF NOT EXISTS main_category TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS sub_category TEXT;

CREATE INDEX IF NOT EXISTS idx_releases_main_category ON releases(main_category);
CREATE INDEX IF NOT EXISTS idx_releases_sub_category ON releases(sub_category);
CREATE INDEX IF NOT EXISTS idx_releases_main_sub ON releases(main_category, sub_category);

COMMENT ON COLUMN releases.main_category IS 'schoenen | tickets | kaarten | overig';
COMMENT ON COLUMN releases.sub_category IS 'Subcategorie slug binnen hoofdcategorie';
