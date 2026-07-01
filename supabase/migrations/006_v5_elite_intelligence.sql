-- TITAN V5 Elite Intelligence Platform Migration

ALTER TABLE releases ADD COLUMN IF NOT EXISTS popularity_score NUMERIC(5,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS google_trends_score NUMERIC(5,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS news_activity_score NUMERIC(5,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS social_activity_score NUMERIC(5,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS momentum_score NUMERIC(5,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS volatility_score NUMERIC(5,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS market_confidence NUMERIC(5,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS historical_roi_pct NUMERIC(8,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS historical_price_change_pct NUMERIC(8,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS expected_sellout_hours NUMERIC(8,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS expected_queue_difficulty TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS price_direction TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS countries_interested JSONB;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS official_sources JSONB;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS opportunity_action TEXT;

CREATE INDEX IF NOT EXISTS idx_releases_momentum ON releases(momentum_score DESC);
