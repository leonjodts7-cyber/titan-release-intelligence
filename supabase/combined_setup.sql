-- TITAN Release Intelligence — Combined setup script
-- Generated from migrations: 000_base_schema.sql, 002_rls.sql, 003_seed.sql, 004_resale.sql, 005_v4_deal_execution.sql, 006_v5_elite_intelligence.sql, 007_v6_alerts.sql, 008_v2_scoring_money_portfolio.sql, 009_auth_rls.sql, 010_auth_disabled_rls.sql, 011_drop_times.sql, 012_v5_drop_detail_ingest.sql
-- Skipped: 001_schema.sql (overlaps with 000_base_schema.sql)
--
-- Paste this entire file into the Supabase SQL Editor and run once.
-- Safe to re-run: uses IF NOT EXISTS, DROP POLICY IF EXISTS, ON CONFLICT DO NOTHING.
--
-- Generated: 2026-07-03

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

-- Sample Releases
INSERT INTO releases (
  title, slug, category_id, brand_id, artist_id, league_id, venue_id, country_id, city_id,
  release_type, status, official_url, source_url, description,
  announced_at, presale_starts_at, general_sale_starts_at, release_starts_at,
  price_min, price_max, currency, capacity_estimate,
  hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score,
  priority_level, source_adapter_id
) VALUES
(
  'Coldplay Europe Tour 2026',
  'coldplay-europe-tour-2026',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'coldplay'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'wembley-stadium'),
  (SELECT id FROM countries WHERE code = 'GB'),
  (SELECT id FROM cities WHERE name = 'London'),
  'ticket', 'announced',
  'https://www.ticketmaster.co.uk/coldplay',
  'https://www.ticketmaster.com',
  'Coldplay Music of the Spheres World Tour - European leg ticket sales',
  NOW() - INTERVAL '3 days',
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '5 days',
  NOW() + INTERVAL '30 days',
  75, 250, 'GBP', 90000,
  92, 95, 78, 98, 90, 88, 'EXTREME',
  (SELECT id FROM source_adapters WHERE name = 'Ticketmaster')
),
(
  'Taylor Swift Stadium Show London',
  'taylor-swift-stadium-show-london',
  (SELECT id FROM release_categories WHERE slug = 'concert-tickets'),
  NULL,
  (SELECT id FROM artists WHERE slug = 'taylor-swift'),
  NULL,
  (SELECT id FROM venues WHERE slug = 'wembley-stadium'),
  (SELECT id FROM countries WHERE code = 'GB'),
  (SELECT id FROM cities WHERE name = 'London'),
  'ticket', 'presale',
  'https://www.ticketmaster.co.uk/taylor-swift',
  'https://www.ticketmaster.com',
  'Taylor Swift Eras Tour - additional London date',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '3 days',
  NOW() + INTERVAL '45 days',
  85, 350, 'GBP', 90000,
  98, 99, 85, 99, 95, 92, 'EXTREME',
  (SELECT id FROM source_adapters WHERE name = 'Ticketmaster')
),
(
  'UEFA Champions League Final 2026',
  'uefa-champions-league-final-2026',
  (SELECT id FROM release_categories WHERE slug = 'champions-league'),
  NULL, NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'uefa-champions-league'),
  NULL,
  (SELECT id FROM countries WHERE code = 'NL'),
  (SELECT id FROM cities WHERE name = 'Amsterdam'),
  'ticket', 'announced',
  'https://www.uefa.com/tickets',
  'https://www.uefa.com',
  'Champions League Final 2026 ticket ballot and public sale',
  NOW() - INTERVAL '14 days',
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '60 days',
  NOW() + INTERVAL '120 days',
  150, 800, 'EUR', 55000,
  96, 97, 60, 95, 92, 90, 'EXTREME',
  (SELECT id FROM source_adapters WHERE name = 'UEFA')
),
(
  'Super Bowl LX',
  'super-bowl-lx',
  (SELECT id FROM release_categories WHERE slug = 'super-bowl'),
  NULL, NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'nfl'),
  (SELECT id FROM venues WHERE slug = 'allegiant-stadium'),
  (SELECT id FROM countries WHERE code = 'US'),
  (SELECT id FROM cities WHERE name = 'Las Vegas'),
  'ticket', 'announced',
  'https://www.nfl.com/super-bowl/tickets',
  'https://www.nfl.com',
  'Super Bowl LX ticket lottery and official resale',
  NOW() - INTERVAL '30 days',
  NOW() + INTERVAL '60 days',
  NOW() + INTERVAL '90 days',
  NOW() + INTERVAL '180 days',
  500, 5000, 'USD', 65000,
  99, 99, 40, 99, 98, 95, 'EXTREME',
  (SELECT id FROM source_adapters WHERE name = 'NFL')
),
(
  'Nike Mercurial Limited Drop',
  'nike-mercurial-limited-drop',
  (SELECT id FROM release_categories WHERE slug = 'nike-football-boots'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL, NULL, NULL,
  (SELECT id FROM countries WHERE code = 'US'),
  NULL,
  'product', 'announced',
  'https://www.nike.com/launch/t/mercurial-limited',
  'https://www.nike.com/launch',
  'Limited edition Nike Mercurial Superfly - SNKRS exclusive',
  NOW() - INTERVAL '2 days',
  NULL,
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day',
  220, 220, 'EUR', 5000,
  88, 91, 90, 94, 85, 85, 'HIGH',
  (SELECT id FROM source_adapters WHERE name = 'Nike SNKRS')
),
(
  'Nike Phantom Elite Drop',
  'nike-phantom-elite-drop',
  (SELECT id FROM release_categories WHERE slug = 'nike-football-boots'),
  (SELECT id FROM brands WHERE slug = 'nike'),
  NULL, NULL, NULL, NULL, NULL,
  'product', 'announced',
  'https://www.nike.com/launch/t/phantom-elite',
  'https://www.nike.com/launch',
  'Nike Phantom GX Elite limited colorway',
  NOW() - INTERVAL '1 day',
  NULL, NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days',
  250, 250, 'EUR', 3000,
  82, 85, 70, 88, 80, 82, 'HIGH',
  (SELECT id FROM source_adapters WHERE name = 'Nike SNKRS')
),
(
  'Adidas F50 Limited',
  'adidas-f50-limited',
  (SELECT id FROM release_categories WHERE slug = 'adidas-drops'),
  (SELECT id FROM brands WHERE slug = 'adidas'),
  NULL, NULL, NULL, NULL, NULL,
  'product', 'announced',
  'https://www.adidas.com/f50-limited',
  'https://www.adidas.com/confirmed',
  'Adidas F50 Elite limited drop on Confirmed app',
  NOW() - INTERVAL '1 day',
  NULL, NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days',
  280, 280, 'EUR', 2500,
  80, 83, 75, 86, 78, 80, 'HIGH',
  (SELECT id FROM source_adapters WHERE name = 'Adidas Confirmed')
),
(
  'Jordan x Travis Scott Drop',
  'jordan-travis-scott-drop',
  (SELECT id FROM release_categories WHERE slug = 'limited-sneakers'),
  (SELECT id FROM brands WHERE slug = 'jordan'),
  (SELECT id FROM artists WHERE slug = 'travis-scott'),
  NULL, NULL, NULL, NULL, NULL,
  'product', 'rumored',
  'https://www.nike.com/launch/t/travis-scott',
  'https://www.nike.com/launch',
  'Air Jordan 1 Low OG Travis Scott collaboration',
  NULL, NULL, NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days',
  150, 150, 'EUR', 10000,
  95, 97, 50, 99, 96, 75, 'EXTREME',
  (SELECT id FROM source_adapters WHERE name = 'Nike SNKRS')
),
(
  'Tomorrowland 2026 Ticket Sale',
  'tomorrowland-2026-ticket-sale',
  (SELECT id FROM release_categories WHERE slug = 'festivals'),
  NULL, NULL, NULL, NULL,
  (SELECT id FROM countries WHERE code = 'BE'),
  (SELECT id FROM cities WHERE name = 'Brussels'),
  'ticket', 'announced',
  'https://www.tomorrowland.com/tickets',
  'https://www.tomorrowland.com',
  'Tomorrowland 2026 worldwide ticket sale',
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '10 days',
  NOW() + INTERVAL '14 days',
  NOW() + INTERVAL '200 days',
  120, 400, 'EUR', 400000,
  94, 96, 55, 97, 93, 90, 'EXTREME',
  (SELECT id FROM source_adapters WHERE name = 'Eventim')
),
(
  'Formula 1 Belgian Grand Prix 2026',
  'formula-1-belgian-gp-2026',
  (SELECT id FROM release_categories WHERE slug = 'sport-tickets'),
  NULL, NULL,
  (SELECT id FROM sports_leagues WHERE slug = 'formula-1'),
  NULL,
  (SELECT id FROM countries WHERE code = 'BE'),
  (SELECT id FROM cities WHERE name = 'Brussels'),
  'ticket', 'announced',
  'https://www.formula1.com/en/racing/2026/belgium/tickets',
  'https://www.formula1.com',
  'Belgian Grand Prix Spa-Francorchamps ticket presale',
  NOW() - INTERVAL '10 days',
  NOW() + INTERVAL '5 days',
  NOW() + INTERVAL '20 days',
  NOW() + INTERVAL '150 days',
  80, 450, 'EUR', 70000,
  78, 80, 45, 82, 75, 85, 'MEDIUM',
  (SELECT id FROM source_adapters WHERE name = 'Formula 1')
)
ON CONFLICT (slug) DO NOTHING;

-- Sample release updates
INSERT INTO release_updates (release_id, update_type, old_value, new_value, summary, importance_score)
SELECT v.release_id, v.update_type, v.old_value, v.new_value, v.summary, v.importance_score
FROM (VALUES
  (
    (SELECT id FROM releases WHERE slug = 'coldplay-europe-tour-2026'),
    'presale_added'::update_type, NULL::TEXT, (NOW() + INTERVAL '2 days')::TEXT,
    'Presale date announced for Coldplay Europe Tour', 85::NUMERIC
  ),
  (
    (SELECT id FROM releases WHERE slug = 'taylor-swift-stadium-show-london'),
    'date_changed'::update_type, '2026-08-15', '2026-08-22',
    'London show date moved by one week', 90::NUMERIC
  ),
  (
    (SELECT id FROM releases WHERE slug = 'nike-mercurial-limited-drop'),
    'official_link_added'::update_type, NULL::TEXT, 'https://www.nike.com/launch/t/mercurial-limited',
    'Official SNKRS product page now live', 75::NUMERIC
  )
) AS v(release_id, update_type, old_value, new_value, summary, importance_score)
WHERE v.release_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM release_updates ru
    WHERE ru.release_id = v.release_id AND ru.summary = v.summary
  );

