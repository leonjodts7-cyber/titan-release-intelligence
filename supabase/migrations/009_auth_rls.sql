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
