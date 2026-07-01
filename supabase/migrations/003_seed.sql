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

INSERT INTO cities (name, country_id) VALUES
  ('Brussels', (SELECT id FROM countries WHERE code = 'BE')),
  ('London', (SELECT id FROM countries WHERE code = 'GB')),
  ('Las Vegas', (SELECT id FROM countries WHERE code = 'US')),
  ('Amsterdam', (SELECT id FROM countries WHERE code = 'NL'))
ON CONFLICT DO NOTHING;

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
INSERT INTO release_updates (release_id, update_type, old_value, new_value, summary, importance_score) VALUES
(
  (SELECT id FROM releases WHERE slug = 'coldplay-europe-tour-2026'),
  'presale_added', NULL, (NOW() + INTERVAL '2 days')::TEXT,
  'Presale date announced for Coldplay Europe Tour', 85
),
(
  (SELECT id FROM releases WHERE slug = 'taylor-swift-stadium-show-london'),
  'date_changed', '2026-08-15', '2026-08-22',
  'London show date moved by one week', 90
),
(
  (SELECT id FROM releases WHERE slug = 'nike-mercurial-limited-drop'),
  'official_link_added', NULL, 'https://www.nike.com/launch/t/mercurial-limited',
  'Official SNKRS product page now live', 75
);

-- Sample release scores
INSERT INTO release_scores (release_id, hype_score, demand_score, urgency_score, sellout_probability, resale_interest_score, confidence_score, priority_level, short_summary, recommended_action, risk_notes) VALUES
(
  (SELECT id FROM releases WHERE slug = 'coldplay-europe-tour-2026'),
  92, 95, 78, 98, 90, 88, 'EXTREME',
  'Global superstar stadium tour with extreme demand expected',
  'Register for presale, prepare multiple devices, check fan club access',
  'High bot activity expected on Ticketmaster'
),
(
  (SELECT id FROM releases WHERE slug = 'super-bowl-lx'),
  99, 99, 40, 99, 98, 95, 'EXTREME',
  'Most demanded sporting event globally - lottery only',
  'Enter NFL lottery immediately, monitor official resale portal',
  'Scam sites common - only use nfl.com'
);
