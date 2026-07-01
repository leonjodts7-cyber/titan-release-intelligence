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
CREATE POLICY "Users can view own profile" ON users_profile FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users_profile FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON users_profile FOR SELECT USING (is_admin());

-- Public read for reference data and releases
CREATE POLICY "Anyone authenticated can read releases" ON releases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage releases" ON releases FOR ALL USING (is_admin());

CREATE POLICY "Anyone authenticated can read categories" ON release_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage categories" ON release_categories FOR ALL USING (is_admin());

CREATE POLICY "Anyone authenticated can read brands" ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read artists" ON artists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read leagues" ON sports_leagues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read teams" ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read venues" ON venues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read countries" ON countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read cities" ON cities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone authenticated can read release_updates" ON release_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read release_scores" ON release_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read release_sources" ON release_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can read ai_analysis" ON ai_analysis FOR SELECT TO authenticated USING (true);

-- Watchlists: user owns
CREATE POLICY "Users manage own watchlists" ON watchlists FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own watchlist rules" ON watchlist_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM watchlists w WHERE w.id = watchlist_id AND w.user_id = auth.uid())
);

-- Notifications
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage own notification prefs" ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Calendar
CREATE POLICY "Users read calendar events" ON calendar_events FOR SELECT TO authenticated USING (
  user_id IS NULL OR user_id = auth.uid()
);
CREATE POLICY "Users manage own calendar events" ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- Admin tables
CREATE POLICY "Authenticated read source_adapters" ON source_adapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage source_adapters" ON source_adapters FOR ALL USING (is_admin());

CREATE POLICY "Authenticated read scan_jobs" ON scan_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage scan_jobs" ON scan_jobs FOR ALL USING (is_admin());

CREATE POLICY "Authenticated read scan_logs" ON scan_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins read admin_notes" ON admin_notes FOR SELECT USING (is_admin() OR auth.uid() = user_id);
CREATE POLICY "Admins write admin_notes" ON admin_notes FOR INSERT WITH CHECK (is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins read audit_logs" ON audit_logs FOR SELECT USING (is_admin());

-- Service role bypasses RLS (used server-side only)
