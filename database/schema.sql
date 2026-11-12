CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube')),
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  avatar_url TEXT,
  bio_original TEXT,
  bio_ai TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  country_code TEXT DEFAULT 'GLOBAL',
  city TEXT,
  language TEXT DEFAULT 'en',
  followers_count BIGINT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'pending_claim', 'claimed', 'verified')),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ai_embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, username)
);

CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform);
CREATE INDEX IF NOT EXISTS idx_creators_category ON creators(category);
CREATE INDEX IF NOT EXISTS idx_creators_country ON creators(country_code);
CREATE INDEX IF NOT EXISTS idx_creators_followers ON creators(followers_count DESC);

CREATE TABLE IF NOT EXISTS ad_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  delivery_days INT DEFAULT 3,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_code TEXT NOT NULL,
  story_proof_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,
  package_id UUID REFERENCES ad_packages(id) ON DELETE SET NULL,
  brand_email TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  campaign_brief TEXT NOT NULL,
  budget NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read creators" ON creators FOR SELECT USING (true);
CREATE POLICY "Public read packages" ON ad_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Owners update own creator" ON creators FOR UPDATE USING (auth.uid() = owner_user_id);
CREATE POLICY "Users insert claim" ON claim_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can create booking" ON bookings FOR INSERT WITH CHECK (true);
