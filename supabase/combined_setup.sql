-- TITAN Release Intelligence — Combined setup script
-- Generated from migrations: 000_base_schema.sql, 002_rls.sql, 003_seed.sql, 004_resale.sql, 005_v4_deal_execution.sql, 006_v5_elite_intelligence.sql, 007_v6_alerts.sql, 008_v2_scoring_money_portfolio.sql, 009_auth_rls.sql, 010_auth_disabled_rls.sql, 011_drop_times.sql, 012_v5_drop_detail_ingest.sql
-- Skipped: 001_schema.sql (overlaps with 000_base_schema.sql)
-- Includes: full mock seed (2026-07-03)
--
-- Paste this entire file into the Supabase SQL Editor and run once.
-- Safe to re-run: IF NOT EXISTS, DROP POLICY IF EXISTS, ON CONFLICT DO NOTHING.

-- ========================================
-- ===== 000_base_schema.sql =====
-- ========================================

-- TITAN Release Intelligence OS — Idempotent base schema
-- Safe to re-run. Creates all core tables the application expects.
-- Run this FIRST on a fresh or partially-migrated Supabase project.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE release_status AS ENUM (
    'rumored', 'announced', 'presale', 'on_sale', 'sold_out', 'cancelled', 'ended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE release_type AS ENUM (
    'ticket', 'product', 'merch', 'collectible', 'gaming', 'fashion', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXTREME');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE update_type AS ENUM (
    'new_release', 'date_changed', 'presale_added', 'price_changed', 'location_changed',
    'extra_show_added', 'official_link_added', 'status_changed', 'release_imminent',
    'release_ended', 'source_offline', 'scan_error', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE scan_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'discord', 'telegram');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE source_type AS ENUM ('api', 'rss', 'html', 'manual', 'mock');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users profile (extends auth.users)
CREATE TABLE IF NOT EXISTS users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reference tables
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country_id UUID REFERENCES countries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS release_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sports_leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sport TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  league_id UUID REFERENCES sports_leagues(id),
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city_id UUID REFERENCES cities(id),
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Source adapters
CREATE TABLE IF NOT EXISTS source_adapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  source_type source_type NOT NULL DEFAULT 'mock',
  base_url TEXT,
  category TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  scan_frequency_minutes INTEGER NOT NULL DEFAULT 60,
  last_scan_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  reliability_score NUMERIC(5,2) DEFAULT 50.00,
  api_key_env TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Releases (core entity)
CREATE TABLE IF NOT EXISTS releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES release_categories(id),
  brand_id UUID REFERENCES brands(id),
  artist_id UUID REFERENCES artists(id),
  league_id UUID REFERENCES sports_leagues(id),
  team_home_id UUID REFERENCES teams(id),
  team_away_id UUID REFERENCES teams(id),
  venue_id UUID REFERENCES venues(id),
  country_id UUID REFERENCES countries(id),
  city_id UUID REFERENCES cities(id),
  release_type release_type NOT NULL DEFAULT 'other',
  status release_status NOT NULL DEFAULT 'announced',
  official_url TEXT,
  source_url TEXT,
  image_url TEXT,
  description TEXT,
  announced_at TIMESTAMPTZ,
  presale_starts_at TIMESTAMPTZ,
  general_sale_starts_at TIMESTAMPTZ,
  release_starts_at TIMESTAMPTZ,
  release_ends_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC',
  price_min NUMERIC(12,2),
  price_max NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  stock_estimate INTEGER,
  capacity_estimate INTEGER,
  hype_score NUMERIC(5,2) DEFAULT 0,
  demand_score NUMERIC(5,2) DEFAULT 0,
  urgency_score NUMERIC(5,2) DEFAULT 0,
  sellout_probability NUMERIC(5,2) DEFAULT 0,
  resale_interest_score NUMERIC(5,2) DEFAULT 0,
  confidence_score NUMERIC(5,2) DEFAULT 0,
  priority_level priority_level NOT NULL DEFAULT 'LOW',
  last_checked_at TIMESTAMPTZ,
  last_changed_at TIMESTAMPTZ,
  source_adapter_id UUID REFERENCES source_adapters(id),
  external_id TEXT,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS release_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  source_adapter_id UUID REFERENCES source_adapters(id),
  source_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS release_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  update_type update_type NOT NULL,
  old_value TEXT,
  new_value TEXT,
  summary TEXT,
  source_url TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  importance_score NUMERIC(5,2) DEFAULT 50,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS release_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  hype_score NUMERIC(5,2),
  demand_score NUMERIC(5,2),
  urgency_score NUMERIC(5,2),
  sellout_probability NUMERIC(5,2),
  resale_interest_score NUMERIC(5,2),
  confidence_score NUMERIC(5,2),
  priority_level priority_level,
  short_summary TEXT,
  recommended_action TEXT,
  risk_notes TEXT,
  model_version TEXT DEFAULT 'rule-v1',
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  input_data JSONB,
  output_data JSONB,
  model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('equals', 'contains', 'gte', 'lte', 'within_days')),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE UNIQUE,
  in_app_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  discord_enabled BOOLEAN DEFAULT false,
  telegram_enabled BOOLEAN DEFAULT false,
  discord_webhook_url TEXT,
  telegram_chat_id TEXT,
  min_priority priority_level DEFAULT 'HIGH',
  notify_date_changes BOOLEAN DEFAULT true,
  notify_presales BOOLEAN DEFAULT true,
  notify_watchlist BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users_profile(id) ON DELETE CASCADE,
  release_id UUID REFERENCES releases(id) ON DELETE SET NULL,
  channel notification_channel NOT NULL DEFAULT 'in_app',
  status notification_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calendar
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_profile(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scan jobs
CREATE TABLE IF NOT EXISTS scan_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_adapter_id UUID NOT NULL REFERENCES source_adapters(id) ON DELETE CASCADE,
  status scan_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  items_found INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_job_id UUID REFERENCES scan_jobs(id) ON DELETE CASCADE,
  source_adapter_id UUID REFERENCES source_adapters(id),
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_profile(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users_profile(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts (V6)
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  rule_type TEXT NOT NULL,
  threshold NUMERIC(10,2),
  value TEXT,
  channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  release_id UUID REFERENCES releases(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FX, fees, alert delivery, portfolio (V2)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_releases_slug ON releases(slug);
CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_priority ON releases(priority_level);
CREATE INDEX IF NOT EXISTS idx_releases_release_starts ON releases(release_starts_at);
CREATE INDEX IF NOT EXISTS idx_releases_hype ON releases(hype_score DESC);
CREATE INDEX IF NOT EXISTS idx_releases_category ON releases(category_id);
CREATE INDEX IF NOT EXISTS idx_releases_search ON releases USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_release_updates_release ON release_updates(release_id);
CREATE INDEX IF NOT EXISTS idx_release_updates_detected ON release_updates(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_adapter ON scan_jobs(source_adapter_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_starts ON calendar_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_release_event_type
  ON calendar_events(release_id, event_type);
CREATE INDEX IF NOT EXISTS idx_alert_events_triggered ON alert_events(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_events_release ON alert_events(release_id);
CREATE INDEX IF NOT EXISTS idx_alert_deliveries_status ON alert_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION releases_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS releases_search_vector_trigger ON releases;
CREATE TRIGGER releases_search_vector_trigger
  BEFORE INSERT OR UPDATE ON releases
  FOR EACH ROW EXECUTE FUNCTION releases_search_vector_update();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_profile_updated_at ON users_profile;
CREATE TRIGGER users_profile_updated_at
  BEFORE UPDATE ON users_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS releases_updated_at ON releases;
CREATE TRIGGER releases_updated_at
  BEFORE UPDATE ON releases FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS source_adapters_updated_at ON source_adapters;
CREATE TRIGGER source_adapters_updated_at
  BEFORE UPDATE ON source_adapters FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS watchlists_updated_at ON watchlists;
CREATE TRIGGER watchlists_updated_at
  BEFORE UPDATE ON watchlists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- ===== 002_rls.sql =====
-- ========================================

-- TITAN Release Intelligence OS - RLS Policies

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_adapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: check admin role
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users_profile
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users profile
DROP POLICY IF EXISTS "Users can view own profile" ON users_profile;
CREATE POLICY "Users can view own profile" ON users_profile FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON users_profile;
CREATE POLICY "Users can update own profile" ON users_profile FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all profiles" ON users_profile;
CREATE POLICY "Admins can view all profiles" ON users_profile FOR SELECT USING (is_admin());

-- Public read for reference data and releases
DROP POLICY IF EXISTS "Anyone authenticated can read releases" ON releases;
CREATE POLICY "Anyone authenticated can read releases" ON releases FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage releases" ON releases;
CREATE POLICY "Admins can manage releases" ON releases FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Anyone authenticated can read categories" ON release_categories;
CREATE POLICY "Anyone authenticated can read categories" ON release_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage categories" ON release_categories;
CREATE POLICY "Admins manage categories" ON release_categories FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Anyone authenticated can read brands" ON brands;
CREATE POLICY "Anyone authenticated can read brands" ON brands FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone authenticated can read artists" ON artists;
CREATE POLICY "Anyone authenticated can read artists" ON artists FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone authenticated can read leagues" ON sports_leagues;
CREATE POLICY "Anyone authenticated can read leagues" ON sports_leagues FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone authenticated can read teams" ON teams;
CREATE POLICY "Anyone authenticated can read teams" ON teams FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone authenticated can read venues" ON venues;
CREATE POLICY "Anyone authenticated can read venues" ON venues FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone authenticated can read countries" ON countries;
CREATE POLICY "Anyone authenticated can read countries" ON countries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone authenticated can read cities" ON cities;
CREATE POLICY "Anyone authenticated can read cities" ON cities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can read release_updates" ON release_updates;
CREATE POLICY "Anyone authenticated can read release_updates" ON release_updates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone authenticated can read release_scores" ON release_scores;
CREATE POLICY "Anyone authenticated can read release_scores" ON release_scores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone authenticated can read release_sources" ON release_sources;
CREATE POLICY "Anyone authenticated can read release_sources" ON release_sources FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone authenticated can read ai_analysis" ON ai_analysis;
CREATE POLICY "Anyone authenticated can read ai_analysis" ON ai_analysis FOR SELECT TO authenticated USING (true);

-- Watchlists: user owns
DROP POLICY IF EXISTS "Users manage own watchlists" ON watchlists;
CREATE POLICY "Users manage own watchlists" ON watchlists FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own watchlist rules" ON watchlist_rules;
CREATE POLICY "Users manage own watchlist rules" ON watchlist_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM watchlists w WHERE w.id = watchlist_id AND w.user_id = auth.uid())
);

-- Notifications
DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own notification prefs" ON notification_preferences;
CREATE POLICY "Users manage own notification prefs" ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Calendar
DROP POLICY IF EXISTS "Users read calendar events" ON calendar_events;
CREATE POLICY "Users read calendar events" ON calendar_events FOR SELECT TO authenticated USING (
  user_id IS NULL OR user_id = auth.uid()
);
DROP POLICY IF EXISTS "Users manage own calendar events" ON calendar_events;
CREATE POLICY "Users manage own calendar events" ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- Admin tables
DROP POLICY IF EXISTS "Authenticated read source_adapters" ON source_adapters;
CREATE POLICY "Authenticated read source_adapters" ON source_adapters FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage source_adapters" ON source_adapters;
CREATE POLICY "Admins manage source_adapters" ON source_adapters FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Authenticated read scan_jobs" ON scan_jobs;
CREATE POLICY "Authenticated read scan_jobs" ON scan_jobs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage scan_jobs" ON scan_jobs;
CREATE POLICY "Admins manage scan_jobs" ON scan_jobs FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Authenticated read scan_logs" ON scan_logs;
CREATE POLICY "Authenticated read scan_logs" ON scan_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins read admin_notes" ON admin_notes;
CREATE POLICY "Admins read admin_notes" ON admin_notes FOR SELECT USING (is_admin() OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins write admin_notes" ON admin_notes;
CREATE POLICY "Admins write admin_notes" ON admin_notes FOR INSERT WITH CHECK (is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read audit_logs" ON audit_logs;
CREATE POLICY "Admins read audit_logs" ON audit_logs FOR SELECT USING (is_admin());

-- Service role bypasses RLS (used server-side only)

-- ========================================
-- ===== 003_seed.sql =====
-- ========================================

-- TITAN Release Intelligence OS - Seed Data

-- Categories
INSERT INTO release_categories (name, slug, icon) VALUES
  ('Concert Tickets', 'concert-tickets', 'music'),
  ('Sport Tickets', 'sport-tickets', 'trophy'),
  ('Football Matches', 'football-matches', 'football'),
  ('Super Bowl', 'super-bowl', 'football'),
  ('Champions League', 'champions-league', 'trophy'),
  ('Premier League', 'premier-league', 'football'),
  ('Festivals', 'festivals', 'festival'),
  ('Nike Drops', 'nike-drops', 'shoe'),
  ('Nike Football Boots', 'nike-football-boots', 'shoe'),
  ('Adidas Drops', 'adidas-drops', 'shoe'),
  ('Limited Sneakers', 'limited-sneakers', 'shoe'),
  ('Fashion Drops', 'fashion-drops', 'shirt'),
  ('Gaming Drops', 'gaming-drops', 'gamepad'),
  ('Collectibles', 'collectibles', 'box')
ON CONFLICT (slug) DO NOTHING;

-- Brands
INSERT INTO brands (name, slug) VALUES
  ('Nike', 'nike'),
  ('Jordan', 'jordan'),
  ('Adidas', 'adidas'),
  ('Ticketmaster', 'ticketmaster')
ON CONFLICT (slug) DO NOTHING;

-- Artists
INSERT INTO artists (name, slug) VALUES
  ('Coldplay', 'coldplay'),
  ('Taylor Swift', 'taylor-swift'),
  ('Travis Scott', 'travis-scott')
ON CONFLICT (slug) DO NOTHING;

-- Leagues
INSERT INTO sports_leagues (name, slug, sport) VALUES
  ('UEFA Champions League', 'uefa-champions-league', 'football'),
  ('Premier League', 'premier-league', 'football'),
  ('NFL', 'nfl', 'american-football'),
  ('Formula 1', 'formula-1', 'motorsport')
ON CONFLICT (slug) DO NOTHING;

-- Countries & Cities
INSERT INTO countries (name, code) VALUES
  ('Belgium', 'BE'),
  ('United Kingdom', 'GB'),
  ('United States', 'US'),
  ('Netherlands', 'NL')
ON CONFLICT (code) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cities_name_country ON cities(name, country_id);

INSERT INTO cities (name, country_id) VALUES
  ('Brussels', (SELECT id FROM countries WHERE code = 'BE')),
  ('London', (SELECT id FROM countries WHERE code = 'GB')),
  ('Las Vegas', (SELECT id FROM countries WHERE code = 'US')),
  ('Amsterdam', (SELECT id FROM countries WHERE code = 'NL'))
ON CONFLICT (name, country_id) DO NOTHING;

-- Venues
INSERT INTO venues (name, slug, city_id, capacity) VALUES
  ('King Baudouin Stadium', 'king-baudouin-stadium', (SELECT id FROM cities WHERE name = 'Brussels'), 50000),
  ('Wembley Stadium', 'wembley-stadium', (SELECT id FROM cities WHERE name = 'London'), 90000),
  ('Allegiant Stadium', 'allegiant-stadium', (SELECT id FROM cities WHERE name = 'Las Vegas'), 65000),
  ('Boom', 'boom', (SELECT id FROM cities WHERE name = 'Antwerp' LIMIT 1), 400000)
ON CONFLICT (slug) DO NOTHING;

-- Source Adapters
INSERT INTO source_adapters (name, source_type, base_url, category, enabled, scan_frequency_minutes, api_key_env, reliability_score) VALUES
  ('Ticketmaster', 'mock', 'https://www.ticketmaster.com', 'concert-tickets', true, 30, 'TICKETMASTER_API_KEY', 85),
  ('LiveNation', 'mock', 'https://www.livenation.com', 'concert-tickets', true, 30, NULL, 80),
  ('Eventim', 'mock', 'https://www.eventim.de', 'concert-tickets', true, 60, NULL, 75),
  ('AXS', 'mock', 'https://www.axs.com', 'concert-tickets', true, 60, NULL, 75),
  ('Nike SNKRS', 'mock', 'https://www.nike.com/launch', 'nike-drops', true, 15, 'NIKE_API_KEY', 90),
  ('Adidas Confirmed', 'mock', 'https://www.adidas.com/confirmed', 'adidas-drops', true, 15, 'ADIDAS_API_KEY', 88),
  ('UEFA', 'mock', 'https://www.uefa.com', 'champions-league', true, 60, NULL, 92),
  ('FIFA', 'mock', 'https://www.fifa.com', 'football-matches', true, 120, NULL, 90),
  ('NFL', 'mock', 'https://www.nfl.com', 'super-bowl', true, 60, NULL, 95),
  ('Premier League', 'mock', 'https://www.premierleague.com', 'premier-league', true, 60, NULL, 88),
  ('Formula 1', 'mock', 'https://www.formula1.com', 'sport-tickets', true, 120, NULL, 90),
  ('RSS Feeds', 'rss', NULL, 'all', true, 30, NULL, 70),
  ('Official Websites', 'html', NULL, 'all', true, 60, NULL, 65),
  ('Manual Sources', 'manual', NULL, 'all', true, 0, NULL, 100)
ON CONFLICT (name) DO NOTHING;

-- Sample releases: see full_mock_seed section at end of file

-- ========================================
-- ===== 004_resale.sql =====
-- ========================================

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

-- ========================================
-- ===== 005_v4_deal_execution.sql =====
-- ========================================

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

-- ========================================
-- ===== 006_v5_elite_intelligence.sql =====
-- ========================================

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

-- ========================================
-- ===== 007_v6_alerts.sql =====
-- ========================================

-- TITAN V6 Intelligence Monitoring — alert rules & events

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  rule_type TEXT NOT NULL,
  threshold NUMERIC(10,2),
  value TEXT,
  channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  release_id UUID REFERENCES releases(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_events_triggered ON alert_events(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_events_release ON alert_events(release_id);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- ========================================
-- ===== 008_v2_scoring_money_portfolio.sql =====
-- ========================================

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

-- ========================================
-- ===== 009_auth_rls.sql =====
-- ========================================

-- TITAN Auth RLS: user_id on positions & alert_channels, profile trigger, policies

-- Auto-create users_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users_profile (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow users to insert their own profile (fallback if trigger missed)
DROP POLICY IF EXISTS "Users can insert own profile" ON users_profile;
CREATE POLICY "Users can insert own profile" ON users_profile
  FOR INSERT WITH CHECK (auth.uid() = id);

-- positions: add user_id
ALTER TABLE positions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- alert_channels: add user_id
ALTER TABLE alert_channels ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on user-bound tables (idempotent)
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_channels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users manage own positions" ON positions;
DROP POLICY IF EXISTS "Users manage own alert channels" ON alert_channels;

CREATE POLICY "Users manage own positions" ON positions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own alert channels" ON alert_channels
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Re-affirm watchlists / notification_preferences (idempotent)
DROP POLICY IF EXISTS "Users manage own watchlists" ON watchlists;
CREATE POLICY "Users manage own watchlists" ON watchlists
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own notification prefs" ON notification_preferences;
CREATE POLICY "Users manage own notification prefs" ON notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Default user_id on insert via trigger
CREATE OR REPLACE FUNCTION public.set_user_id_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS positions_set_user_id ON positions;
CREATE TRIGGER positions_set_user_id
  BEFORE INSERT ON positions
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();

DROP TRIGGER IF EXISTS alert_channels_set_user_id ON alert_channels;
CREATE TRIGGER alert_channels_set_user_id
  BEFORE INSERT ON alert_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();

DROP TRIGGER IF EXISTS watchlists_set_user_id ON watchlists;
CREATE TRIGGER watchlists_set_user_id
  BEFORE INSERT ON watchlists
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();

DROP TRIGGER IF EXISTS notification_preferences_set_user_id ON notification_preferences;
CREATE TRIGGER notification_preferences_set_user_id
  BEFORE INSERT ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id_default();

-- ========================================
-- ===== 010_auth_disabled_rls.sql =====
-- ========================================

-- TEMPORARY DEV FALLBACK — REVERT BEFORE PUBLIC DEPLOY WITH AUTH_ENABLED=true
-- When auth is disabled the the app uses service-role / anon without sessions.
-- These permissive read policies prevent RLS from blocking reads on user-scoped tables.

DROP POLICY IF EXISTS "Dev anon read positions" ON positions;
CREATE POLICY "Dev anon read positions" ON positions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Dev anon read alert_channels" ON alert_channels;
CREATE POLICY "Dev anon read alert_channels" ON alert_channels
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Dev anon read watchlists" ON watchlists;
CREATE POLICY "Dev anon read watchlists" ON watchlists
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Dev anon read notification_preferences" ON notification_preferences;
CREATE POLICY "Dev anon read notification_preferences" ON notification_preferences
  FOR SELECT TO anon, authenticated USING (true);

-- ========================================
-- ===== 011_drop_times.sql =====
-- ========================================

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

-- ========================================
-- ===== 012_v5_drop_detail_ingest.sql =====
-- ========================================

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

-- ========================================
-- ===== full_mock_seed.sql =====
-- ========================================

-- Full mock seed: 83 releases (idempotent)
-- Generated: 2026-07-03T08:32:28.241Z

-- Reference: categories
INSERT INTO release_categories (name, slug, icon) VALUES ('Limited Sneakers', 'limited-sneakers', 'shoe') ON CONFLICT (slug) DO NOTHING;
INSERT INTO release_categories (name, slug, icon) VALUES ('TCG & Collectibles', 'tcg-collectibles', 'box') ON CONFLICT (slug) DO NOTHING;
INSERT INTO release_categories (name, slug, icon) VALUES ('Concert Tickets', 'concert-tickets', 'music') ON CONFLICT (slug) DO NOTHING;
INSERT INTO release_categories (name, slug, icon) VALUES ('Super Bowl', 'super-bowl', 'football') ON CONFLICT (slug) DO NOTHING;
INSERT INTO release_categories (name, slug, icon) VALUES ('Champions League', 'champions-league', 'trophy') ON CONFLICT (slug) DO NOTHING;
INSERT INTO release_categories (name, slug, icon) VALUES ('World Cup', 'world-cup', 'trophy') ON CONFLICT (slug) DO NOTHING;
INSERT INTO release_categories (name, slug, icon) VALUES ('Sport Tickets', 'sport-tickets', 'trophy') ON CONFLICT (slug) DO NOTHING;
INSERT INTO release_categories (name, slug, icon) VALUES ('Festivals', 'festivals', 'festival') ON CONFLICT (slug) DO NOTHING;
INSERT INTO release_categories (name, slug, icon) VALUES ('Fashion Drops', 'fashion-drops', 'shirt') ON CONFLICT (slug) DO NOTHING;
INSERT INTO release_categories (name, slug, icon) VALUES ('Gaming', 'gaming', 'gamepad') ON CONFLICT (slug) DO NOTHING;

-- Reference: brands
INSERT INTO brands (name, slug) VALUES ('Nike', 'nike') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Jordan', 'jordan') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Adidas', 'adidas') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('New Balance', 'new-balance') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Salomon', 'salomon') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Asics', 'asics') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Supreme', 'supreme') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Palace', 'palace') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Sony', 'sony') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Nintendo', 'nintendo') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Kith', 'kith') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Stüssy', 'st-ssy') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Microsoft', 'microsoft') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Fear of God', 'fear-of-god') ON CONFLICT (slug) DO NOTHING;
INSERT INTO brands (name, slug) VALUES ('Valve', 'valve') ON CONFLICT (slug) DO NOTHING;

-- Reference: artists
INSERT INTO artists (name, slug) VALUES ('Taylor Swift', 'taylor-swift') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Coldplay', 'coldplay') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Drake', 'drake') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Travis Scott', 'travis-scott') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Beyoncé', 'beyonc') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Bad Bunny', 'bad-bunny') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Billie Eilish', 'billie-eilish') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Ed Sheeran', 'ed-sheeran') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Dua Lipa', 'dua-lipa') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('The Weeknd', 'the-weeknd') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Arctic Monkeys', 'arctic-monkeys') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Post Malone', 'post-malone') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('SZA', 'sza') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Olivia Rodrigo', 'olivia-rodrigo') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Harry Styles', 'harry-styles') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Metallica', 'metallica') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Adele', 'adele') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Kendrick Lamar', 'kendrick-lamar') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Rosalía', 'rosal-a') ON CONFLICT (slug) DO NOTHING;
INSERT INTO artists (name, slug) VALUES ('Florence + The Machine', 'florence-the-machine') ON CONFLICT (slug) DO NOTHING;

