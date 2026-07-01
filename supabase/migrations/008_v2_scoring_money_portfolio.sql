-- TITAN V2: FX, fees, alert delivery, portfolio

CREATE TABLE IF NOT EXISTS fx_rates (
  currency TEXT PRIMARY KEY,
  rate_to_eur NUMERIC(12,6) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fee_profiles (
  platform TEXT PRIMARY KEY,
  seller_fee_pct NUMERIC(5,2) NOT NULL,
  payment_fee_pct NUMERIC(5,2) NOT NULL,
  shipping_flat_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type TEXT NOT NULL CHECK (channel_type IN ('telegram', 'discord')),
  label TEXT NOT NULL,
  telegram_chat_id TEXT,
  discord_webhook_url TEXT,
  min_priority TEXT NOT NULL DEFAULT 'HIGH PRIORITY',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES alert_channels(id) ON DELETE CASCADE,
  release_id UUID REFERENCES releases(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  message TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  buy_price_eur NUMERIC(12,2) NOT NULL,
  buy_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'holding' CHECK (status IN ('holding', 'listed', 'sold')),
  sale_platform TEXT,
  sale_price_eur NUMERIC(12,2),
  predicted_low_eur NUMERIC(12,2),
  predicted_high_eur NUMERIC(12,2),
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prediction_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
  predicted_low_eur NUMERIC(12,2),
  predicted_high_eur NUMERIC(12,2),
  actual_sale_eur NUMERIC(12,2),
  within_range BOOLEAN,
  deviation_pct NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_deliveries_status ON alert_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);

INSERT INTO fx_rates (currency, rate_to_eur) VALUES
  ('EUR', 1), ('USD', 0.92), ('GBP', 1.17), ('CAD', 0.68), ('CHF', 1.05)
ON CONFLICT (currency) DO NOTHING;

INSERT INTO fee_profiles (platform, seller_fee_pct, payment_fee_pct, shipping_flat_eur) VALUES
  ('stockx', 9.5, 3, 15),
  ('goat', 9.5, 2.9, 14),
  ('ebay', 12, 3.5, 8),
  ('stubhub', 15, 0, 0),
  ('ticketmaster_resale', 10, 0, 0),
  ('tcgplayer', 10.25, 2.5, 4),
  ('direct', 0, 2.5, 6)
ON CONFLICT (platform) DO NOTHING;
