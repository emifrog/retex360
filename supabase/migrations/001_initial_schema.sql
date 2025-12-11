-- ============================================
-- RETEX360 Database Schema
-- Plateforme RETEX Collaborative pour SDIS
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- 1. SDIS (Services Départementaux d'Incendie et de Secours)
-- ============================================
CREATE TABLE sdis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,        -- "06", "83", "13"
  name VARCHAR(255) NOT NULL,              -- "SDIS des Alpes-Maritimes"
  region VARCHAR(100),                     -- "PACA"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial SDIS data (UUIDs valides RFC 4122 v4)
INSERT INTO sdis (id, code, name, region) VALUES
  ('a0000000-0000-4000-a000-000000000001', '06', 'SDIS des Alpes-Maritimes', 'PACA'),
  ('a0000000-0000-4000-a000-000000000002', '13', 'SDIS des Bouches-du-Rhône', 'PACA'),
  ('a0000000-0000-4000-a000-000000000003', '83', 'SDIS du Var', 'PACA'),
  ('a0000000-0000-4000-a000-000000000004', '84', 'SDIS de Vaucluse', 'PACA');

-- ============================================
-- 2. PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sdis_id UUID REFERENCES sdis(id) NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'validator', 'admin', 'super_admin')),
  grade VARCHAR(100),                      -- "Capitaine", "Lieutenant"
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Le profil est créé par l'application (src/lib/actions/auth.ts)
-- Pas de trigger automatique pour éviter les conflits

-- ============================================
-- 3. REX (Retours d'Expérience)
-- ============================================
CREATE TABLE rex (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sdis_id UUID REFERENCES sdis(id) NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE,
  intervention_date DATE NOT NULL,
  
  type VARCHAR(100) NOT NULL,              -- "Incendie industriel", "FDF", "SAV"
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('critique', 'majeur', 'significatif')),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'validated', 'archived')),
  visibility VARCHAR(50) DEFAULT 'sdis' CHECK (visibility IN ('sdis', 'inter_sdis', 'public')),
  
  description TEXT,                        -- Synthèse
  context TEXT,                            -- Contexte opérationnel
  means_deployed TEXT,                     -- Moyens engagés
  difficulties TEXT,                       -- Difficultés rencontrées
  lessons_learned TEXT,                    -- Enseignements
  
  tags TEXT[] DEFAULT '{}',
  
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  
  embedding VECTOR(1536),                  -- For semantic search (OpenAI)
  
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate slug from title
CREATE OR REPLACE FUNCTION generate_rex_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := LOWER(REGEXP_REPLACE(
      REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_rex_slug
  BEFORE INSERT ON rex
  FOR EACH ROW EXECUTE FUNCTION generate_rex_slug();

-- Update updated_at on modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_rex_updated_at
  BEFORE UPDATE ON rex
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. REX ATTACHMENTS
-- ============================================
CREATE TABLE rex_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rex_id UUID REFERENCES rex(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. COMMENTS (threaded)
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rex_id UUID REFERENCES rex(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_comment_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. FAVORITES
-- ============================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rex_id UUID REFERENCES rex(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, rex_id)
);

-- Update favorites_count on rex
CREATE OR REPLACE FUNCTION update_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE rex SET favorites_count = favorites_count + 1 WHERE id = NEW.rex_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE rex SET favorites_count = favorites_count - 1 WHERE id = OLD.rex_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rex_favorites_count
  AFTER INSERT OR DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION update_favorites_count();

-- ============================================
-- 7. NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,               -- 'mention', 'comment', 'validation', 'new_rex'
  title VARCHAR(255),
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_rex_sdis ON rex(sdis_id);
CREATE INDEX idx_rex_author ON rex(author_id);
CREATE INDEX idx_rex_status ON rex(status);
CREATE INDEX idx_rex_type ON rex(type);
CREATE INDEX idx_rex_severity ON rex(severity);
CREATE INDEX idx_rex_intervention_date ON rex(intervention_date DESC);
CREATE INDEX idx_rex_created_at ON rex(created_at DESC);
CREATE INDEX idx_rex_tags ON rex USING GIN(tags);

CREATE INDEX idx_comments_rex ON comments(rex_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_rex ON favorites(rex_id);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

CREATE INDEX idx_profiles_sdis ON profiles(sdis_id);

-- Full-text search index
CREATE INDEX idx_rex_search ON rex USING GIN(
  to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(context, ''))
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE sdis ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rex ENABLE ROW LEVEL SECURITY;
ALTER TABLE rex_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SDIS: Everyone can read
CREATE POLICY "SDIS are viewable by everyone" ON sdis
  FOR SELECT USING (true);

-- Profiles: Users can view all, update own
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Service can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- REX: Complex visibility rules
CREATE POLICY "REX viewable based on visibility" ON rex
  FOR SELECT TO authenticated USING (
    -- Own REX
    author_id = auth.uid()
    -- Or validated and visible to user's SDIS
    OR (status = 'validated' AND (
      visibility = 'public'
      OR (visibility = 'inter_sdis')
      OR (visibility = 'sdis' AND sdis_id = (SELECT sdis_id FROM profiles WHERE id = auth.uid()))
    ))
    -- Or pending and user is validator/admin
    OR (status = 'pending' AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('validator', 'admin', 'super_admin')
    ))
  );

CREATE POLICY "Users can create REX" ON rex
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own REX" ON rex
  FOR UPDATE TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('validator', 'admin', 'super_admin'))
  );

CREATE POLICY "Admins can delete REX" ON rex
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Attachments: Follow REX visibility
CREATE POLICY "Attachments follow REX visibility" ON rex_attachments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM rex WHERE rex.id = rex_id)
  );

CREATE POLICY "Users can upload to own REX" ON rex_attachments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM rex WHERE rex.id = rex_id AND author_id = auth.uid())
  );

-- Comments: Viewable if REX is viewable
CREATE POLICY "Comments follow REX visibility" ON comments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM rex WHERE rex.id = rex_id)
  );

CREATE POLICY "Authenticated users can comment" ON comments
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE TO authenticated USING (author_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE TO authenticated USING (author_id = auth.uid());

-- Favorites: Users manage their own
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can add favorites" ON favorites
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove favorites" ON favorites
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Notifications: Users see their own
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run this in Supabase Dashboard > Storage
-- INSERT INTO storage.buckets (id, name, public) VALUES ('rex-attachments', 'rex-attachments', false);

-- Storage policies (run in SQL Editor)
-- CREATE POLICY "Authenticated users can upload" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'rex-attachments');
-- CREATE POLICY "Users can view attachments" ON storage.objects
--   FOR SELECT TO authenticated USING (bucket_id = 'rex-attachments');