-- Reference: leagues
INSERT INTO sports_leagues (name, slug, sport) VALUES ('NFL', 'nfl', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('UEFA Champions League', 'uefa-champions-league', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('FIFA', 'fifa', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('La Liga', 'la-liga', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('Premier League', 'premier-league', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('NBA', 'nba', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('Formula 1', 'formula-1', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('UFC', 'ufc', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('Wimbledon', 'wimbledon', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('Festivals', 'festivals', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('Six Nations', 'six-nations', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('EuroLeague', 'euroleague', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('Cycling', 'cycling', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('Jupiler Pro League', 'jupiler-pro-league', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('Tennis', 'tennis', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('NHL', 'nhl', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('IndyCar', 'indycar', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('CONMEBOL', 'conmebol', 'sport') ON CONFLICT (slug) DO NOTHING;
INSERT INTO sports_leagues (name, slug, sport) VALUES ('Olympics', 'olympics', 'sport') ON CONFLICT (slug) DO NOTHING;

-- Reference: countries
INSERT INTO countries (name, code) VALUES ('Belgium', 'BE') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('United Kingdom', 'GB') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('France', 'FR') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Canada', 'CA') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('United States', 'US') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Spain', 'ES') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Germany', 'DE') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Netherlands', 'NL') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Ireland', 'IE') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Austria', 'AT') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Sweden', 'SE') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Italy', 'IT') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Denmark', 'DK') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Portugal', 'PT') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('Monaco', 'MC') ON CONFLICT (code) DO NOTHING;
INSERT INTO countries (name, code) VALUES ('UAE', 'AE') ON CONFLICT (code) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cities_name_country ON cities(name, country_id);

-- Reference: cities
INSERT INTO cities (name, country_id) SELECT 'Antwerp', id FROM countries WHERE code = 'BE' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'London', id FROM countries WHERE code = 'GB' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Paris', id FROM countries WHERE code = 'FR' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Toronto', id FROM countries WHERE code = 'CA' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Houston', id FROM countries WHERE code = 'US' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Los Angeles', id FROM countries WHERE code = 'US' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Madrid', id FROM countries WHERE code = 'ES' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Berlin', id FROM countries WHERE code = 'DE' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Manchester', id FROM countries WHERE code = 'GB' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Amsterdam', id FROM countries WHERE code = 'NL' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Brussels', id FROM countries WHERE code = 'BE' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Dublin', id FROM countries WHERE code = 'IE' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Vienna', id FROM countries WHERE code = 'AT' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Stockholm', id FROM countries WHERE code = 'SE' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Rome', id FROM countries WHERE code = 'IT' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Copenhagen', id FROM countries WHERE code = 'DK' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Munich', id FROM countries WHERE code = 'DE' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Chicago', id FROM countries WHERE code = 'US' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Barcelona', id FROM countries WHERE code = 'ES' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Lisbon', id FROM countries WHERE code = 'PT' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'New Orleans', id FROM countries WHERE code = 'US' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'New York', id FROM countries WHERE code = 'US' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Boston', id FROM countries WHERE code = 'US' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Monaco', id FROM countries WHERE code = 'MC' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Las Vegas', id FROM countries WHERE code = 'US' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Boom', id FROM countries WHERE code = 'BE' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Abu Dhabi', id FROM countries WHERE code = 'AE' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Bruges', id FROM countries WHERE code = 'BE' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Indianapolis', id FROM countries WHERE code = 'US' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Pilton', id FROM countries WHERE code = 'GB' ON CONFLICT (name, country_id) DO NOTHING;
INSERT INTO cities (name, country_id) SELECT 'Miami', id FROM countries WHERE code = 'US' ON CONFLICT (name, country_id) DO NOTHING;

-- Reference: venues
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Antwerp Arena', 'antwerp-arena', c.id, 23000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Antwerp' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'London Arena', 'london-arena', c.id, 15000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'London' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Paris Arena', 'paris-arena', c.id, 15000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Paris' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Toronto Arena', 'toronto-arena', c.id, 20000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Toronto' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Houston Arena', 'houston-arena', c.id, 72000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Houston' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Los Angeles Arena', 'los-angeles-arena', c.id, 70000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Los Angeles' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Madrid Arena', 'madrid-arena', c.id, 81000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Madrid' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Berlin Arena', 'berlin-arena', c.id, 17000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Berlin' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Manchester Arena', 'manchester-arena', c.id, 55000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Manchester' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Amsterdam Arena', 'amsterdam-arena', c.id, 17000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Amsterdam' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Brussels Arena', 'brussels-arena', c.id, 15000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Brussels' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Dublin Arena', 'dublin-arena', c.id, 13000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Dublin' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Vienna Arena', 'vienna-arena', c.id, 16000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Vienna' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Stockholm Arena', 'stockholm-arena', c.id, 14000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Stockholm' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Rome Arena', 'rome-arena', c.id, 36000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Rome' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Copenhagen Arena', 'copenhagen-arena', c.id, 38000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Copenhagen' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Munich Arena', 'munich-arena', c.id, 75000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Munich' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Chicago Arena', 'chicago-arena', c.id, 35000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Chicago' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Barcelona Arena', 'barcelona-arena', c.id, 55000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Barcelona' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Lisbon Arena', 'lisbon-arena', c.id, 20000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Lisbon' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'New Orleans Arena', 'new-orleans-arena', c.id, 73000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'New Orleans' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'New York Arena', 'new-york-arena', c.id, 82500 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'New York' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Boston Arena', 'boston-arena', c.id, 19580 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Boston' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Monaco Arena', 'monaco-arena', c.id, 37000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Monaco' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Las Vegas Arena', 'las-vegas-arena', c.id, 20000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Las Vegas' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Boom Arena', 'boom-arena', c.id, 400000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Boom' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Abu Dhabi Arena', 'abu-dhabi-arena', c.id, 12000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Abu Dhabi' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Bruges Arena', 'bruges-arena', c.id, 29000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Bruges' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Indianapolis Arena', 'indianapolis-arena', c.id, 257000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Indianapolis' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Pilton Arena', 'pilton-arena', c.id, 200000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Pilton' LIMIT 1 ON CONFLICT (slug) DO NOTHING;
INSERT INTO venues (name, slug, city_id, capacity) SELECT 'Miami Arena', 'miami-arena', c.id, 65000 FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Miami' LIMIT 1 ON CONFLICT (slug) DO NOTHING;

INSERT INTO source_adapters (name, source_type, base_url, category, enabled, scan_frequency_minutes, reliability_score)
VALUES ('TITAN Mock Seed', 'mock', NULL, 'all', true, 30, 100)
ON CONFLICT (name) DO NOTHING;


INSERT INTO fx_rates (currency, rate_to_eur) VALUES
  ('EUR', 1), ('USD', 0.92), ('GBP', 1.17), ('CAD', 0.68), ('CHF', 1.05), ('AUD', 0.61)
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


INSERT INTO alert_rules (name, enabled, rule_type, threshold, channels, cooldown_minutes)
SELECT 'TOP tier alert', true, 'opportunity_score', 90, '["in_app","email"]'::jsonb, 60
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE name = 'TOP tier alert');

INSERT INTO alert_rules (name, enabled, rule_type, threshold, channels, cooldown_minutes)
SELECT 'Release binnen 24u', true, 'hours_until_drop', 24, '["in_app"]'::jsonb, 120
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE name = 'Release binnen 24u');

INSERT INTO alert_rules (name, enabled, rule_type, threshold, channels, cooldown_minutes)
SELECT 'Nieuwe extreme drop', true, 'priority_level', NULL, '["in_app"]'::jsonb, 30
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE name = 'Nieuwe extreme drop');


-- Releases (enriched mock data)

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Nike Dunk Low Retro — SNKRS NL', 'dunk-low-snkrs-nl-live',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/dunk-low-snkrs-nl-live', 'https://source.example.com/dunk-low-snkrs-nl-live', 'Nike Dunk Low Retro — SNKRS NL is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-06-19T11:32:28.228Z'::timestamptz, '2026-06-22T11:32:28.228Z'::timestamptz, '2026-07-03T11:32:28.228Z'::timestamptz,
  '2026-07-03T11:32:28.228Z'::timestamptz, true, 'Europe/Amsterdam', 'release',
  120, 120, 'EUR', 8000, NULL,
  88, 86, 73, 92, 66, 67,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  120, 195,
  179, 195, 214,
  59, 75, 94,
  49.4, 62.5, 78.2,
  41, 60, 89,
  'HIGH', 'Estimated net ROI 30.2% after stockx fees (EUR). Confidence 41% from 18% estimate spread and data freshness. (Estimated)',
  63, 71, 25, 50, 87, 'HIGH PRIORITY',
  85, 96, 67,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Nike","type":"online","url":"https://official.example.com/dunk-low-snkrs-nl-live","country":"BE"}]'::jsonb, 'Grail-silhouet met beperkte stock — vergelijkbare drops deden +120–180% netto ROI.', 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Pokémon Surging Sparks Booster Bundle', 'surging-sparks-bundle-soon',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/surging-sparks-bundle-soon', 'https://source.example.com/surging-sparks-bundle-soon', 'Pokémon Surging Sparks Booster Bundle is een sealed Pokémon-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-06-20T02:32:28.228Z'::timestamptz, '2026-06-23T02:32:28.228Z'::timestamptz, '2026-07-04T02:32:28.228Z'::timestamptz,
  '2026-07-04T02:32:28.228Z'::timestamptz, true, 'Europe/Amsterdam', 'release',
  32, 32, 'EUR', 12000, NULL,
  72, 70, 61, 78, 54, 63,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Pokémon', 'Surging Sparks', 'bundle', NULL, true,
  32, 48,
  44, 48, 53,
  12, 16, 21,
  37.9, 50, 64.5,
  38, 72, 74,
  'HIGH', 'Estimated net ROI 18.8% after tcgplayer fees (EUR). Confidence 38% from 18% estimate spread and data freshness. (Estimated)',
  55, 65, 23, 50, 72, 'WATCH',
  72, 66, 32,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Taylor Swift — Antwerp (Presale)', 'taylor-antwerp-presale',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'taylor-swift'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'antwerp-arena'),
  (SELECT id FROM countries WHERE code = 'BE'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Antwerp' AND co.code = 'BE' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/taylor-antwerp-presale', 'https://source.example.com/taylor-antwerp-presale', 'Taylor Swift — Antwerp (Presale) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-06-20T06:32:28.228Z'::timestamptz, '2026-06-23T06:32:28.228Z'::timestamptz, '2026-07-04T06:32:28.228Z'::timestamptz,
  '2026-07-04T06:32:28.228Z'::timestamptz, true, 'Europe/Brussels', 'presale',
  89, 295, 'EUR', NULL, 23000,
  95, 96, 77, 97, 71, 69,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  89, NULL,
  163, 165, 185,
  -29, -27, -7,
  -15, -14.2, -3.8,
  26, 74, 96,
  'EXTREME', 'Estimated net ROI -27.1% after stubhub fees (EUR). Confidence 26% from 13% estimate spread and data freshness. (Estimated)',
  65, 88, 11, 70, 87, 'MUST WATCH',
  94, 78, 86,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/taylor-antwerp-presale","country":"BE","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'voorverkoop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Taylor Swift — London (Jun 2026)', 'taylor-swift-london-jun-2026',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'taylor-swift'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'london-arena'),
  (SELECT id FROM countries WHERE code = 'GB'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'London' AND co.code = 'GB' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://www.ticketmaster.co.uk/taylor-swift-london', 'https://source.example.com/taylor-swift-london-jun-2026', 'Taylor Swift — London (Jun 2026) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-06-27T07:00:00.000Z'::timestamptz, '2026-06-30T07:00:00.000Z'::timestamptz, '2026-07-11T07:00:00.000Z'::timestamptz,
  '2026-07-11T07:00:00.000Z'::timestamptz, true, 'Europe/London', 'general_sale',
  95, 380, 'GBP', NULL, 90000,
  96, 97, 78, 98, 72, 69,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  95, NULL,
  202, 204, 228,
  -36, -34, -9,
  -15, -14.2, -3.8,
  22, 74, 97,
  'EXTREME', 'Estimated net ROI -27% after stubhub fees (EUR). Confidence 22% from 13% estimate spread and data freshness. (Estimated)',
  64, 74, 11, 70, 90, 'MUST WATCH',
  93, 90, 46,
  '[{"name":"Ticketmaster","type":"online","url":"https://www.ticketmaster.co.uk/taylor-swift-london","country":"GB","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Coldplay — Paris (Jul 2026)', 'coldplay-paris-jul-2026',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'coldplay'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'paris-arena'),
  (SELECT id FROM countries WHERE code = 'FR'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Paris' AND co.code = 'FR' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/coldplay-paris-jul-2026', 'https://source.example.com/coldplay-paris-jul-2026', 'Coldplay — Paris (Jul 2026) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-06-29T08:00:00.000Z'::timestamptz, '2026-07-02T08:00:00.000Z'::timestamptz, '2026-07-13T08:00:00.000Z'::timestamptz,
  '2026-07-13T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  78, 240, 'EUR', NULL, 80000,
  88, 90, 73, 92, 66, 67,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  78, NULL,
  135, 136, 153,
  -24, -23, -6,
  -15, -14.2, -3.8,
  37, 72, 91,
  'HIGH', 'Estimated net ROI -27% after stubhub fees (EUR). Confidence 37% from 13% estimate spread and data freshness. (Estimated)',
  59, 71, 11, 60, 83, 'WATCH',
  86, 74, 94,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/coldplay-paris-jul-2026","country":"FR","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Drake — Toronto (Aug 2026)', 'drake-toronto-aug-2026',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'drake'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'toronto-arena'),
  (SELECT id FROM countries WHERE code = 'CA'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Toronto' AND co.code = 'CA' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/drake-toronto-aug-2026', 'https://source.example.com/drake-toronto-aug-2026', 'Drake — Toronto (Aug 2026) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-01T13:00:00.000Z'::timestamptz, '2026-07-04T13:00:00.000Z'::timestamptz, '2026-07-15T13:00:00.000Z'::timestamptz,
  '2026-07-15T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  110, 320, 'CAD', NULL, 20000,
  82, 84, 69, 86, 62, 66,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  110, NULL,
  183, 185, 207,
  -32, -30, -8,
  -15, -14.1, -3.8,
  33, 69, 85,
  'EXTREME', 'Estimated net ROI -27% after stubhub fees (EUR). Confidence 33% from 13% estimate spread and data freshness. (Estimated)',
  60, 90, 10, 70, 78, 'WATCH',
  82, 69, 58,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/drake-toronto-aug-2026","country":"CA","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Travis Scott — Houston (Sep 2026)', 'travis-scott-houston-sep-2026',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'travis-scott'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'houston-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Houston' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/travis-scott-houston-sep-2026', 'https://source.example.com/travis-scott-houston-sep-2026', 'Travis Scott — Houston (Sep 2026) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-03T07:00:00.000Z'::timestamptz, '2026-07-06T07:00:00.000Z'::timestamptz, '2026-07-17T07:00:00.000Z'::timestamptz,
  '2026-07-17T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  85, 260, 'USD', NULL, 72000,
  91, 93, 75, 94, 68, 68,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  85, NULL,
  147, 148, 166,
  -26, -24, -7,
  -15, -14.1, -3.8,
  29, 73, 93,
  'EXTREME', 'Estimated net ROI -27% after stubhub fees (EUR). Confidence 29% from 13% estimate spread and data freshness. (Estimated)',
  62, 72, 11, 70, 87, 'HIGH PRIORITY',
  89, 89, 62,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/travis-scott-houston-sep-2026","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Beyoncé — Los Angeles (Oct 2026)', 'beyonce-la-oct-2026',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'beyonc'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'los-angeles-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Los Angeles' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/beyonce-la-oct-2026', 'https://source.example.com/beyonce-la-oct-2026', 'Beyoncé — Los Angeles (Oct 2026) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-05T08:00:00.000Z'::timestamptz, '2026-07-08T08:00:00.000Z'::timestamptz, '2026-07-19T08:00:00.000Z'::timestamptz,
  '2026-07-19T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  120, 420, 'USD', NULL, 70000,
  94, 95, 77, 96, 71, 69,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  120, NULL,
  230, 232, 260,
  -40, -38, -10,
  -15, -14.1, -3.8,
  26, 73, 95,
  'EXTREME', 'Estimated net ROI -27% after stubhub fees (EUR). Confidence 26% from 13% estimate spread and data freshness. (Estimated)',
  61, 73, 11, 70, 85, 'HIGH PRIORITY',
  92, 72, 81,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/beyonce-la-oct-2026","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Bad Bunny — Madrid (Nov 2026)', 'bad-bunny-madrid-nov-2026',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'bad-bunny'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'madrid-arena'),
  (SELECT id FROM countries WHERE code = 'ES'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Madrid' AND co.code = 'ES' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/bad-bunny-madrid-nov-2026', 'https://source.example.com/bad-bunny-madrid-nov-2026', 'Bad Bunny — Madrid (Nov 2026) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-07T13:00:00.000Z'::timestamptz, '2026-07-10T13:00:00.000Z'::timestamptz, '2026-07-21T13:00:00.000Z'::timestamptz,
  '2026-07-21T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  65, 210, 'EUR', NULL, 60000,
  86, 88, 71, 89, 65, 67,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  65, NULL,
  117, 118, 132,
  -21, -19, -5,
  -15, -14.1, -3.7,
  22, 71, 88,
  'EXTREME', 'Estimated net ROI -27% after stubhub fees (EUR). Confidence 22% from 13% estimate spread and data freshness. (Estimated)',
  60, 70, 11, 70, 85, 'WATCH',
  83, 94, 67,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/bad-bunny-madrid-nov-2026","country":"ES","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Billie Eilish — Berlin (Dec 2026)', 'billie-eilish-berlin-dec-2026',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'billie-eilish'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'berlin-arena'),
  (SELECT id FROM countries WHERE code = 'DE'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Berlin' AND co.code = 'DE' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/billie-eilish-berlin-dec-2026', 'https://source.example.com/billie-eilish-berlin-dec-2026', 'Billie Eilish — Berlin (Dec 2026) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-09T07:00:00.000Z'::timestamptz, '2026-07-12T07:00:00.000Z'::timestamptz, '2026-07-23T07:00:00.000Z'::timestamptz,
  '2026-07-23T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  68, 175, 'EUR', NULL, 17000,
  79, 81, 66, 83, 59, 65,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  68, NULL,
  117, 134, 160,
  -4, 12, 38,
  -3.7, 10.3, 31.4,
  22, 68, 82,
  'EXTREME', 'Estimated net ROI -6.3% after stubhub fees (EUR). Confidence 22% from 32% estimate spread and data freshness. (Estimated)',
  61, 93, 14, 70, 76, 'HIGH PRIORITY',
  77, 67, 55,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/billie-eilish-berlin-dec-2026","country":"DE","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Ed Sheeran — Manchester (Jan 2027)', 'ed-sheeran-manchester-jan-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'ed-sheeran'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'manchester-arena'),
  (SELECT id FROM countries WHERE code = 'GB'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Manchester' AND co.code = 'GB' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/ed-sheeran-manchester-jan-2027', 'https://source.example.com/ed-sheeran-manchester-jan-2027', 'Ed Sheeran — Manchester (Jan 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-12T08:00:00.000Z'::timestamptz, '2026-07-15T08:00:00.000Z'::timestamptz, '2026-07-26T08:00:00.000Z'::timestamptz,
  '2026-07-26T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  58, 155, 'GBP', NULL, 55000,
  74, 76, 62, 78, 56, 64,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  58, NULL,
  103, 117, 140,
  -4, 11, 33,
  -3.6, 10.3, 31.4,
  18, 66, 77,
  'EXTREME', 'Estimated net ROI -6.2% after stubhub fees (EUR). Confidence 18% from 32% estimate spread and data freshness. (Estimated)',
  54, 65, 14, 70, 74, 'IGNORE',
  74, 74, 48,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/ed-sheeran-manchester-jan-2027","country":"GB","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Dua Lipa — Amsterdam (Feb 2027)', 'dua-lipa-amsterdam-feb-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'dua-lipa'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'amsterdam-arena'),
  (SELECT id FROM countries WHERE code = 'NL'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Amsterdam' AND co.code = 'NL' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/dua-lipa-amsterdam-feb-2027', 'https://source.example.com/dua-lipa-amsterdam-feb-2027', 'Dua Lipa — Amsterdam (Feb 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-14T13:00:00.000Z'::timestamptz, '2026-07-17T13:00:00.000Z'::timestamptz, '2026-07-28T13:00:00.000Z'::timestamptz,
  '2026-07-28T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  62, 168, 'EUR', NULL, 17000,
  77, 79, 65, 81, 58, 64,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  62, NULL,
  111, 127, 151,
  -4, 12, 36,
  -3.6, 10.3, 31.4,
  14, 67, 80,
  'EXTREME', 'Estimated net ROI -6.2% after stubhub fees (EUR). Confidence 14% from 32% estimate spread and data freshness. (Estimated)',
  61, 93, 14, 70, 75, 'HIGH PRIORITY',
  76, 71, 53,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/dua-lipa-amsterdam-feb-2027","country":"NL","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'The Weeknd — Brussels (Mar 2027)', 'the-weeknd-brussels-mar-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'the-weeknd'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'brussels-arena'),
  (SELECT id FROM countries WHERE code = 'BE'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Brussels' AND co.code = 'BE' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/the-weeknd-brussels-mar-2027', 'https://source.example.com/the-weeknd-brussels-mar-2027', 'The Weeknd — Brussels (Mar 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-16T07:00:00.000Z'::timestamptz, '2026-07-19T07:00:00.000Z'::timestamptz, '2026-07-30T07:00:00.000Z'::timestamptz,
  '2026-07-30T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  72, 225, 'EUR', NULL, 15000,
  80, 82, 67, 84, 60, 65,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  72, NULL,
  143, 164, 195,
  -5, 15, 47,
  -3.6, 10.3, 31.4,
  11, 69, 83,
  'EXTREME', 'Estimated net ROI -6.2% after stubhub fees (EUR). Confidence 11% from 32% estimate spread and data freshness. (Estimated)',
  62, 94, 15, 70, 77, 'HIGH PRIORITY',
  80, 69, 69,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/the-weeknd-brussels-mar-2027","country":"BE","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Arctic Monkeys — Dublin (Apr 2027)', 'arctic-monkeys-dublin-apr-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'arctic-monkeys'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'dublin-arena'),
  (SELECT id FROM countries WHERE code = 'IE'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Dublin' AND co.code = 'IE' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/arctic-monkeys-dublin-apr-2027', 'https://source.example.com/arctic-monkeys-dublin-apr-2027', 'Arctic Monkeys — Dublin (Apr 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-18T08:00:00.000Z'::timestamptz, '2026-07-21T08:00:00.000Z'::timestamptz, '2026-08-01T08:00:00.000Z'::timestamptz,
  '2026-08-01T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  55, 140, 'EUR', NULL, 13000,
  71, 73, 60, 75, 53, 63,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  55, NULL,
  94, 108, 128,
  -4, 10, 31,
  -3.6, 10.3, 31.5,
  8, 65, 74,
  'EXTREME', 'Estimated net ROI -6.2% after stubhub fees (EUR). Confidence 8% from 32% estimate spread and data freshness. (Estimated)',
  59, 96, 14, 70, 71, 'WATCH',
  72, 67, 55,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/arctic-monkeys-dublin-apr-2027","country":"IE","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Post Malone — Vienna (May 2027)', 'post-malone-vienna-may-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'post-malone'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'vienna-arena'),
  (SELECT id FROM countries WHERE code = 'AT'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Vienna' AND co.code = 'AT' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/post-malone-vienna-may-2027', 'https://source.example.com/post-malone-vienna-may-2027', 'Post Malone — Vienna (May 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-20T13:00:00.000Z'::timestamptz, '2026-07-23T13:00:00.000Z'::timestamptz, '2026-08-03T13:00:00.000Z'::timestamptz,
  '2026-08-03T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  60, 165, 'EUR', NULL, 16000,
  68, 70, 57, 72, 51, 62,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  60, NULL,
  108, 124, 148,
  -4, 12, 35,
  -3.6, 10.3, 31.5,
  22, 64, 71,
  'EXTREME', 'Estimated net ROI -6.2% after stubhub fees (EUR). Confidence 22% from 32% estimate spread and data freshness. (Estimated)',
  58, 93, 14, 70, 71, 'WATCH',
  68, 77, 64,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/post-malone-vienna-may-2027","country":"AT","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'SZA — Stockholm (Jun 2027)', 'sza-stockholm-jun-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'sza'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'stockholm-arena'),
  (SELECT id FROM countries WHERE code = 'SE'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Stockholm' AND co.code = 'SE' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/sza-stockholm-jun-2027', 'https://source.example.com/sza-stockholm-jun-2027', 'SZA — Stockholm (Jun 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-22T07:00:00.000Z'::timestamptz, '2026-07-25T07:00:00.000Z'::timestamptz, '2026-08-05T07:00:00.000Z'::timestamptz,
  '2026-08-05T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  58, 150, 'EUR', NULL, 14000,
  73, 75, 61, 77, 55, 63,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  58, NULL,
  100, 115, 137,
  -4, 11, 33,
  -3.6, 10.3, 31.5,
  18, 66, 76,
  'EXTREME', 'Estimated net ROI -6.2% after stubhub fees (EUR). Confidence 18% from 32% estimate spread and data freshness. (Estimated)',
  61, 95, 14, 70, 75, 'WATCH',
  75, 81, 69,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/sza-stockholm-jun-2027","country":"SE","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Olivia Rodrigo — Rome (Jul 2027)', 'olivia-rodrigo-rome-jul-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'olivia-rodrigo'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'rome-arena'),
  (SELECT id FROM countries WHERE code = 'IT'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Rome' AND co.code = 'IT' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/olivia-rodrigo-rome-jul-2027', 'https://source.example.com/olivia-rodrigo-rome-jul-2027', 'Olivia Rodrigo — Rome (Jul 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-24T08:00:00.000Z'::timestamptz, '2026-07-27T08:00:00.000Z'::timestamptz, '2026-08-07T08:00:00.000Z'::timestamptz,
  '2026-08-07T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  64, 178, 'EUR', NULL, 36000,
  76, 78, 64, 80, 57, 64,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  64, NULL,
  117, 134, 159,
  -4, 13, 38,
  -3.6, 10.3, 31.5,
  14, 67, 79,
  'EXTREME', 'Estimated net ROI -6.2% after stubhub fees (EUR). Confidence 14% from 32% estimate spread and data freshness. (Estimated)',
  58, 77, 14, 70, 76, 'WATCH',
  74, 77, 51,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/olivia-rodrigo-rome-jul-2027","country":"IT","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Harry Styles — Copenhagen (Aug 2027)', 'harry-styles-copenhagen-aug-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'harry-styles'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'copenhagen-arena'),
  (SELECT id FROM countries WHERE code = 'DK'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Copenhagen' AND co.code = 'DK' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/harry-styles-copenhagen-aug-2027', 'https://source.example.com/harry-styles-copenhagen-aug-2027', 'Harry Styles — Copenhagen (Aug 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-26T13:00:00.000Z'::timestamptz, '2026-07-29T13:00:00.000Z'::timestamptz, '2026-08-09T13:00:00.000Z'::timestamptz,
  '2026-08-09T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  70, 195, 'EUR', NULL, 38000,
  78, 80, 65, 82, 59, 65,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  70, NULL,
  128, 146, 174,
  -5, 14, 42,
  -3.6, 10.4, 31.5,
  11, 68, 81,
  'EXTREME', 'Estimated net ROI -6.2% after stubhub fees (EUR). Confidence 11% from 32% estimate spread and data freshness. (Estimated)',
  59, 75, 14, 70, 78, 'WATCH',
  77, 83, 58,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/harry-styles-copenhagen-aug-2027","country":"DK","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Metallica — Munich (Sep 2027)', 'metallica-munich-sep-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'metallica'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'munich-arena'),
  (SELECT id FROM countries WHERE code = 'DE'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Munich' AND co.code = 'DE' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/metallica-munich-sep-2027', 'https://source.example.com/metallica-munich-sep-2027', 'Metallica — Munich (Sep 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-28T07:00:00.000Z'::timestamptz, '2026-07-31T07:00:00.000Z'::timestamptz, '2026-08-11T07:00:00.000Z'::timestamptz,
  '2026-08-11T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  88, 220, 'EUR', NULL, 75000,
  72, 74, 61, 76, 54, 63,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  88, NULL,
  148, 170, 203,
  -6, 16, 49,
  -3.6, 10.4, 31.5,
  8, 65, 75,
  'EXTREME', 'Estimated net ROI -6.2% after stubhub fees (EUR). Confidence 8% from 32% estimate spread and data freshness. (Estimated)',
  53, 64, 14, 70, 71, 'IGNORE',
  73, 65, 77,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/metallica-munich-sep-2027","country":"DE","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Adele — London (Oct 2027)', 'adele-london-oct-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'adele'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'london-arena'),
  (SELECT id FROM countries WHERE code = 'GB'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'London' AND co.code = 'GB' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/adele-london-oct-2027', 'https://source.example.com/adele-london-oct-2027', 'Adele — London (Oct 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-31T08:00:00.000Z'::timestamptz, '2026-08-03T08:00:00.000Z'::timestamptz, '2026-08-14T08:00:00.000Z'::timestamptz,
  '2026-08-14T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  105, 350, 'GBP', NULL, 65000,
  90, 92, 75, 94, 68, 68,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  105, NULL,
  220, 252, 300,
  -8, 24, 72,
  -3.4, 10.6, 31.8,
  22, 73, 93,
  'EXTREME', 'Estimated net ROI -6% after stubhub fees (EUR). Confidence 22% from 32% estimate spread and data freshness. (Estimated)',
  63, 72, 15, 70, 86, 'HIGH PRIORITY',
  87, 83, 52,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/adele-london-oct-2027","country":"GB","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Kendrick Lamar — Chicago (Nov 2027)', 'kendrick-chicago-nov-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'kendrick-lamar'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'chicago-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Chicago' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/kendrick-chicago-nov-2027', 'https://source.example.com/kendrick-chicago-nov-2027', 'Kendrick Lamar — Chicago (Nov 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-02T13:00:00.000Z'::timestamptz, '2026-08-05T13:00:00.000Z'::timestamptz, '2026-08-16T13:00:00.000Z'::timestamptz,
  '2026-08-16T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  75, 240, 'USD', NULL, 23000,
  83, 85, 69, 87, 62, 66,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  75, NULL,
  152, 174, 208,
  -5, 17, 50,
  -3.4, 10.6, 31.8,
  18, 70, 86,
  'EXTREME', 'Estimated net ROI -6% after stubhub fees (EUR). Confidence 18% from 32% estimate spread and data freshness. (Estimated)',
  64, 88, 15, 70, 84, 'MUST WATCH',
  82, 96, 37,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/kendrick-chicago-nov-2027","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Rosalía — Barcelona (Dec 2027)', 'rosalia-barcelona-dec-2027',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'rosal-a'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'barcelona-arena'),
  (SELECT id FROM countries WHERE code = 'ES'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Barcelona' AND co.code = 'ES' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/rosalia-barcelona-dec-2027', 'https://source.example.com/rosalia-barcelona-dec-2027', 'Rosalía — Barcelona (Dec 2027) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-04T07:00:00.000Z'::timestamptz, '2026-08-07T07:00:00.000Z'::timestamptz, '2026-08-18T07:00:00.000Z'::timestamptz,
  '2026-08-18T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  52, 145, 'EUR', NULL, 55000,
  69, 71, 58, 73, 52, 62,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  52, NULL,
  95, 109, 130,
  -3, 10, 31,
  -3.4, 10.6, 31.8,
  14, 64, 72,
  'EXTREME', 'Estimated net ROI -6% after stubhub fees (EUR). Confidence 14% from 32% estimate spread and data freshness. (Estimated)',
  54, 63, 14, 70, 75, 'IGNORE',
  71, 95, 80,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/rosalia-barcelona-dec-2027","country":"ES","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Florence + The Machine — Lisbon (Jan 2028)', 'florence-lisbon-jan-2028',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'florence-the-machine'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'lisbon-arena'),
  (SELECT id FROM countries WHERE code = 'PT'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Lisbon' AND co.code = 'PT' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/florence-lisbon-jan-2028', 'https://source.example.com/florence-lisbon-jan-2028', 'Florence + The Machine — Lisbon (Jan 2028) is een concert tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-06T08:00:00.000Z'::timestamptz, '2026-08-09T08:00:00.000Z'::timestamptz, '2026-08-20T08:00:00.000Z'::timestamptz,
  '2026-08-20T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  48, 130, 'EUR', NULL, 20000,
  62, 64, 53, 66, 47, 61,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  48, NULL,
  86, 98, 117,
  -3, 9, 28,
  -3.4, 10.6, 31.8,
  11, 61, 65,
  'EXTREME', 'Estimated net ROI -6% after stubhub fees (EUR). Confidence 11% from 32% estimate spread and data freshness. (Estimated)',
  54, 90, 13, 70, 64, 'IGNORE',
  63, 62, 46,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/florence-lisbon-jan-2028","country":"PT","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Super Bowl LXI — New Orleans', 'super-bowl-lxi-2027',
  (SELECT id FROM release_categories WHERE slug = 'super-bowl'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'nfl'),
  (SELECT id FROM venues WHERE slug = 'new-orleans-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'New Orleans' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/super-bowl-lxi-2027', 'https://source.example.com/super-bowl-lxi-2027', 'Super Bowl LXI — New Orleans is een super bowl met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-07-08T13:00:00.000Z'::timestamptz, '2026-07-11T13:00:00.000Z'::timestamptz, '2026-08-22T13:00:00.000Z'::timestamptz,
  '2026-08-22T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  550, 4800, 'USD', NULL, 73000,
  98, 99, 79, 99, 74, 70,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  550, NULL,
  2585, 2959, 3527,
  -90, 284, 852,
  -3.4, 10.6, 31.8,
  8, 75, 99,
  'EXTREME', 'Estimated net ROI -6% after stubhub fees (EUR). Confidence 8% from 32% estimate spread and data freshness. (Estimated)',
  67, 75, 16, 70, 92, 'TOP OPPORTUNITY',
  98, 99, 76,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/super-bowl-lxi-2027","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'UEFA Champions League Final 2026 — Munich', 'ucl-final-2026-munich',
  (SELECT id FROM release_categories WHERE slug = 'champions-league'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'uefa-champions-league'),
  (SELECT id FROM venues WHERE slug = 'munich-arena'),
  (SELECT id FROM countries WHERE code = 'DE'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Munich' AND co.code = 'DE' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/ucl-final-2026-munich', 'https://source.example.com/ucl-final-2026-munich', 'UEFA Champions League Final 2026 — Munich is een champions league met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-10T07:00:00.000Z'::timestamptz, '2026-08-13T07:00:00.000Z'::timestamptz, '2026-08-24T07:00:00.000Z'::timestamptz,
  '2026-08-24T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  160, 850, 'EUR', NULL, 75000,
  93, 94, 76, 95, 70, 68,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  160, NULL,
  488, 559, 666,
  -17, 54, 161,
  -3.4, 10.6, 31.9,
  22, 73, 94,
  'EXTREME', 'Estimated net ROI -6% after stubhub fees (EUR). Confidence 22% from 32% estimate spread and data freshness. (Estimated)',
  65, 73, 15, 70, 90, 'MUST WATCH',
  91, 99, 66,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/ucl-final-2026-munich","country":"DE","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'FIFA World Cup Final 2026 — New York', 'world-cup-final-2026-nyc',
  (SELECT id FROM release_categories WHERE slug = 'world-cup'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'fifa'),
  (SELECT id FROM venues WHERE slug = 'new-york-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'New York' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/world-cup-final-2026-nyc', 'https://source.example.com/world-cup-final-2026-nyc', 'FIFA World Cup Final 2026 — New York is een world cup met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-12T08:00:00.000Z'::timestamptz, '2026-08-15T08:00:00.000Z'::timestamptz, '2026-08-26T08:00:00.000Z'::timestamptz,
  '2026-08-26T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  320, 2100, 'USD', NULL, 82500,
  97, 98, 78, 98, 73, 69,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  320, NULL,
  1170, 1339, 1596,
  -40, 129, 386,
  -3.3, 10.7, 31.9,
  18, 74, 98,
  'EXTREME', 'Estimated net ROI -5.9% after stubhub fees (EUR). Confidence 18% from 32% estimate spread and data freshness. (Estimated)',
  67, 74, 15, 70, 92, 'TOP OPPORTUNITY',
  97, 100, 53,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/world-cup-final-2026-nyc","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'El Clásico — Bernabéu Apr 2026', 'el-clasico-apr-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'la-liga'),
  (SELECT id FROM venues WHERE slug = 'madrid-arena'),
  (SELECT id FROM countries WHERE code = 'ES'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Madrid' AND co.code = 'ES' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/el-clasico-apr-2026', 'https://source.example.com/el-clasico-apr-2026', 'El Clásico — Bernabéu Apr 2026 is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-14T13:00:00.000Z'::timestamptz, '2026-08-17T13:00:00.000Z'::timestamptz, '2026-08-28T13:00:00.000Z'::timestamptz,
  '2026-08-28T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  85, 520, 'EUR', NULL, 81000,
  89, 91, 74, 93, 67, 67,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  85, NULL,
  292, 335, 399,
  -10, 32, 96,
  -3.3, 10.7, 31.9,
  14, 72, 92,
  'EXTREME', 'Estimated net ROI -5.9% after stubhub fees (EUR). Confidence 14% from 32% estimate spread and data freshness. (Estimated)',
  63, 72, 15, 70, 86, 'HIGH PRIORITY',
  88, 89, 94,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/el-clasico-apr-2026","country":"ES","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Premier League — Arsenal vs Liverpool', 'pl-arsenal-liverpool-aug-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'premier-league'),
  (SELECT id FROM venues WHERE slug = 'london-arena'),
  (SELECT id FROM countries WHERE code = 'GB'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'London' AND co.code = 'GB' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/pl-arsenal-liverpool-aug-2026', 'https://source.example.com/pl-arsenal-liverpool-aug-2026', 'Premier League — Arsenal vs Liverpool is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-16T07:00:00.000Z'::timestamptz, '2026-08-19T07:00:00.000Z'::timestamptz, '2026-08-30T07:00:00.000Z'::timestamptz,
  '2026-08-30T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  65, 260, 'GBP', NULL, 60704,
  84, 86, 70, 88, 63, 66,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  65, NULL,
  157, 180, 214,
  -5, 17, 52,
  -3.3, 10.7, 31.9,
  11, 70, 87,
  'EXTREME', 'Estimated net ROI -5.9% after stubhub fees (EUR). Confidence 11% from 32% estimate spread and data freshness. (Estimated)',
  59, 70, 15, 70, 80, 'WATCH',
  82, 71, 75,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/pl-arsenal-liverpool-aug-2026","country":"GB","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'NBA Finals Game 7 — Boston', 'nba-finals-game7-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'nba'),
  (SELECT id FROM venues WHERE slug = 'boston-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Boston' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/nba-finals-game7-2026', 'https://source.example.com/nba-finals-game7-2026', 'NBA Finals Game 7 — Boston is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-19T08:00:00.000Z'::timestamptz, '2026-08-22T08:00:00.000Z'::timestamptz, '2026-09-02T08:00:00.000Z'::timestamptz,
  '2026-09-02T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  220, 1600, 'USD', NULL, 19580,
  90, 92, 75, 94, 68, 68,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  220, NULL,
  880, 1007, 1200,
  -30, 97, 290,
  -3.3, 10.7, 31.9,
  8, 73, 93,
  'EXTREME', 'Estimated net ROI -5.9% after stubhub fees (EUR). Confidence 8% from 32% estimate spread and data freshness. (Estimated)',
  67, 90, 15, 70, 87, 'MUST WATCH',
  90, 89, 67,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/nba-finals-game7-2026","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Formula 1 Monaco GP 2026', 'f1-monaco-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'formula-1'),
  (SELECT id FROM venues WHERE slug = 'monaco-arena'),
  (SELECT id FROM countries WHERE code = 'MC'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Monaco' AND co.code = 'MC' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/f1-monaco-2026', 'https://source.example.com/f1-monaco-2026', 'Formula 1 Monaco GP 2026 is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-21T13:00:00.000Z'::timestamptz, '2026-08-24T13:00:00.000Z'::timestamptz, '2026-09-04T13:00:00.000Z'::timestamptz,
  '2026-09-04T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  160, 820, 'EUR', NULL, 37000,
  86, 88, 72, 90, 65, 67,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  160, NULL,
  475, 543, 648,
  -15, 53, 158,
  -3.1, 10.9, 32.2,
  22, 71, 89,
  'EXTREME', 'Estimated net ROI -5.7% after stubhub fees (EUR). Confidence 22% from 32% estimate spread and data freshness. (Estimated)',
  63, 76, 15, 70, 85, 'HIGH PRIORITY',
  87, 91, 38,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/f1-monaco-2026","country":"MC","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'UFC 320 — Las Vegas', 'ufc-320-las-vegas-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'ufc'),
  (SELECT id FROM venues WHERE slug = 'las-vegas-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Las Vegas' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/ufc-320-las-vegas-2026', 'https://source.example.com/ufc-320-las-vegas-2026', 'UFC 320 — Las Vegas is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-23T07:00:00.000Z'::timestamptz, '2026-08-26T07:00:00.000Z'::timestamptz, '2026-09-06T07:00:00.000Z'::timestamptz,
  '2026-09-06T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  155, 1250, 'USD', NULL, 20000,
  87, 89, 73, 91, 65, 67,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  155, NULL,
  681, 779, 929,
  -22, 77, 226,
  -3.1, 10.9, 32.2,
  18, 71, 90,
  'EXTREME', 'Estimated net ROI -5.7% after stubhub fees (EUR). Confidence 18% from 32% estimate spread and data freshness. (Estimated)',
  63, 90, 15, 70, 81, 'HIGH PRIORITY',
  86, 67, 73,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/ufc-320-las-vegas-2026","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Wimbledon Gentlemen''s Final 2026', 'wimbledon-final-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'wimbledon'),
  (SELECT id FROM venues WHERE slug = 'london-arena'),
  (SELECT id FROM countries WHERE code = 'GB'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'London' AND co.code = 'GB' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/wimbledon-final-2026', 'https://source.example.com/wimbledon-final-2026', 'Wimbledon Gentlemen''s Final 2026 is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-25T08:00:00.000Z'::timestamptz, '2026-08-28T08:00:00.000Z'::timestamptz, '2026-09-08T08:00:00.000Z'::timestamptz,
  '2026-09-08T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  110, 620, 'GBP', NULL, 15000,
  82, 84, 69, 86, 62, 66,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  110, NULL,
  354, 405, 483,
  -11, 40, 118,
  -3.1, 10.9, 32.2,
  14, 69, 85,
  'EXTREME', 'Estimated net ROI -5.7% after stubhub fees (EUR). Confidence 14% from 32% estimate spread and data freshness. (Estimated)',
  63, 94, 15, 70, 79, 'HIGH PRIORITY',
  81, 73, 69,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/wimbledon-final-2026","country":"GB","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Tomorrowland 2026 — Weekend 1', 'tomorrowland-2026-w1',
  (SELECT id FROM release_categories WHERE slug = 'festivals'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'festivals'),
  (SELECT id FROM venues WHERE slug = 'boom-arena'),
  (SELECT id FROM countries WHERE code = 'BE'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Boom' AND co.code = 'BE' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/tomorrowland-2026-w1', 'https://source.example.com/tomorrowland-2026-w1', 'Tomorrowland 2026 — Weekend 1 is een festivals met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-27T13:00:00.000Z'::timestamptz, '2026-08-30T13:00:00.000Z'::timestamptz, '2026-09-10T13:00:00.000Z'::timestamptz,
  '2026-09-10T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  125, 410, 'EUR', NULL, 400000,
  92, 94, 76, 95, 69, 68,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  125, NULL,
  259, 297, 354,
  -8, 29, 86,
  -3.1, 10.9, 32.2,
  11, 73, 94,
  'EXTREME', 'Estimated net ROI -5.7% after stubhub fees (EUR). Confidence 11% from 32% estimate spread and data freshness. (Estimated)',
  63, 73, 15, 70, 87, 'HIGH PRIORITY',
  91, 84, 62,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/tomorrowland-2026-w1","country":"BE","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Six Nations — France vs Ireland', 'six-nations-fr-ie-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'six-nations'),
  (SELECT id FROM venues WHERE slug = 'paris-arena'),
  (SELECT id FROM countries WHERE code = 'FR'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Paris' AND co.code = 'FR' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/six-nations-fr-ie-2026', 'https://source.example.com/six-nations-fr-ie-2026', 'Six Nations — France vs Ireland is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-29T07:00:00.000Z'::timestamptz, '2026-09-01T07:00:00.000Z'::timestamptz, '2026-09-12T07:00:00.000Z'::timestamptz,
  '2026-09-12T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  70, 280, 'EUR', NULL, 81000,
  76, 78, 64, 80, 57, 64,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  70, NULL,
  170, 194, 231,
  -5, 19, 56,
  -3.1, 10.9, 32.2,
  8, 67, 79,
  'EXTREME', 'Estimated net ROI -5.7% after stubhub fees (EUR). Confidence 8% from 32% estimate spread and data freshness. (Estimated)',
  55, 66, 14, 70, 75, 'IGNORE',
  76, 75, 65,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/six-nations-fr-ie-2026","country":"FR","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'EuroLeague Final Four 2026', 'euroleague-final-four-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'euroleague'),
  (SELECT id FROM venues WHERE slug = 'abu-dhabi-arena'),
  (SELECT id FROM countries WHERE code = 'AE'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Abu Dhabi' AND co.code = 'AE' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/euroleague-final-four-2026', 'https://source.example.com/euroleague-final-four-2026', 'EuroLeague Final Four 2026 is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-08-31T08:00:00.000Z'::timestamptz, '2026-09-03T08:00:00.000Z'::timestamptz, '2026-09-14T08:00:00.000Z'::timestamptz,
  '2026-09-14T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  90, 450, 'EUR', NULL, 12000,
  70, 72, 59, 74, 53, 63,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  90, NULL,
  262, 300, 357,
  -8, 30, 87,
  -3.1, 11, 32.2,
  22, 65, 73,
  'EXTREME', 'Estimated net ROI -5.7% after stubhub fees (EUR). Confidence 22% from 32% estimate spread and data freshness. (Estimated)',
  59, 97, 14, 70, 72, 'WATCH',
  71, 75, 41,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/euroleague-final-four-2026","country":"AE","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Tour de France — Champs-Élysées Stage', 'tdf-champs-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'cycling'),
  (SELECT id FROM venues WHERE slug = 'paris-arena'),
  (SELECT id FROM countries WHERE code = 'FR'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Paris' AND co.code = 'FR' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/tdf-champs-2026', 'https://source.example.com/tdf-champs-2026', 'Tour de France — Champs-Élysées Stage is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-02T13:00:00.000Z'::timestamptz, '2026-09-05T13:00:00.000Z'::timestamptz, '2026-09-16T13:00:00.000Z'::timestamptz,
  '2026-09-16T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  0, 120, 'EUR', NULL, 500000,
  65, 68, 56, 70, 49, 61,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  0, NULL,
  58, 67, 79,
  -2, 7, 19,
  -3.1, 11, 32.3,
  18, 63, 69,
  'EXTREME', 'Estimated net ROI -5.7% after stubhub fees (EUR). Confidence 18% from 32% estimate spread and data freshness. (Estimated)',
  51, 62, 14, 70, 69, 'IGNORE',
  67, 73, 49,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/tdf-champs-2026","country":"FR","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Belgian Pro League — Derby Brugge-Antwerp', 'jupiler-derby-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'jupiler-pro-league'),
  (SELECT id FROM venues WHERE slug = 'bruges-arena'),
  (SELECT id FROM countries WHERE code = 'BE'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Bruges' AND co.code = 'BE' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/jupiler-derby-2026', 'https://source.example.com/jupiler-derby-2026', 'Belgian Pro League — Derby Brugge-Antwerp is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-04T07:00:00.000Z'::timestamptz, '2026-09-07T07:00:00.000Z'::timestamptz, '2026-09-18T07:00:00.000Z'::timestamptz,
  '2026-09-18T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  35, 95, 'EUR', NULL, 29000,
  58, 60, 49, 62, 44, 60,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  35, NULL,
  63, 72, 86,
  -2, 7, 21,
  -3.1, 11, 32.3,
  14, 60, 61,
  'EXTREME', 'Estimated net ROI -5.7% after stubhub fees (EUR). Confidence 14% from 32% estimate spread and data freshness. (Estimated)',
  53, 83, 13, 70, 66, 'IGNORE',
  60, 87, 53,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/jupiler-derby-2026","country":"BE","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Roland-Garros Men''s Final 2026', 'roland-garros-final-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'tennis'),
  (SELECT id FROM venues WHERE slug = 'paris-arena'),
  (SELECT id FROM countries WHERE code = 'FR'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Paris' AND co.code = 'FR' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/roland-garros-final-2026', 'https://source.example.com/roland-garros-final-2026', 'Roland-Garros Men''s Final 2026 is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-07T08:00:00.000Z'::timestamptz, '2026-09-10T08:00:00.000Z'::timestamptz, '2026-09-21T08:00:00.000Z'::timestamptz,
  '2026-09-21T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  95, 480, 'EUR', NULL, 15000,
  80, 82, 67, 84, 60, 65,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  95, NULL,
  279, 319, 380,
  -9, 32, 93,
  -3.1, 11, 32.3,
  11, 69, 83,
  'EXTREME', 'Estimated net ROI -5.7% after stubhub fees (EUR). Confidence 11% from 32% estimate spread and data freshness. (Estimated)',
  62, 94, 15, 70, 78, 'HIGH PRIORITY',
  80, 74, 48,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/roland-garros-final-2026","country":"FR","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'NHL Winter Classic 2027', 'nhl-winter-classic-2027',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'nhl'),
  (SELECT id FROM venues WHERE slug = 'chicago-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Chicago' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/nhl-winter-classic-2027', 'https://source.example.com/nhl-winter-classic-2027', 'NHL Winter Classic 2027 is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-09T13:00:00.000Z'::timestamptz, '2026-09-12T13:00:00.000Z'::timestamptz, '2026-09-23T13:00:00.000Z'::timestamptz,
  '2026-09-23T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  130, 650, 'USD', NULL, 35000,
  74, 76, 62, 78, 56, 64,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  130, NULL,
  378, 433, 516,
  -12, 43, 126,
  -3.1, 11, 32.3,
  8, 66, 77,
  'EXTREME', 'Estimated net ROI -5.7% after stubhub fees (EUR). Confidence 8% from 32% estimate spread and data freshness. (Estimated)',
  59, 78, 14, 70, 79, 'WATCH',
  75, 98, 39,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/nhl-winter-classic-2027","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Indy 500 2026', 'indy-500-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'indycar'),
  (SELECT id FROM venues WHERE slug = 'indianapolis-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Indianapolis' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/indy-500-2026', 'https://source.example.com/indy-500-2026', 'Indy 500 2026 is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-11T07:00:00.000Z'::timestamptz, '2026-09-14T07:00:00.000Z'::timestamptz, '2026-09-25T07:00:00.000Z'::timestamptz,
  '2026-09-25T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  45, 350, 'USD', NULL, 257000,
  72, 74, 61, 76, 54, 63,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  45, NULL,
  192, 220, 262,
  -6, 22, 64,
  -2.9, 11.2, 32.6,
  22, 65, 75,
  'EXTREME', 'Estimated net ROI -5.5% after stubhub fees (EUR). Confidence 22% from 32% estimate spread and data freshness. (Estimated)',
  53, 64, 14, 70, 72, 'IGNORE',
  71, 68, 57,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/indy-500-2026","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Glastonbury 2026 — General Sale', 'glastonbury-2026',
  (SELECT id FROM release_categories WHERE slug = 'festivals'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'festivals'),
  (SELECT id FROM venues WHERE slug = 'pilton-arena'),
  (SELECT id FROM countries WHERE code = 'GB'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Pilton' AND co.code = 'GB' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/glastonbury-2026', 'https://source.example.com/glastonbury-2026', 'Glastonbury 2026 — General Sale is een festivals met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-13T08:00:00.000Z'::timestamptz, '2026-09-16T08:00:00.000Z'::timestamptz, '2026-09-27T08:00:00.000Z'::timestamptz,
  '2026-09-27T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  355, 355, 'GBP', NULL, 200000,
  88, 90, 73, 92, 66, 67,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  355, NULL,
  345, 395, 471,
  -10, 40, 116,
  -2.9, 11.2, 32.6,
  18, 72, 91,
  'EXTREME', 'Estimated net ROI -5.5% after stubhub fees (EUR). Confidence 18% from 32% estimate spread and data freshness. (Estimated)',
  61, 71, 15, 70, 83, 'WATCH',
  88, 78, 62,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/glastonbury-2026","country":"GB","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Copa América Final 2026', 'copa-america-final-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'conmebol'),
  (SELECT id FROM venues WHERE slug = 'miami-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Miami' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/copa-america-final-2026', 'https://source.example.com/copa-america-final-2026', 'Copa América Final 2026 is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-15T13:00:00.000Z'::timestamptz, '2026-09-18T13:00:00.000Z'::timestamptz, '2026-09-29T13:00:00.000Z'::timestamptz,
  '2026-09-29T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  140, 720, 'USD', NULL, 65000,
  85, 87, 71, 89, 64, 66,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  140, NULL,
  418, 478, 570,
  -12, 48, 140,
  -2.9, 11.2, 32.6,
  14, 71, 88,
  'EXTREME', 'Estimated net ROI -5.5% after stubhub fees (EUR). Confidence 14% from 32% estimate spread and data freshness. (Estimated)',
  62, 70, 15, 70, 86, 'HIGH PRIORITY',
  86, 100, 59,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/copa-america-final-2026","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Olympics Opening Ceremony 2028', 'olympics-opening-2028',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL,
  NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'olympics'),
  (SELECT id FROM venues WHERE slug = 'los-angeles-arena'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT c.id FROM cities c JOIN countries co ON c.country_id = co.id WHERE c.name = 'Los Angeles' AND co.code = 'US' LIMIT 1),
  'ticket'::release_type, 'announced'::release_status,
  'https://official.example.com/olympics-opening-2028', 'https://source.example.com/olympics-opening-2028', 'Olympics Opening Ceremony 2028 is een sport tickets met extreme vraag. Ideaal voor monitoring van officiële voorverkoop en algemene verkoop — geen doorverkoop-advies in België.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-17T07:00:00.000Z'::timestamptz, '2026-09-20T07:00:00.000Z'::timestamptz, '2026-10-01T07:00:00.000Z'::timestamptz,
  '2026-10-01T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  200, 1200, 'USD', NULL, 70000,
  91, 93, 75, 94, 68, 68,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  200, NULL,
  680, 779, 928,
  -20, 79, 228,
  -2.9, 11.2, 32.6,
  11, 73, 93,
  'EXTREME', 'Estimated net ROI -5.4% after stubhub fees (EUR). Confidence 11% from 32% estimate spread and data freshness. (Estimated)',
  64, 72, 15, 70, 88, 'MUST WATCH',
  92, 92, 88,
  '[{"name":"Ticketmaster","type":"online","url":"https://official.example.com/olympics-opening-2028","country":"US","note":"Alleen officiële kanalen"}]'::jsonb, 'Massale vraag, beperkte capaciteit — monitoring essentieel voor voorverkoop.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Air Jordan 1 Travis Scott Medium Olive', 'aj1-travis-medium-olive',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'jordan'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/aj1-travis-medium-olive', 'https://source.example.com/aj1-travis-medium-olive', 'Air Jordan 1 Travis Scott Medium Olive is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-19T08:00:00.000Z'::timestamptz, '2026-09-22T08:00:00.000Z'::timestamptz, '2026-10-03T08:00:00.000Z'::timestamptz,
  '2026-10-03T08:00:00.000Z'::timestamptz, true, 'Europe/Amsterdam', 'release',
  150, 150, 'EUR', 6000, NULL,
  94, 92, 76, 96, 71, 69,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  150, 420,
  377, 420, 472,
  227, 270, 322,
  151.1, 180, 214.7,
  26, 63, 94,
  'EXTREME', 'Estimated net ROI 135.8% after stockx fees (EUR). Confidence 26% from 23% estimate spread and data freshness. (Estimated)',
  76, 73, 59, 60, 90, 'TOP OPPORTUNITY',
  93, 100, 51,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Jordan","type":"online","url":"https://official.example.com/aj1-travis-medium-olive","country":"BE"}]'::jsonb, 'Grail-silhouet met beperkte stock — vergelijkbare drops deden +120–180% netto ROI.', 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Nike Dunk Low Panda Restock', 'dunk-low-panda-restock',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/dunk-low-panda-restock', 'https://source.example.com/dunk-low-panda-restock', 'Nike Dunk Low Panda Restock is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-21T13:00:00.000Z'::timestamptz, '2026-09-24T13:00:00.000Z'::timestamptz, '2026-10-05T13:00:00.000Z'::timestamptz,
  '2026-10-05T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  110, 110, 'EUR', 85000, NULL,
  62, 58, 53, 68, 47, 61,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  110, 125,
  112, 125, 140,
  2, 15, 30,
  1.9, 13.6, 27.7,
  41, 25, 63,
  'HIGH', 'Estimated net ROI -13.9% after stockx fees (EUR). Confidence 41% from 23% estimate spread and data freshness. (Estimated)',
  39, 61, 5, 60, 62, 'IGNORE',
  60, 48, 60,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Nike","type":"online","url":"https://official.example.com/dunk-low-panda-restock","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Nike Mercurial Superfly Elite', 'mercurial-superfly-elite',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/mercurial-superfly-elite', 'https://source.example.com/mercurial-superfly-elite', 'Nike Mercurial Superfly Elite is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-23T07:00:00.000Z'::timestamptz, '2026-09-26T07:00:00.000Z'::timestamptz, '2026-10-07T07:00:00.000Z'::timestamptz,
  '2026-10-07T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  220, 220, 'EUR', 4000, NULL,
  78, 75, 65, 82, 59, 65,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  220, 310,
  278, 310, 348,
  58, 90, 128,
  26.3, 40.9, 58.4,
  37, 65, 78,
  'HIGH', 'Estimated net ROI 16.9% after stockx fees (EUR). Confidence 37% from 23% estimate spread and data freshness. (Estimated)',
  58, 68, 22, 50, 79, 'WATCH',
  75, 89, 73,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Nike","type":"online","url":"https://official.example.com/mercurial-superfly-elite","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Nike Phantom GX Elite Drop', 'phantom-gx-elite',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/phantom-gx-elite', 'https://source.example.com/phantom-gx-elite', 'Nike Phantom GX Elite Drop is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-25T08:00:00.000Z'::timestamptz, '2026-09-28T08:00:00.000Z'::timestamptz, '2026-10-09T08:00:00.000Z'::timestamptz,
  '2026-10-09T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  250, 250, 'EUR', 3500, NULL,
  74, 71, 61, 78, 56, 64,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  250, 295,
  265, 295, 332,
  15, 45, 82,
  5.8, 18, 32.6,
  34, 66, 74,
  'EXTREME', 'Estimated net ROI -2.4% after stockx fees (EUR). Confidence 34% from 23% estimate spread and data freshness. (Estimated)',
  54, 73, 16, 70, 71, 'IGNORE',
  72, 62, 69,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Nike","type":"online","url":"https://official.example.com/phantom-gx-elite","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Adidas F50 Elite Limited', 'adidas-f50-elite',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'adidas'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/adidas-f50-elite', 'https://source.example.com/adidas-f50-elite', 'Adidas F50 Elite Limited is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-28T13:00:00.000Z'::timestamptz, '2026-10-01T13:00:00.000Z'::timestamptz, '2026-10-12T13:00:00.000Z'::timestamptz,
  '2026-10-12T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  280, 280, 'EUR', 2800, NULL,
  72, 69, 60, 76, 54, 63,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  280, 340,
  305, 340, 382,
  25, 60, 102,
  8.9, 21.4, 36.5,
  30, 67, 72,
  'EXTREME', 'Estimated net ROI 1.2% after stockx fees (EUR). Confidence 30% from 23% estimate spread and data freshness. (Estimated)',
  54, 78, 17, 60, 70, 'IGNORE',
  70, 60, 71,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Adidas","type":"online","url":"https://official.example.com/adidas-f50-elite","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'New Balance 550 x Aime Leon Dore', 'nb550-ald',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'new-balance'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/nb550-ald', 'https://source.example.com/nb550-ald', 'New Balance 550 x Aime Leon Dore is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-09-30T07:00:00.000Z'::timestamptz, '2026-10-03T07:00:00.000Z'::timestamptz, '2026-10-14T07:00:00.000Z'::timestamptz,
  '2026-10-14T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  140, 140, 'EUR', 4500, NULL,
  80, 77, 67, 85, 60, 65,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  140, 265,
  238, 265, 298,
  98, 125, 158,
  69.7, 89.3, 112.8,
  26, 64, 81,
  'EXTREME', 'Estimated net ROI 55.5% after stockx fees (EUR). Confidence 26% from 23% estimate spread and data freshness. (Estimated)',
  62, 68, 33, 60, 81, 'HIGH PRIORITY',
  77, 88, 46,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"New Balance","type":"online","url":"https://official.example.com/nb550-ald","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Nike Air Max 1 OG Red', 'air-max-1-og-red',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/air-max-1-og-red', 'https://source.example.com/air-max-1-og-red', 'Nike Air Max 1 OG Red is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-02T08:00:00.000Z'::timestamptz, '2026-10-05T08:00:00.000Z'::timestamptz, '2026-10-16T08:00:00.000Z'::timestamptz,
  '2026-10-16T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  160, 160, 'EUR', 12000, NULL,
  68, 65, 57, 72, 51, 62,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  160, 195,
  175, 195, 219,
  15, 35, 59,
  9.2, 21.9, 37,
  41, 55, 68,
  'HIGH', 'Estimated net ROI -2.4% after stockx fees (EUR). Confidence 41% from 23% estimate spread and data freshness. (Estimated)',
  48, 62, 14, 60, 68, 'IGNORE',
  66, 63, 55,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Nike","type":"online","url":"https://official.example.com/air-max-1-og-red","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Yeezy Slide Slate Grey Restock', 'yeezy-slide-slate',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'adidas'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/yeezy-slide-slate', 'https://source.example.com/yeezy-slide-slate', 'Yeezy Slide Slate Grey Restock is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-04T13:00:00.000Z'::timestamptz, '2026-10-07T13:00:00.000Z'::timestamptz, '2026-10-18T13:00:00.000Z'::timestamptz,
  '2026-10-18T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  70, 70, 'EUR', 120000, NULL,
  55, 52, 46, 58, 41, 59,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  70, 78,
  70, 78, 88,
  0, 8, 18,
  -0.1, 11.4, 25.3,
  37, 25, 55,
  'HIGH', 'Estimated net ROI -23.6% after stockx fees (EUR). Confidence 37% from 23% estimate spread and data freshness. (Estimated)',
  37, 56, 4, 60, 58, 'IGNORE',
  55, 60, 37,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Adidas","type":"online","url":"https://official.example.com/yeezy-slide-slate","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Nike SB Dunk Low Pro J-Pack Chicago', 'sb-dunk-jpack-chicago',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/sb-dunk-jpack-chicago', 'https://source.example.com/sb-dunk-jpack-chicago', 'Nike SB Dunk Low Pro J-Pack Chicago is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-06T07:00:00.000Z'::timestamptz, '2026-10-09T07:00:00.000Z'::timestamptz, '2026-10-20T07:00:00.000Z'::timestamptz,
  '2026-10-20T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  115, 115, 'EUR', 7000, NULL,
  76, 73, 63, 80, 57, 64,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  115, 210,
  188, 210, 236,
  73, 95, 121,
  63.7, 82.6, 105.3,
  34, 61, 76,
  'EXTREME', 'Estimated net ROI 47.3% after stockx fees (EUR). Confidence 34% from 23% estimate spread and data freshness. (Estimated)',
  60, 66, 30, 60, 79, 'WATCH',
  74, 93, 44,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Nike","type":"online","url":"https://official.example.com/sb-dunk-jpack-chicago","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Salomon XT-6 Gorpcore Drop', 'salomon-xt6-drop',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'salomon'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/salomon-xt6-drop', 'https://source.example.com/salomon-xt6-drop', 'Salomon XT-6 Gorpcore Drop is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-08T08:00:00.000Z'::timestamptz, '2026-10-11T08:00:00.000Z'::timestamptz, '2026-10-22T08:00:00.000Z'::timestamptz,
  '2026-10-22T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  180, 180, 'EUR', 9000, NULL,
  64, 61, 52, 66, 48, 61,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  180, 205,
  184, 205, 231,
  4, 25, 51,
  2.1, 13.9, 28.1,
  30, 59, 63,
  'EXTREME', 'Estimated net ROI -8.4% after stockx fees (EUR). Confidence 30% from 23% estimate spread and data freshness. (Estimated)',
  46, 60, 12, 70, 62, 'IGNORE',
  62, 55, 57,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Salomon","type":"online","url":"https://official.example.com/salomon-xt6-drop","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Asics Gel-Kayano 14 Silver', 'asics-kayano-14-silver',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'asics'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/asics-kayano-14-silver', 'https://source.example.com/asics-kayano-14-silver', 'Asics Gel-Kayano 14 Silver is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-10T13:00:00.000Z'::timestamptz, '2026-10-13T13:00:00.000Z'::timestamptz, '2026-10-24T13:00:00.000Z'::timestamptz,
  '2026-10-24T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  150, 150, 'EUR', 15000, NULL,
  58, 55, 47, 60, 44, 60,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  150, 168,
  151, 168, 189,
  1, 18, 39,
  0.4, 12, 25.9,
  26, 51, 57,
  'EXTREME', 'Estimated net ROI -11.7% after stockx fees (EUR). Confidence 26% from 23% estimate spread and data freshness. (Estimated)',
  42, 57, 10, 70, 59, 'IGNORE',
  55, 59, 41,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Asics","type":"online","url":"https://official.example.com/asics-kayano-14-silver","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Nike Air Force 1 Low Luxe', 'af1-low-luxe',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/af1-low-luxe', 'https://source.example.com/af1-low-luxe', 'Nike Air Force 1 Low Luxe is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-12T07:00:00.000Z'::timestamptz, '2026-10-15T07:00:00.000Z'::timestamptz, '2026-10-26T07:00:00.000Z'::timestamptz,
  '2026-10-26T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  130, 130, 'EUR', 25000, NULL,
  52, 50, 43, 55, 39, 58,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  130, 142,
  127, 142, 160,
  -3, 12, 30,
  -2.1, 9.2, 22.8,
  41, 39, 52,
  'HIGH', 'Estimated net ROI -15.7% after stockx fees (EUR). Confidence 41% from 23% estimate spread and data freshness. (Estimated)',
  38, 55, 8, 60, 56, 'IGNORE',
  52, 56, 70,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Nike","type":"online","url":"https://official.example.com/af1-low-luxe","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Jordan 4 Military Blue', 'jordan-4-military-blue',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'jordan'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/jordan-4-military-blue', 'https://source.example.com/jordan-4-military-blue', 'Jordan 4 Military Blue is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-14T08:00:00.000Z'::timestamptz, '2026-10-17T08:00:00.000Z'::timestamptz, '2026-10-28T08:00:00.000Z'::timestamptz,
  '2026-10-28T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  210, 210, 'EUR', 11000, NULL,
  82, 79, 68, 86, 62, 66,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  210, 285,
  255, 285, 320,
  45, 75, 110,
  21.6, 35.7, 52.6,
  37, 56, 82,
  'HIGH', 'Estimated net ROI 12% after stockx fees (EUR). Confidence 37% from 23% estimate spread and data freshness. (Estimated)',
  58, 69, 19, 50, 82, 'WATCH',
  81, 92, 30,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Jordan","type":"online","url":"https://official.example.com/jordan-4-military-blue","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Adidas Samba OG White', 'samba-og-white',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'adidas'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/samba-og-white', 'https://source.example.com/samba-og-white', 'Adidas Samba OG White is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-17T13:00:00.000Z'::timestamptz, '2026-10-20T13:00:00.000Z'::timestamptz, '2026-10-31T13:00:00.000Z'::timestamptz,
  '2026-10-31T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  120, 120, 'EUR', 40000, NULL,
  48, 46, 39, 50, 36, 57,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  120, 128,
  115, 128, 144,
  -5, 8, 24,
  -4.4, 6.7, 19.9,
  34, 25, 48,
  'EXTREME', 'Estimated net ROI -18.9% after stockx fees (EUR). Confidence 34% from 23% estimate spread and data freshness. (Estimated)',
  33, 53, 4, 70, 52, 'IGNORE',
  46, 53, 30,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Adidas","type":"online","url":"https://official.example.com/samba-og-white","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Nike Zoom Vomero 5 Photon Dust', 'vomero-5-photon',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/vomero-5-photon', 'https://source.example.com/vomero-5-photon', 'Nike Zoom Vomero 5 Photon Dust is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-19T07:00:00.000Z'::timestamptz, '2026-10-22T07:00:00.000Z'::timestamptz, '2026-11-02T07:00:00.000Z'::timestamptz,
  '2026-11-02T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  170, 170, 'EUR', 18000, NULL,
  66, 63, 54, 68, 50, 62,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  170, 198,
  177, 198, 223,
  7, 28, 53,
  4.4, 16.5, 31,
  30, 48, 65,
  'EXTREME', 'Estimated net ROI -6.6% after stockx fees (EUR). Confidence 30% from 23% estimate spread and data freshness. (Estimated)',
  47, 61, 11, 70, 68, 'IGNORE',
  66, 76, 69,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Nike","type":"online","url":"https://official.example.com/vomero-5-photon","country":"BE"}]'::jsonb, NULL, 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Pokémon Mega Evolution Charizard Collection', 'pokemon-charizard-collection',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/pokemon-charizard-collection', 'https://source.example.com/pokemon-charizard-collection', 'Pokémon Mega Evolution Charizard Collection is een sealed Pokémon-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-21T08:00:00.000Z'::timestamptz, '2026-10-24T08:00:00.000Z'::timestamptz, '2026-11-04T08:00:00.000Z'::timestamptz,
  '2026-11-04T08:00:00.000Z'::timestamptz, true, 'Europe/Amsterdam', 'release',
  49, 49, 'EUR', 8000, NULL,
  88, 86, 71, 90, 66, 67,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Pokémon', 'Mega Evolution', 'collection', 'Ultra Rare', true,
  49, 95,
  85, 95, 107,
  36, 46, 58,
  73.8, 93.9, 118,
  26, 77, 88,
  'EXTREME', 'Estimated net ROI 61.5% after tcgplayer fees (EUR). Confidence 26% from 23% estimate spread and data freshness. (Estimated)',
  66, 71, 37, 60, 81, 'MUST WATCH',
  87, 74, 42,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, 'Zeldzame sealed productie — historisch 2×–4× binnen 30 dagen na release.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Pokémon 151 Ultra Premium Collection', 'pokemon-151-upc',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/pokemon-151-upc', 'https://source.example.com/pokemon-151-upc', 'Pokémon 151 Ultra Premium Collection is een sealed Pokémon-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-23T13:00:00.000Z'::timestamptz, '2026-10-26T13:00:00.000Z'::timestamptz, '2026-11-06T13:00:00.000Z'::timestamptz,
  '2026-11-06T13:00:00.000Z'::timestamptz, true, 'Europe/Amsterdam', 'preorder',
  120, 120, 'EUR', 5000, NULL,
  90, 88, 73, 92, 68, 68,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Pokémon', '151', 'UPC', NULL, true,
  120, 210,
  188, 210, 236,
  68, 90, 116,
  56.8, 75, 96.9,
  41, 77, 90,
  'HIGH', 'Estimated net ROI 49.8% after tcgplayer fees (EUR). Confidence 41% from 23% estimate spread and data freshness. (Estimated)',
  67, 71, 34, 50, 83, 'MUST WATCH',
  86, 78, 90,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, 'Zeldzame sealed productie — historisch 2×–4× binnen 30 dagen na release.', 'preorder', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'One Piece OP-12 Booster Box', 'one-piece-op12-box',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/one-piece-op12-box', 'https://source.example.com/one-piece-op12-box', 'One Piece OP-12 Booster Box is een sealed One Piece-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-25T07:00:00.000Z'::timestamptz, '2026-10-28T07:00:00.000Z'::timestamptz, '2026-11-08T07:00:00.000Z'::timestamptz,
  '2026-11-08T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  110, 110, 'EUR', 6000, NULL,
  84, 82, 68, 86, 63, 66,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'One Piece', 'OP-12', 'booster_box', NULL, true,
  110, 165,
  148, 165, 186,
  38, 55, 76,
  34.4, 50, 68.7,
  37, 75, 84,
  'HIGH', 'Estimated net ROI 27.6% after tcgplayer fees (EUR). Confidence 37% from 23% estimate spread and data freshness. (Estimated)',
  62, 69, 27, 50, 80, 'HIGH PRIORITY',
  80, 81, 58,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Lorcana Chapter 8 Collector Set', 'lorcana-ch8-collector',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/lorcana-ch8-collector', 'https://source.example.com/lorcana-ch8-collector', 'Lorcana Chapter 8 Collector Set is een sealed Lorcana-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-27T08:00:00.000Z'::timestamptz, '2026-10-30T08:00:00.000Z'::timestamptz, '2026-11-10T08:00:00.000Z'::timestamptz,
  '2026-11-10T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  55, 55, 'EUR', 7000, NULL,
  72, 70, 59, 74, 54, 63,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Lorcana', 'Chapter 8', 'collector_set', 'Legendary', true,
  55, 88,
  79, 88, 99,
  24, 33, 44,
  43.3, 60, 80,
  33, 71, 72,
  'EXTREME', 'Estimated net ROI 32.7% after tcgplayer fees (EUR). Confidence 33% from 23% estimate spread and data freshness. (Estimated)',
  56, 63, 28, 60, 70, 'WATCH',
  69, 69, 37,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Magic Secret Lair — Doctor Who', 'magic-secret-lair-doctor-who',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/magic-secret-lair-doctor-who', 'https://source.example.com/magic-secret-lair-doctor-who', 'Magic Secret Lair — Doctor Who is een sealed Magic-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-29T13:00:00.000Z'::timestamptz, '2026-11-01T13:00:00.000Z'::timestamptz, '2026-11-12T13:00:00.000Z'::timestamptz,
  '2026-11-12T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  38, 38, 'EUR', 10000, NULL,
  68, 66, 55, 70, 51, 62,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Magic', 'Secret Lair', 'secret_lair', 'Mythic', true,
  38, 62,
  56, 62, 70,
  18, 24, 32,
  46.2, 63.2, 83.5,
  30, 70, 68,
  'EXTREME', 'Estimated net ROI 32.2% after tcgplayer fees (EUR). Confidence 30% from 23% estimate spread and data freshness. (Estimated)',
  55, 62, 27, 60, 69, 'IGNORE',
  67, 74, 75,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Yu-Gi-Oh Quarter Century Bonanza Box', 'yugioh-quarter-century',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/yugioh-quarter-century', 'https://source.example.com/yugioh-quarter-century', 'Yu-Gi-Oh Quarter Century Bonanza Box is een sealed Yu-Gi-Oh-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-10-31T07:00:00.000Z'::timestamptz, '2026-11-03T07:00:00.000Z'::timestamptz, '2026-11-14T07:00:00.000Z'::timestamptz,
  '2026-11-14T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  75, 75, 'EUR', 5500, NULL,
  70, 68, 57, 72, 53, 63,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Yu-Gi-Oh', 'Quarter Century', 'booster_box', NULL, true,
  75, 105,
  94, 105, 118,
  19, 30, 43,
  25.4, 40, 57.5,
  26, 70, 70,
  'EXTREME', 'Estimated net ROI 17.2% after tcgplayer fees (EUR). Confidence 26% from 23% estimate spread and data freshness. (Estimated)',
  53, 62, 22, 60, 68, 'IGNORE',
  67, 65, 43,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Topps Chrome 2026 Hobby Box', 'topps-chrome-2026-hobby',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/topps-chrome-2026-hobby', 'https://source.example.com/topps-chrome-2026-hobby', 'Topps Chrome 2026 Hobby Box is een sealed Sports Cards-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-02T08:00:00.000Z'::timestamptz, '2026-11-05T08:00:00.000Z'::timestamptz, '2026-11-16T08:00:00.000Z'::timestamptz,
  '2026-11-16T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  230, 230, 'EUR', 3000, NULL,
  65, 63, 52, 66, 49, 61,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Sports Cards', 'Topps Chrome 2026', 'hobby_box', NULL, true,
  230, 275,
  246, 275, 309,
  16, 45, 79,
  7.1, 19.6, 34.5,
  41, 68, 64,
  'HIGH', 'Estimated net ROI 2.9% after tcgplayer fees (EUR). Confidence 41% from 23% estimate spread and data freshness. (Estimated)',
  55, 77, 17, 50, 69, 'IGNORE',
  65, 87, 57,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Pokémon Prismatic ETB', 'pokemon-prismatic-etb',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/pokemon-prismatic-etb', 'https://source.example.com/pokemon-prismatic-etb', 'Pokémon Prismatic ETB is een sealed Pokémon-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-05T13:00:00.000Z'::timestamptz, '2026-11-08T13:00:00.000Z'::timestamptz, '2026-11-19T13:00:00.000Z'::timestamptz,
  '2026-11-19T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  52, 52, 'EUR', 12000, NULL,
  80, 78, 65, 82, 60, 65,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Pokémon', 'Prismatic Evolutions', 'ETB', NULL, true,
  52, 78,
  70, 78, 88,
  18, 26, 36,
  34.4, 50, 68.8,
  37, 74, 80,
  'HIGH', 'Estimated net ROI 23.6% after tcgplayer fees (EUR). Confidence 37% from 23% estimate spread and data freshness. (Estimated)',
  60, 67, 25, 50, 77, 'WATCH',
  77, 79, 41,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Pokémon Paldean Fates Tin', 'pokemon-paldean-fates-tin',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/pokemon-paldean-fates-tin', 'https://source.example.com/pokemon-paldean-fates-tin', 'Pokémon Paldean Fates Tin is een sealed Pokémon-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-07T07:00:00.000Z'::timestamptz, '2026-11-10T07:00:00.000Z'::timestamptz, '2026-11-21T07:00:00.000Z'::timestamptz,
  '2026-11-21T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  28, 28, 'EUR', 20000, NULL,
  58, 56, 47, 60, 44, 60,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Pokémon', 'Paldean Fates', 'tin', NULL, true,
  28, 38,
  34, 38, 43,
  6, 10, 15,
  21.6, 35.7, 52.7,
  33, 66, 58,
  'EXTREME', 'Estimated net ROI 4.5% after tcgplayer fees (EUR). Confidence 33% from 23% estimate spread and data freshness. (Estimated)',
  48, 57, 18, 60, 63, 'IGNORE',
  56, 78, 54,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'One Piece Starter Deck EX', 'one-piece-starter-ex',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/one-piece-starter-ex', 'https://source.example.com/one-piece-starter-ex', 'One Piece Starter Deck EX is een sealed One Piece-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-09T08:00:00.000Z'::timestamptz, '2026-11-12T08:00:00.000Z'::timestamptz, '2026-11-23T08:00:00.000Z'::timestamptz,
  '2026-11-23T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  18, 18, 'EUR', 25000, NULL,
  52, 50, 43, 54, 39, 58,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'One Piece', 'Starter EX', 'starter', NULL, true,
  18, 24,
  21, 24, 27,
  3, 6, 9,
  19.4, 33.3, 50,
  30, 64, 52,
  'EXTREME', 'Estimated net ROI -5.6% after tcgplayer fees (EUR). Confidence 30% from 23% estimate spread and data freshness. (Estimated)',
  43, 54, 14, 70, 56, 'IGNORE',
  51, 59, 70,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Lorcana Illumineer''s Quest', 'lorcana-illumineers-quest',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/lorcana-illumineers-quest', 'https://source.example.com/lorcana-illumineers-quest', 'Lorcana Illumineer''s Quest is een sealed Lorcana-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-11T13:00:00.000Z'::timestamptz, '2026-11-14T13:00:00.000Z'::timestamptz, '2026-11-25T13:00:00.000Z'::timestamptz,
  '2026-11-25T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  45, 45, 'EUR', 9000, NULL,
  60, 58, 49, 62, 45, 60,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Lorcana', 'Illumineer''s Quest', 'box', NULL, true,
  45, 58,
  52, 58, 65,
  7, 13, 20,
  15.5, 28.9, 45,
  26, 67, 60,
  'EXTREME', 'Estimated net ROI 3.9% after tcgplayer fees (EUR). Confidence 26% from 23% estimate spread and data freshness. (Estimated)',
  48, 58, 18, 60, 63, 'IGNORE',
  60, 71, 77,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Magic Modern Horizons 3 Box', 'magic-mh3-box',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/magic-mh3-box', 'https://source.example.com/magic-mh3-box', 'Magic Modern Horizons 3 Box is een sealed Magic-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-13T07:00:00.000Z'::timestamptz, '2026-11-16T07:00:00.000Z'::timestamptz, '2026-11-27T07:00:00.000Z'::timestamptz,
  '2026-11-27T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  280, 280, 'EUR', 4000, NULL,
  78, 76, 63, 80, 59, 65,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Magic', 'Modern Horizons 3', 'booster_box', NULL, true,
  280, 340,
  304, 340, 383,
  24, 60, 103,
  8.7, 21.4, 36.7,
  41, 73, 78,
  'HIGH', 'Estimated net ROI 4.8% after tcgplayer fees (EUR). Confidence 41% from 23% estimate spread and data freshness. (Estimated)',
  57, 68, 19, 50, 75, 'WATCH',
  76, 73, 55,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Pokémon Crown Zenith ETB', 'pokemon-crown-zenith-etb',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/pokemon-crown-zenith-etb', 'https://source.example.com/pokemon-crown-zenith-etb', 'Pokémon Crown Zenith ETB is een sealed Pokémon-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-15T08:00:00.000Z'::timestamptz, '2026-11-18T08:00:00.000Z'::timestamptz, '2026-11-29T08:00:00.000Z'::timestamptz,
  '2026-11-29T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  48, 48, 'EUR', 14000, NULL,
  66, 64, 54, 68, 50, 62,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Pokémon', 'Crown Zenith', 'ETB', NULL, true,
  48, 72,
  64, 72, 81,
  16, 24, 33,
  34.3, 50, 68.8,
  37, 69, 66,
  'HIGH', 'Estimated net ROI 22.9% after tcgplayer fees (EUR). Confidence 37% from 23% estimate spread and data freshness. (Estimated)',
  54, 61, 24, 50, 69, 'IGNORE',
  66, 79, 54,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Yu-Gi-Oh Structure Deck Fire Kings', 'yugioh-fire-kings-deck',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/yugioh-fire-kings-deck', 'https://source.example.com/yugioh-fire-kings-deck', 'Yu-Gi-Oh Structure Deck Fire Kings is een sealed Yu-Gi-Oh-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-17T13:00:00.000Z'::timestamptz, '2026-11-20T13:00:00.000Z'::timestamptz, '2026-12-01T13:00:00.000Z'::timestamptz,
  '2026-12-01T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  14, 14, 'EUR', 30000, NULL,
  44, 42, 36, 46, 33, 56,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Yu-Gi-Oh', 'Fire Kings', 'structure_deck', NULL, true,
  14, 18,
  16, 18, 20,
  2, 4, 6,
  15.1, 28.6, 44.7,
  33, 61, 44,
  'EXTREME', 'Estimated net ROI -16.1% after tcgplayer fees (EUR). Confidence 33% from 23% estimate spread and data freshness. (Estimated)',
  37, 51, 10, 70, 48, 'IGNORE',
  42, 46, 47,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Pokémon Surging Sparks Booster Bundle', 'pokemon-surging-sparks-bundle',
  (SELECT id FROM release_categories WHERE slug = 'tcg-collectibles'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'collectible'::release_type, 'announced'::release_status,
  'https://official.example.com/pokemon-surging-sparks-bundle', 'https://source.example.com/pokemon-surging-sparks-bundle', 'Pokémon Surging Sparks Booster Bundle is een sealed Pokémon-product met sterke collector-vraag. Preorders en winkelreleases zijn beperkt — snel uitverkocht bij officiële retailers.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-19T07:00:00.000Z'::timestamptz, '2026-11-22T07:00:00.000Z'::timestamptz, '2026-12-03T07:00:00.000Z'::timestamptz,
  '2026-12-03T07:00:00.000Z'::timestamptz, false, 'Europe/Amsterdam', 'release',
  32, 32, 'EUR', 16000, NULL,
  62, 60, 51, 64, 47, 61,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  'Pokémon', 'Surging Sparks', 'bundle', NULL, true,
  32, 44,
  39, 44, 50,
  7, 12, 18,
  23.1, 37.5, 54.8,
  30, 67, 62,
  'EXTREME', 'Estimated net ROI 7.8% after tcgplayer fees (EUR). Confidence 30% from 23% estimate spread and data freshness. (Estimated)',
  49, 59, 19, 60, 64, 'IGNORE',
  61, 69, 41,
  '[{"name":"Pokémon Center","type":"online","url":"https://www.pokemoncenter.com","country":"NL","note":"15:00 CET"},{"name":"bol.com","type":"online","url":"https://www.bol.com","country":"BE"},{"name":"Game Mania","type":"fysiek","url":"https://www.gamemania.be","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Supreme Box Logo Hoodie FW26', 'supreme-box-logo-fw26',
  (SELECT id FROM release_categories WHERE slug = 'fashion-drops'),
  (SELECT id FROM brands WHERE slug = 'supreme'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'fashion'::release_type, 'announced'::release_status,
  'https://official.example.com/supreme-box-logo-fw26', 'https://source.example.com/supreme-box-logo-fw26', 'Supreme Box Logo Hoodie FW26 is een fashion drops met verhoogde hype en beperkte voorraad. Relevant voor resellers die vroeg instappen via officiële kanalen.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-21T08:00:00.000Z'::timestamptz, '2026-11-24T08:00:00.000Z'::timestamptz, '2026-12-05T08:00:00.000Z'::timestamptz,
  '2026-12-05T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  168, 168, 'EUR', 2000, NULL,
  86, 84, 70, 88, 65, 67,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  168, 320,
  287, 320, 360,
  119, 152, 192,
  70.6, 90.5, 114.4,
  26, 62, 86,
  'EXTREME', 'Estimated net ROI 58.3% after stockx fees (EUR). Confidence 26% from 23% estimate spread and data freshness. (Estimated)',
  68, 85, 34, 60, 85, 'TOP OPPORTUNITY',
  83, 97, 41,
  '[{"name":"Officiële winkel","type":"online","url":"https://official.example.com/supreme-box-logo-fw26","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Palace Tri-Ferg Drop', 'palace-tri-ferg',
  (SELECT id FROM release_categories WHERE slug = 'fashion-drops'),
  (SELECT id FROM brands WHERE slug = 'palace'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'fashion'::release_type, 'announced'::release_status,
  'https://official.example.com/palace-tri-ferg', 'https://source.example.com/palace-tri-ferg', 'Palace Tri-Ferg Drop is een fashion drops met verhoogde hype en beperkte voorraad. Relevant voor resellers die vroeg instappen via officiële kanalen.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-24T13:00:00.000Z'::timestamptz, '2026-11-27T13:00:00.000Z'::timestamptz, '2026-12-08T13:00:00.000Z'::timestamptz,
  '2026-12-08T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  58, 120, 'EUR', 3500, NULL,
  72, 70, 59, 74, 54, 63,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  58, 95,
  85, 95, 107,
  -4, 6, 18,
  -4.4, 6.7, 20.1,
  41, 59, 72,
  'HIGH', 'Estimated net ROI -23.1% after stockx fees (EUR). Confidence 41% from 23% estimate spread and data freshness. (Estimated)',
  52, 73, 9, 60, 71, 'IGNORE',
  69, 74, 31,
  '[{"name":"Officiële winkel","type":"online","url":"https://official.example.com/palace-tri-ferg","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'PlayStation 5 Pro Bundle', 'ps5-pro-bundle',
  (SELECT id FROM release_categories WHERE slug = 'gaming'),
  (SELECT id FROM brands WHERE slug = 'sony'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'gaming'::release_type, 'announced'::release_status,
  'https://official.example.com/ps5-pro-bundle', 'https://source.example.com/ps5-pro-bundle', 'PlayStation 5 Pro Bundle is een gaming met verhoogde hype en beperkte voorraad. Relevant voor resellers die vroeg instappen via officiële kanalen.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-26T07:00:00.000Z'::timestamptz, '2026-11-29T07:00:00.000Z'::timestamptz, '2026-12-10T07:00:00.000Z'::timestamptz,
  '2026-12-10T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  599, 699, 'EUR', 15000, NULL,
  78, 76, 63, 80, 59, 65,
  'HIGH'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  599, 720,
  645, 720, 810,
  -4, 71, 161,
  -0.7, 10.9, 24.9,
  37, 60, 78,
  'HIGH', 'Estimated net ROI 7.2% after direct fees (EUR). Confidence 37% from 23% estimate spread and data freshness. (Estimated)',
  58, 66, 18, 50, 80, 'WATCH',
  78, 100, 76,
  '[{"name":"Officiële winkel","type":"online","url":"https://official.example.com/ps5-pro-bundle","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Nintendo Switch 2 Launch Bundle', 'switch-2-launch',
  (SELECT id FROM release_categories WHERE slug = 'gaming'),
  (SELECT id FROM brands WHERE slug = 'nintendo'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'gaming'::release_type, 'announced'::release_status,
  'https://official.example.com/switch-2-launch', 'https://source.example.com/switch-2-launch', 'Nintendo Switch 2 Launch Bundle is een gaming met verhoogde hype en beperkte voorraad. Relevant voor resellers die vroeg instappen via officiële kanalen.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-28T08:00:00.000Z'::timestamptz, '2026-12-01T08:00:00.000Z'::timestamptz, '2026-12-12T08:00:00.000Z'::timestamptz,
  '2026-12-12T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  449, 499, 'EUR', 50000, NULL,
  92, 90, 74, 93, 69, 68,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  449, 620,
  555, 620, 698,
  81, 146, 224,
  17.1, 30.8, 47.2,
  33, 63, 91,
  'EXTREME', 'Estimated net ROI 26.3% after direct fees (EUR). Confidence 33% from 23% estimate spread and data freshness. (Estimated)',
  64, 72, 24, 60, 87, 'HIGH PRIORITY',
  90, 92, 55,
  '[{"name":"Officiële winkel","type":"online","url":"https://official.example.com/switch-2-launch","country":"BE"}]'::jsonb, 'Extreme opportunity score — top-tier vraag en beperkte supply.', 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Kith x BMW Collection', 'kith-bmw-collection',
  (SELECT id FROM release_categories WHERE slug = 'fashion-drops'),
  (SELECT id FROM brands WHERE slug = 'kith'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'fashion'::release_type, 'announced'::release_status,
  'https://official.example.com/kith-bmw-collection', 'https://source.example.com/kith-bmw-collection', 'Kith x BMW Collection is een fashion drops met verhoogde hype en beperkte voorraad. Relevant voor resellers die vroeg instappen via officiële kanalen.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-11-30T13:00:00.000Z'::timestamptz, '2026-12-03T13:00:00.000Z'::timestamptz, '2026-12-14T13:00:00.000Z'::timestamptz,
  '2026-12-14T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  85, 350, 'EUR', 1500, NULL,
  74, 72, 60, 76, 56, 64,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  85, 180,
  161, 180, 203,
  -56, -37, -15,
  -25.9, -17.2, -6.8,
  30, 59, 74,
  'EXTREME', 'Estimated net ROI -34.2% after stockx fees (EUR). Confidence 30% from 23% estimate spread and data freshness. (Estimated)',
  55, 89, 9, 70, 72, 'IGNORE',
  71, 71, 63,
  '[{"name":"Officiële winkel","type":"online","url":"https://official.example.com/kith-bmw-collection","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Stüssy World Tour Tee Drop', 'stussy-world-tour',
  (SELECT id FROM release_categories WHERE slug = 'fashion-drops'),
  (SELECT id FROM brands WHERE slug = 'st-ssy'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'fashion'::release_type, 'announced'::release_status,
  'https://official.example.com/stussy-world-tour', 'https://source.example.com/stussy-world-tour', 'Stüssy World Tour Tee Drop is een fashion drops met verhoogde hype en beperkte voorraad. Relevant voor resellers die vroeg instappen via officiële kanalen.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-12-02T07:00:00.000Z'::timestamptz, '2026-12-05T07:00:00.000Z'::timestamptz, '2026-12-16T07:00:00.000Z'::timestamptz,
  '2026-12-16T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  45, 45, 'EUR', 8000, NULL,
  58, 56, 47, 60, 44, 60,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  45, 62,
  56, 62, 70,
  11, 17, 25,
  23.4, 37.8, 55.1,
  26, 55, 58,
  'EXTREME', 'Estimated net ROI -12.4% after stockx fees (EUR). Confidence 26% from 23% estimate spread and data freshness. (Estimated)',
  44, 57, 11, 70, 62, 'IGNORE',
  56, 71, 69,
  '[{"name":"Officiële winkel","type":"online","url":"https://official.example.com/stussy-world-tour","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Off-White x Nike Air Terra', 'off-white-nike-terra',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'product'::release_type, 'announced'::release_status,
  'https://official.example.com/off-white-nike-terra', 'https://source.example.com/off-white-nike-terra', 'Off-White x Nike Air Terra is een beperkte sneaker-drop met hoge resale-interesse. SNKRS en raffle-winkels zijn de primaire kanalen; verwacht hoge sellout-kans binnen minuten.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-12-04T08:00:00.000Z'::timestamptz, '2026-12-07T08:00:00.000Z'::timestamptz, '2026-12-18T08:00:00.000Z'::timestamptz,
  '2026-12-18T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  190, 190, 'EUR', 2500, NULL,
  88, 85, 71, 90, 66, 67,
  'EXTREME'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  190, 450,
  403, 450, 507,
  213, 260, 317,
  112, 136.8, 166.7,
  41, 67, 87,
  'HIGH', 'Estimated net ROI 100% after stockx fees (EUR). Confidence 41% from 23% estimate spread and data freshness. (Estimated)',
  71, 81, 47, 50, 83, 'TOP OPPORTUNITY',
  86, 85, 67,
  '[{"name":"SNKRS","type":"online","url":"https://www.nike.com/launch","country":"NL","note":"09:00 CET — LEO"},{"name":"Nike","type":"online","url":"https://official.example.com/off-white-nike-terra","country":"BE"}]'::jsonb, 'Grail-silhouet met beperkte stock — vergelijkbare drops deden +120–180% netto ROI.', 'raffle', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Xbox Series X Elite Bundle', 'xbox-series-x-elite',
  (SELECT id FROM release_categories WHERE slug = 'gaming'),
  (SELECT id FROM brands WHERE slug = 'microsoft'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'gaming'::release_type, 'announced'::release_status,
  'https://official.example.com/xbox-series-x-elite', 'https://source.example.com/xbox-series-x-elite', 'Xbox Series X Elite Bundle is een gaming met verhoogde hype en beperkte voorraad. Relevant voor resellers die vroeg instappen via officiële kanalen.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-12-06T13:00:00.000Z'::timestamptz, '2026-12-09T13:00:00.000Z'::timestamptz, '2026-12-20T13:00:00.000Z'::timestamptz,
  '2026-12-20T13:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  549, 599, 'EUR', 22000, NULL,
  68, 66, 55, 70, 51, 62,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  549, 590,
  528, 590, 664,
  -46, 16, 90,
  -8, 2.8, 15.7,
  37, 58, 68,
  'HIGH', 'Estimated net ROI -0.8% after direct fees (EUR). Confidence 37% from 23% estimate spread and data freshness. (Estimated)',
  50, 62, 15, 60, 69, 'IGNORE',
  69, 74, 47,
  '[{"name":"Officiële winkel","type":"online","url":"https://official.example.com/xbox-series-x-elite","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Fear of God Essentials Drop', 'fog-essentials-drop',
  (SELECT id FROM release_categories WHERE slug = 'fashion-drops'),
  (SELECT id FROM brands WHERE slug = 'fear-of-god'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'fashion'::release_type, 'announced'::release_status,
  'https://official.example.com/fog-essentials-drop', 'https://source.example.com/fog-essentials-drop', 'Fear of God Essentials Drop is een fashion drops met verhoogde hype en beperkte voorraad. Relevant voor resellers die vroeg instappen via officiële kanalen.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-12-08T07:00:00.000Z'::timestamptz, '2026-12-11T07:00:00.000Z'::timestamptz, '2026-12-22T07:00:00.000Z'::timestamptz,
  '2026-12-22T07:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  90, 220, 'EUR', 12000, NULL,
  64, 62, 52, 66, 48, 61,
  'LOW'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  90, 115,
  103, 115, 129,
  -52, -40, -26,
  -33.6, -25.8, -16.5,
  33, 57, 64,
  'EXTREME', 'Estimated net ROI -44.5% after stockx fees (EUR). Confidence 33% from 23% estimate spread and data freshness. (Estimated)',
  47, 60, 9, 70, 67, 'IGNORE',
  62, 79, 71,
  '[{"name":"Officiële winkel","type":"online","url":"https://official.example.com/fog-essentials-drop","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  drop_at, drop_time_confirmed, drop_timezone, drop_event_type,
  price_min, price_max, currency, stock_estimate, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id,
  tcg_name, set_name, product_type_tcg, card_rarity, sealed_product, msrp, market_price,
  estimated_resale_low, estimated_resale_mid, estimated_resale_high,
  expected_profit_low, expected_profit_mid, expected_profit_high,
  expected_roi_low, expected_roi_mid, expected_roi_high,
  resale_confidence_score, market_liquidity_score, demand_pressure_score, resale_risk_level, resale_explanation,
  opportunity_score, scarcity_score, resale_potential, risk_score, action_urgency, opportunity_action,
  popularity_score, momentum_score, volatility_score,
  buy_locations, hype_reason, sale_type, source_name, source_checked_at
) SELECT
  'Steam Deck OLED Limited', 'steam-deck-oled-ltd',
  (SELECT id FROM release_categories WHERE slug = 'gaming'),
  (SELECT id FROM brands WHERE slug = 'valve'),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'gaming'::release_type, 'announced'::release_status,
  'https://official.example.com/steam-deck-oled-ltd', 'https://source.example.com/steam-deck-oled-ltd', 'Steam Deck OLED Limited is een gaming met verhoogde hype en beperkte voorraad. Relevant voor resellers die vroeg instappen via officiële kanalen.',
  '2026-06-12T08:32:28.228Z'::timestamptz, '2026-12-10T08:00:00.000Z'::timestamptz, '2026-12-13T08:00:00.000Z'::timestamptz, '2026-12-24T08:00:00.000Z'::timestamptz,
  '2026-12-24T08:00:00.000Z'::timestamptz, true, 'Europe/Brussels', 'release',
  569, 569, 'EUR', 18000, NULL,
  70, 68, 57, 72, 53, 63,
  'MEDIUM'::priority_level,
  (SELECT id FROM source_adapters WHERE name = 'TITAN Mock Seed' LIMIT 1),
  NULL, NULL, NULL, NULL, NULL,
  569, 610,
  546, 610, 687,
  -23, 41, 118,
  -4.1, 7.2, 20.7,
  30, 58, 70,
  'EXTREME', 'Estimated net ROI 3.5% after direct fees (EUR). Confidence 30% from 23% estimate spread and data freshness. (Estimated)',
  52, 62, 16, 60, 72, 'IGNORE',
  68, 82, 60,
  '[{"name":"Officiële winkel","type":"online","url":"https://official.example.com/steam-deck-oled-ltd","country":"BE"}]'::jsonb, NULL, 'drop', 'TITAN Mock', '2026-07-03T08:32:28.229Z'::timestamptz
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ===== Dev: anon read policies (auth disabled) =====
-- ============================================================

-- Dev: anon leesrechten op publieke data (auth staat uit)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'releases','release_categories','brands','artists','sports_leagues','teams',
    'venues','countries','cities','release_updates','release_scores','release_sources',
    'source_adapters','scan_jobs','scan_logs','calendar_events','alert_rules','alert_events'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Dev anon read %s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "Dev anon read %s" ON %I FOR SELECT TO anon, authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- ============================================================
-- ===== VERIFICATION: row counts per core table =====
-- ============================================================

SELECT table_name, row_count
FROM (
  SELECT 'users_profile' AS table_name, COUNT(*)::bigint AS row_count FROM users_profile
  UNION ALL SELECT 'countries', COUNT(*) FROM countries
  UNION ALL SELECT 'cities', COUNT(*) FROM cities
  UNION ALL SELECT 'release_categories', COUNT(*) FROM release_categories
  UNION ALL SELECT 'brands', COUNT(*) FROM brands
  UNION ALL SELECT 'artists', COUNT(*) FROM artists
  UNION ALL SELECT 'sports_leagues', COUNT(*) FROM sports_leagues
  UNION ALL SELECT 'venues', COUNT(*) FROM venues
  UNION ALL SELECT 'source_adapters', COUNT(*) FROM source_adapters
  UNION ALL SELECT 'releases', COUNT(*) FROM releases
  UNION ALL SELECT 'release_updates', COUNT(*) FROM release_updates
  UNION ALL SELECT 'release_scores', COUNT(*) FROM release_scores
  UNION ALL SELECT 'watchlists', COUNT(*) FROM watchlists
  UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
  UNION ALL SELECT 'scan_jobs', COUNT(*) FROM scan_jobs
  UNION ALL SELECT 'scan_logs', COUNT(*) FROM scan_logs
  UNION ALL SELECT 'alert_rules', COUNT(*) FROM alert_rules
  UNION ALL SELECT 'alert_events', COUNT(*) FROM alert_events
  UNION ALL SELECT 'fx_rates', COUNT(*) FROM fx_rates
  UNION ALL SELECT 'fee_profiles', COUNT(*) FROM fee_profiles
  UNION ALL SELECT 'alert_channels', COUNT(*) FROM alert_channels
  UNION ALL SELECT 'alert_deliveries', COUNT(*) FROM alert_deliveries
  UNION ALL SELECT 'positions', COUNT(*) FROM positions
  UNION ALL SELECT 'prediction_snapshots', COUNT(*) FROM prediction_snapshots
) counts
ORDER BY table_name;
