-- ============================================================================
-- REX PLATFORM - COMPLETE SUPABASE SCHEMA
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- User roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('USER', 'VALIDATOR', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- SDIS subscription plans
DO $$ BEGIN
  CREATE TYPE sdis_plan AS ENUM ('FREE', 'PROFESSIONAL', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- REX types
DO $$ BEGIN
  CREATE TYPE rex_type AS ENUM ('INTERVENTION', 'EXERCICE', 'FORMATION', 'TECHNIQUE', 'ORGANISATIONNEL', 'AUTRE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- REX gravity levels
DO $$ BEGIN
  CREATE TYPE rex_gravity AS ENUM ('SANS_GRAVITE', 'FAIBLE', 'MODEREE', 'GRAVE', 'TRES_GRAVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- REX visibility levels
DO $$ BEGIN
  CREATE TYPE rex_visibility AS ENUM ('PRIVE', 'SDIS', 'REGIONAL', 'NATIONAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- REX status
DO $$ BEGIN
  CREATE TYPE rex_status AS ENUM ('BROUILLON', 'EN_ATTENTE', 'VALIDE', 'REJETE', 'ARCHIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- REX categories
DO $$ BEGIN
  CREATE TYPE rex_category AS ENUM ('FIRE', 'RESCUE', 'HAZMAT', 'WATER_RESCUE', 'ROAD_ACCIDENT', 'NATURAL_DISASTER', 'TECHNICAL', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notification types
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('REX_VALIDE', 'REX_REJETE', 'NOUVEAU_COMMENTAIRE', 'MENTION', 'NOUVEAU_REX_SDIS', 'SYSTEME');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table: SDIS
CREATE TABLE IF NOT EXISTS sdis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(10) NOT NULL,
  region VARCHAR(100) NOT NULL,
  plan sdis_plan NOT NULL DEFAULT 'FREE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add additional SDIS columns if they don't exist
ALTER TABLE sdis ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE sdis ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE sdis ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE sdis ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE sdis ADD COLUMN IF NOT EXISTS population INTEGER;
ALTER TABLE sdis ADD COLUMN IF NOT EXISTS surface INTEGER;
ALTER TABLE sdis ADD COLUMN IF NOT EXISTS personnel INTEGER;

-- Table: Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255),
  role user_role NOT NULL DEFAULT 'USER',
  sdis_id UUID NOT NULL REFERENCES sdis(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Add SP (Sapeur-Pompier) columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS matricule VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TIMESTAMPTZ;

-- Add unique constraint on matricule if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_matricule_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_matricule_key UNIQUE (matricule);
  END IF;
END $$;

-- Table: REX
CREATE TABLE IF NOT EXISTS rex (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  type rex_type NOT NULL,
  status rex_status NOT NULL DEFAULT 'BROUILLON',
  intervention_date DATE NOT NULL,
  location VARCHAR(500) NOT NULL,
  context TEXT NOT NULL,
  actions TEXT NOT NULL,
  outcome TEXT NOT NULL,
  lessons TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  category rex_category NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sdis_id UUID NOT NULL REFERENCES sdis(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 0,
  ai_summary TEXT,
  ai_keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Rename views to view_count if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rex' AND column_name = 'views'
  ) THEN
    ALTER TABLE rex RENAME COLUMN views TO view_count;
  END IF;
END $$;

-- Add new REX columns if they don't exist
ALTER TABLE rex ADD COLUMN IF NOT EXISTS gravity rex_gravity;
ALTER TABLE rex ADD COLUMN IF NOT EXISTS visibility rex_visibility DEFAULT 'PRIVE';
ALTER TABLE rex ADD COLUMN IF NOT EXISTS resources TEXT;
ALTER TABLE rex ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE rex ADD COLUMN IF NOT EXISTS validated_by_id UUID;
ALTER TABLE rex ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add foreign key constraint for validated_by_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rex_validated_by_id_fkey'
  ) THEN
    ALTER TABLE rex ADD CONSTRAINT rex_validated_by_id_fkey 
      FOREIGN KEY (validated_by_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Table: Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  rex_id UUID NOT NULL REFERENCES rex(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add parent_id column for nested comments if it doesn't exist
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID;

-- Add foreign key constraint for parent_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_parent_id_fkey'
  ) THEN
    ALTER TABLE comments ADD CONSTRAINT comments_parent_id_fkey 
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Table: Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(500) NOT NULL,
  url TEXT NOT NULL,
  type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  rex_id UUID NOT NULL REFERENCES rex(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: REX-Tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS rex_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rex_id UUID NOT NULL REFERENCES rex(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rex_id, tag_id)
);

-- Table: REX Favorites
CREATE TABLE IF NOT EXISTS rex_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rex_id UUID NOT NULL REFERENCES rex(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, rex_id)
);

-- Table: Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  link VARCHAR(500),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: Sessions (for NextAuth compatibility if needed later)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: Accounts (for OAuth providers if needed later)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type VARCHAR(50),
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- SDIS indexes
CREATE INDEX IF NOT EXISTS idx_sdis_region ON sdis(region);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_sdis_id ON users(sdis_id);
CREATE INDEX IF NOT EXISTS idx_users_matricule ON users(matricule) WHERE matricule IS NOT NULL;

-- REX indexes
CREATE INDEX IF NOT EXISTS idx_rex_author_id ON rex(author_id);
CREATE INDEX IF NOT EXISTS idx_rex_sdis_id ON rex(sdis_id);
CREATE INDEX IF NOT EXISTS idx_rex_type ON rex(type);
CREATE INDEX IF NOT EXISTS idx_rex_gravity ON rex(gravity);
CREATE INDEX IF NOT EXISTS idx_rex_status ON rex(status);
CREATE INDEX IF NOT EXISTS idx_rex_visibility ON rex(visibility);
CREATE INDEX IF NOT EXISTS idx_rex_validated_by_id ON rex(validated_by_id);
CREATE INDEX IF NOT EXISTS idx_rex_intervention_date ON rex(intervention_date DESC);
CREATE INDEX IF NOT EXISTS idx_rex_created_at ON rex(created_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_rex_id ON comments(rex_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_attachments_rex_id ON attachments(rex_id);

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- REX-Tags indexes
CREATE INDEX IF NOT EXISTS idx_rex_tags_rex_id ON rex_tags(rex_id);
CREATE INDEX IF NOT EXISTS idx_rex_tags_tag_id ON rex_tags(tag_id);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_rex_favorites_user_id ON rex_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_rex_favorites_rex_id ON rex_favorites(rex_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE sdis ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rex ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE rex_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE rex_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SDIS Policies
DROP POLICY IF EXISTS "Users can view their own SDIS" ON sdis;
CREATE POLICY "Users can view their own SDIS"
  ON sdis FOR SELECT
  USING (id IN (SELECT sdis_id FROM users WHERE id = auth.uid()));

-- Users Policies
DROP POLICY IF EXISTS "Users can view users from their SDIS" ON users;
CREATE POLICY "Users can view users from their SDIS"
  ON users FOR SELECT
  USING (sdis_id IN (SELECT sdis_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- REX Policies
DROP POLICY IF EXISTS "Users can view REX from their SDIS" ON rex;
CREATE POLICY "Users can view REX from their SDIS"
  ON rex FOR SELECT
  USING (sdis_id IN (SELECT sdis_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create REX for their SDIS" ON rex;
CREATE POLICY "Users can create REX for their SDIS"
  ON rex FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    sdis_id IN (SELECT sdis_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Authors can update their own REX" ON rex;
CREATE POLICY "Authors can update their own REX"
  ON rex FOR UPDATE
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their own REX" ON rex;
CREATE POLICY "Authors can delete their own REX"
  ON rex FOR DELETE
  USING (author_id = auth.uid());

-- Comments Policies
DROP POLICY IF EXISTS "Users can view comments on REX from their SDIS" ON comments;
CREATE POLICY "Users can view comments on REX from their SDIS"
  ON comments FOR SELECT
  USING (rex_id IN (
    SELECT id FROM rex WHERE sdis_id IN (
      SELECT sdis_id FROM users WHERE id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Users can create comments on REX from their SDIS" ON comments;
CREATE POLICY "Users can create comments on REX from their SDIS"
  ON comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    rex_id IN (
      SELECT id FROM rex WHERE sdis_id IN (
        SELECT sdis_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Authors can update their own comments" ON comments;
CREATE POLICY "Authors can update their own comments"
  ON comments FOR UPDATE
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their own comments" ON comments;
CREATE POLICY "Authors can delete their own comments"
  ON comments FOR DELETE
  USING (author_id = auth.uid());

-- Attachments Policies
DROP POLICY IF EXISTS "Users can view attachments on REX from their SDIS" ON attachments;
CREATE POLICY "Users can view attachments on REX from their SDIS"
  ON attachments FOR SELECT
  USING (rex_id IN (
    SELECT id FROM rex WHERE sdis_id IN (
      SELECT sdis_id FROM users WHERE id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Users can upload attachments to REX from their SDIS" ON attachments;
CREATE POLICY "Users can upload attachments to REX from their SDIS"
  ON attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    rex_id IN (
      SELECT id FROM rex WHERE sdis_id IN (
        SELECT sdis_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Tags Policies
DROP POLICY IF EXISTS "Authenticated users can view tags" ON tags;
CREATE POLICY "Authenticated users can view tags"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tags" ON tags;
CREATE POLICY "Authenticated users can create tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- REX-Tags Policies
DROP POLICY IF EXISTS "Users can view rex_tags from their SDIS" ON rex_tags;
CREATE POLICY "Users can view rex_tags from their SDIS"
  ON rex_tags FOR SELECT
  USING (rex_id IN (
    SELECT id FROM rex WHERE sdis_id IN (
      SELECT sdis_id FROM users WHERE id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Users can manage tags on their own REX" ON rex_tags;
CREATE POLICY "Users can manage tags on their own REX"
  ON rex_tags FOR ALL
  USING (rex_id IN (SELECT id FROM rex WHERE author_id = auth.uid()))
  WITH CHECK (rex_id IN (SELECT id FROM rex WHERE author_id = auth.uid()));

-- Favorites Policies
DROP POLICY IF EXISTS "Users can view their own favorites" ON rex_favorites;
CREATE POLICY "Users can view their own favorites"
  ON rex_favorites FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own favorites" ON rex_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON rex_favorites FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_sdis_updated_at ON sdis;
CREATE TRIGGER update_sdis_updated_at BEFORE UPDATE ON sdis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rex_updated_at ON rex;
CREATE TRIGGER update_rex_updated_at BEFORE UPDATE ON rex
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTIFICATION FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically create notification when REX is validated
CREATE OR REPLACE FUNCTION notify_rex_validation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'VALIDE' AND OLD.status != 'VALIDE' THEN
    INSERT INTO notifications (user_id, type, title, content, link)
    VALUES (
      NEW.author_id,
      'REX_VALIDE',
      'REX validé',
      'Votre REX "' || NEW.title || '" a été validé',
      '/dashboard/rex/' || NEW.id
    );
  ELSIF NEW.status = 'REJETE' AND OLD.status != 'REJETE' THEN
    INSERT INTO notifications (user_id, type, title, content, link)
    VALUES (
      NEW.author_id,
      'REX_REJETE',
      'REX rejeté',
      'Votre REX "' || NEW.title || '" a été rejeté. Raison: ' || COALESCE(NEW.rejection_reason, 'Non spécifiée'),
      '/dashboard/rex/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify on new comment
CREATE OR REPLACE FUNCTION notify_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  rex_author_id UUID;
  rex_title TEXT;
  commenter_name TEXT;
BEGIN
  -- Get REX author and title
  SELECT author_id, title INTO rex_author_id, rex_title
  FROM rex WHERE id = NEW.rex_id;
  
  -- Get commenter name
  SELECT name INTO commenter_name
  FROM users WHERE id = NEW.author_id;
  
  -- Notify REX author if comment is not from them
  IF rex_author_id != NEW.author_id THEN
    INSERT INTO notifications (user_id, type, title, content, link)
    VALUES (
      rex_author_id,
      'NOUVEAU_COMMENTAIRE',
      'Nouveau commentaire',
      commenter_name || ' a commenté votre REX "' || rex_title || '"',
      '/dashboard/rex/' || NEW.rex_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for REX validation notifications
DROP TRIGGER IF EXISTS trigger_rex_validation_notification ON rex;
CREATE TRIGGER trigger_rex_validation_notification
  AFTER UPDATE ON rex
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_rex_validation();

-- Trigger for new comment notifications
DROP TRIGGER IF EXISTS trigger_new_comment_notification ON comments;
CREATE TRIGGER trigger_new_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_comment();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get REX with full details including tags
CREATE OR REPLACE FUNCTION get_rex_with_tags(rex_id_param UUID)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  description TEXT,
  type rex_type,
  gravity rex_gravity,
  status rex_status,
  visibility rex_visibility,
  tags_array TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.type,
    r.gravity,
    r.status,
    r.visibility,
    ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) as tags_array
  FROM rex r
  LEFT JOIN rex_tags rt ON r.id = rt.rex_id
  LEFT JOIN tags t ON rt.tag_id = t.id
  WHERE r.id = rex_id_param
  GROUP BY r.id, r.title, r.description, r.type, r.gravity, r.status, r.visibility;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Seed data (SDIS 06 only - user will be created via Supabase Auth)
INSERT INTO sdis (id, code, name, department, region, plan)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'SDIS06',
  'SDIS des Alpes-Maritimes',
  '06',
  'PACA',
  'PROFESSIONAL'
) ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tags IS 'Tags pour catégoriser les REX';
COMMENT ON TABLE rex_tags IS 'Table de liaison many-to-many entre REX et Tags';
COMMENT ON TABLE rex_favorites IS 'REX mis en favoris par les utilisateurs';
COMMENT ON TABLE notifications IS 'Notifications système pour les utilisateurs';

COMMENT ON COLUMN users.rank IS 'Grade du sapeur-pompier (ex: ADJ, LTN, CAP)';
COMMENT ON COLUMN users.unit IS 'Unité d''affectation (ex: CIS Nice Nord)';
COMMENT ON COLUMN users.matricule IS 'Matricule unique du sapeur-pompier';

COMMENT ON COLUMN rex.gravity IS 'Gravité de l''événement';
COMMENT ON COLUMN rex.visibility IS 'Niveau de visibilité du REX (PRIVE, SDIS, REGIONAL, NATIONAL)';
COMMENT ON COLUMN rex.resources IS 'Moyens engagés lors de l''intervention';
COMMENT ON COLUMN rex.validated_by_id IS 'ID du validateur si le REX a été validé';
COMMENT ON COLUMN rex.rejection_reason IS 'Raison du rejet si le REX a été rejeté';
COMMENT ON COLUMN rex.view_count IS 'Nombre de vues du REX';

COMMENT ON COLUMN comments.parent_id IS 'ID du commentaire parent pour les réponses';

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- To create the test user, run: npm run create-user
-- Or create manually via Supabase Dashboard → Authentication → Users
