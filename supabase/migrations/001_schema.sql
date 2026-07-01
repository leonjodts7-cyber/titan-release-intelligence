-- TITAN Release Intelligence OS - Schema
-- Run in Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
CREATE TYPE release_status AS ENUM ('rumored', 'announced', 'presale', 'on_sale', 'sold_out', 'cancelled', 'ended');
CREATE TYPE release_type AS ENUM ('ticket', 'product', 'merch', 'collectible', 'gaming', 'fashion', 'other');
CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXTREME');
CREATE TYPE update_type AS ENUM (
  'new_release', 'date_changed', 'presale_added', 'price_changed', 'location_changed',
  'extra_show_added', 'official_link_added', 'status_changed', 'release_imminent',
  'release_ended', 'source_offline', 'scan_error', 'other'
);
CREATE TYPE scan_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'discord', 'telegram');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');
CREATE TYPE source_type AS ENUM ('api', 'rss', 'html', 'manual', 'mock');

-- Users profile (extends auth.users)
CREATE TABLE users_profile (
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
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country_id UUID REFERENCES countries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE release_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sports_leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sport TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  league_id UUID REFERENCES sports_leagues(id),
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city_id UUID REFERENCES cities(id),
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Source adapters
CREATE TABLE source_adapters (
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

-- Releases
CREATE TABLE releases (
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

CREATE TABLE release_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  source_adapter_id UUID REFERENCES source_adapters(id),
  source_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE release_updates (
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

CREATE TABLE release_scores (
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

CREATE TABLE ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  input_data JSONB,
  output_data JSONB,
  model TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Watchlists
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE watchlist_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('equals', 'contains', 'gte', 'lte', 'within_days')),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notification_preferences (
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

CREATE TABLE notifications (
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
CREATE TABLE calendar_events (
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
CREATE TABLE scan_jobs (
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

CREATE TABLE scan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_job_id UUID REFERENCES scan_jobs(id) ON DELETE CASCADE,
  source_adapter_id UUID REFERENCES source_adapters(id),
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin
CREATE TABLE admin_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_profile(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
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

-- Indexes
CREATE INDEX idx_releases_slug ON releases(slug);
CREATE INDEX idx_releases_status ON releases(status);
CREATE INDEX idx_releases_priority ON releases(priority_level);
CREATE INDEX idx_releases_release_starts ON releases(release_starts_at);
CREATE INDEX idx_releases_hype ON releases(hype_score DESC);
CREATE INDEX idx_releases_category ON releases(category_id);
CREATE INDEX idx_releases_search ON releases USING GIN(search_vector);
CREATE INDEX idx_release_updates_release ON release_updates(release_id);
CREATE INDEX idx_release_updates_detected ON release_updates(detected_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_scan_jobs_adapter ON scan_jobs(source_adapter_id);
CREATE INDEX idx_scan_jobs_status ON scan_jobs(status);
CREATE INDEX idx_calendar_events_starts ON calendar_events(starts_at);
CREATE INDEX idx_watchlists_user ON watchlists(user_id);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION releases_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER users_profile_updated_at BEFORE UPDATE ON users_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER releases_updated_at BEFORE UPDATE ON releases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER source_adapters_updated_at BEFORE UPDATE ON source_adapters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER watchlists_updated_at BEFORE UPDATE ON watchlists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
