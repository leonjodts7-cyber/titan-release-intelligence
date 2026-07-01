-- TITAN Resale & Pricing Intelligence Migration

ALTER TABLE releases ADD COLUMN IF NOT EXISTS estimated_resale_low NUMERIC(12,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS estimated_resale_mid NUMERIC(12,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS estimated_resale_high NUMERIC(12,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS expected_profit_low NUMERIC(12,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS expected_profit_mid NUMERIC(12,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS expected_profit_high NUMERIC(12,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS expected_roi_low NUMERIC(8,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS expected_roi_mid NUMERIC(8,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS expected_roi_high NUMERIC(8,2);
ALTER TABLE releases ADD COLUMN IF NOT EXISTS resale_confidence_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS market_liquidity_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS demand_pressure_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS resale_risk_level TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS resale_explanation TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS resale_is_estimated BOOLEAN DEFAULT true;

ALTER TABLE release_scores ADD COLUMN IF NOT EXISTS estimated_resale_mid NUMERIC(12,2);
ALTER TABLE release_scores ADD COLUMN IF NOT EXISTS expected_roi_mid NUMERIC(8,2);
ALTER TABLE release_scores ADD COLUMN IF NOT EXISTS resale_confidence_score NUMERIC(5,2);

-- Update seed releases with realistic resale estimates
UPDATE releases SET
  estimated_resale_low = 180, estimated_resale_mid = 320, estimated_resale_high = 480,
  expected_profit_low = 105, expected_profit_mid = 245, expected_profit_high = 405,
  expected_roi_low = 78, expected_roi_mid = 140, expected_roi_high = 166,
  resale_confidence_score = 88, market_liquidity_score = 92, demand_pressure_score = 95,
  resale_risk_level = 'EXTREME',
  resale_explanation = 'Coldplay stadium tour — extreme secondary demand expected'
WHERE slug = 'coldplay-europe-tour-2026';

UPDATE releases SET
  estimated_resale_low = 250, estimated_resale_mid = 450, estimated_resale_high = 750,
  expected_profit_low = 165, expected_profit_mid = 365, expected_profit_high = 665,
  expected_roi_low = 66, expected_roi_mid = 146, expected_roi_high = 266,
  resale_confidence_score = 92, market_liquidity_score = 95, demand_pressure_score = 99,
  resale_risk_level = 'EXTREME',
  resale_explanation = 'Taylor Swift Eras Tour — highest concert resale demand globally'
WHERE slug = 'taylor-swift-stadium-show-london';

UPDATE releases SET
  estimated_resale_low = 400, estimated_resale_mid = 800, estimated_resale_high = 1500,
  expected_profit_low = 250, expected_profit_mid = 650, expected_profit_high = 1350,
  expected_roi_low = 83, expected_roi_mid = 108, expected_roi_high = 169,
  resale_confidence_score = 90, market_liquidity_score = 88, demand_pressure_score = 97,
  resale_risk_level = 'EXTREME',
  resale_explanation = 'Champions League Final — premium football resale market'
WHERE slug = 'uefa-champions-league-final-2026';

UPDATE releases SET
  estimated_resale_low = 2500, estimated_resale_mid = 5000, estimated_resale_high = 12000,
  expected_profit_low = 2000, expected_profit_mid = 4500, expected_profit_high = 11500,
  expected_roi_low = 100, expected_roi_mid = 150, expected_roi_high = 240,
  resale_confidence_score = 95, market_liquidity_score = 90, demand_pressure_score = 99,
  resale_risk_level = 'EXTREME',
  resale_explanation = 'Super Bowl — most liquid sporting event resale market'
WHERE slug = 'super-bowl-lx';

UPDATE releases SET
  estimated_resale_low = 280, estimated_resale_mid = 380, estimated_resale_high = 520,
  expected_profit_low = 60, expected_profit_mid = 160, expected_profit_high = 300,
  expected_roi_low = 27, expected_roi_mid = 73, expected_roi_high = 136,
  resale_confidence_score = 82, market_liquidity_score = 78, demand_pressure_score = 88,
  resale_risk_level = 'HIGH',
  resale_explanation = 'Limited Nike Mercurial — strong sneaker resale on StockX/GOAT'
WHERE slug = 'nike-mercurial-limited-drop';

UPDATE releases SET
  estimated_resale_low = 250, estimated_resale_mid = 450, estimated_resale_high = 800,
  expected_profit_low = 100, expected_profit_mid = 300, expected_profit_high = 650,
  expected_roi_low = 67, expected_roi_mid = 200, expected_roi_high = 433,
  resale_confidence_score = 75, market_liquidity_score = 85, demand_pressure_score = 97,
  resale_risk_level = 'EXTREME',
  resale_explanation = 'Travis Scott Jordan collab — historically extreme resale multiples'
WHERE slug = 'jordan-travis-scott-drop';

UPDATE releases SET
  estimated_resale_low = 200, estimated_resale_mid = 350, estimated_resale_high = 550,
  expected_profit_low = 80, expected_profit_mid = 230, expected_profit_high = 430,
  expected_roi_low = 40, expected_roi_mid = 92, expected_roi_high = 108,
  resale_confidence_score = 88, market_liquidity_score = 90, demand_pressure_score = 96,
  resale_risk_level = 'EXTREME',
  resale_explanation = 'Tomorrowland — festival tickets trade at significant premium'
WHERE slug = 'tomorrowland-2026-ticket-sale';

UPDATE releases SET
  estimated_resale_low = 120, estimated_resale_mid = 200, estimated_resale_high = 350,
  expected_profit_low = 40, expected_profit_mid = 120, expected_profit_high = 270,
  expected_roi_low = 27, expected_roi_mid = 60, expected_roi_high = 60,
  resale_confidence_score = 78, market_liquidity_score = 65, demand_pressure_score = 75,
  resale_risk_level = 'MEDIUM',
  resale_explanation = 'F1 Belgian GP — moderate premium on popular grandstands'
WHERE slug = 'formula-1-belgian-gp-2026';

UPDATE releases SET
  estimated_resale_low = 350, estimated_resale_mid = 600, estimated_resale_high = 1200,
  expected_profit_low = 200, expected_profit_mid = 450, expected_profit_high = 1050,
  expected_roi_low = 33, expected_roi_mid = 75, expected_roi_high = 88,
  resale_confidence_score = 88, market_liquidity_score = 82, demand_pressure_score = 94,
  resale_risk_level = 'EXTREME',
  resale_explanation = 'UFC title fight — arena tickets trade at significant premium'
WHERE slug = 'ufc-315-title-fight';
