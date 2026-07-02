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
