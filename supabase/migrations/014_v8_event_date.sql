-- TITAN v8: event date for tickets (concert/match day vs ticket sale)

ALTER TABLE releases ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_releases_event_date ON releases(event_date);

COMMENT ON COLUMN releases.event_date IS 'Actual event date (concert/match); drop_at is ticket sale start';