-- Sample release scores
INSERT INTO release_scores (release_id, hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score, priority_level, short_summary, recommended_action, risk_notes)
SELECT v.release_id, v.hype_score, v.demand_score, v.urgency_score, v.sellout_probability, v.resale_interest_score, v.confidence_score, v.priority_level, v.short_summary, v.recommended_action, v.risk_notes
FROM (VALUES
  (
    (SELECT id FROM releases WHERE slug = 'coldplay-europe-tour-2026'),
    92::NUMERIC, 95::NUMERIC, 78::NUMERIC, 98::NUMERIC, 90::NUMERIC, 88::NUMERIC, 'EXTREME'::priority_level,
    'Global superstar stadium tour with extreme demand expected',
    'Register for presale, prepare multiple devices, check fan club access',
    'High bot activity expected on Ticketmaster'
  ),
  (
    (SELECT id FROM releases WHERE slug = 'super-bowl-lx'),
    99::NUMERIC, 99::NUMERIC, 40::NUMERIC, 99::NUMERIC, 98::NUMERIC, 95::NUMERIC, 'EXTREME'::priority_level,
    'Most demanded sporting event globally - lottery only',
    'Enter NFL lottery immediately, monitor official resale portal',
    'Scam sites common - only use nfl.com'
  )
) AS v(release_id, hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score, priority_level, short_summary, recommended_action, risk_notes)
WHERE v.release_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM release_scores rs
    WHERE rs.release_id = v.release_id AND rs.short_summary = v.short_summary
  );

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
