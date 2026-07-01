-- TITAN V4 Deal Execution Intelligence Migration

-- TCG / collectibles fields
ALTER TABLE releases ADD COLUMN IF NOT EXISTS tcg_name TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS set_name TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS product_type_tcg TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS card_rarity TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS sealed_product BOOLEAN DEFAULT false;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS msrp NUMERIC(12,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS market_price NUMERIC(12,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS graded_estimate_psa10 NUMERIC(12,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS collector_demand_score NUMERIC(5,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS grading_potential_score NUMERIC(5,2);

-- Opportunity scoring fields
ALTER TABLE releases ADD COLUMN IF NOT EXISTS opportunity_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS scarcity_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS resale_potential NUMERIC(5,2) DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS action_urgency NUMERIC(5,2) DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS opportunity_action TEXT DEFAULT 'WATCH';

-- Source scan priority
ALTER TABLE source_adapters ADD COLUMN IF NOT EXISTS scan_priority TEXT DEFAULT 'NORMAL';

-- AI analysis extensions
ALTER TABLE release_scores ADD COLUMN IF NOT EXISTS why_important TEXT;
ALTER TABLE release_scores ADD COLUMN IF NOT EXISTS why_risky TEXT;
ALTER TABLE release_scores ADD COLUMN IF NOT EXISTS what_to_monitor TEXT;
ALTER TABLE release_scores ADD COLUMN IF NOT EXISTS estimated_opportunity TEXT;

-- Index for opportunity ranking
CREATE INDEX IF NOT EXISTS idx_releases_opportunity_score ON releases(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_releases_tcg_name ON releases(tcg_name) WHERE tcg_name IS NOT NULL;
