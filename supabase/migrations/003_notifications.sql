-- ============================================
-- 003: Enhance notifications (fix schema from 001)
-- ============================================
-- Migration 001 created the notifications table WITHOUT rex_id and with VARCHAR(50) type.
-- This migration safely adds the missing column and updates constraints.

-- Add rex_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'rex_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN rex_id UUID REFERENCES rex(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add NOT NULL constraint on user_id if missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'user_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE notifications ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Widen type column from VARCHAR(50) to TEXT and add CHECK constraint
-- (safe: TEXT is compatible with VARCHAR, existing data is preserved)
ALTER TABLE notifications ALTER COLUMN type TYPE TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
      CHECK (type IN ('mention', 'comment', 'validation', 'rejection', 'favorite', 'new_rex', 'system'));
  END IF;
END $$;

-- Drop duplicate indexes from migration 001 (replaced by more specific ones below)
DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_notifications_unread;

-- Create improved indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_rex_id ON notifications(rex_id);

-- RLS policies (drop and recreate to ensure correct definitions)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Drop old function signature before recreating
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_content TEXT,
  p_link TEXT DEFAULT NULL,
  p_rex_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, content, link, rex_id)
  VALUES (p_user_id, p_type, p_title, p_content, p_link, p_rex_id)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification on comment mention
CREATE OR REPLACE FUNCTION notify_on_mention() RETURNS TRIGGER AS $$
DECLARE
  v_mentioned_user_id UUID;
  v_author_name TEXT;
  v_rex_title TEXT;
BEGIN
  SELECT full_name INTO v_author_name FROM profiles WHERE id = NEW.author_id;
  SELECT title INTO v_rex_title FROM rex WHERE id = NEW.rex_id;

  FOREACH v_mentioned_user_id IN ARRAY NEW.mentions
  LOOP
    IF v_mentioned_user_id != NEW.author_id THEN
      PERFORM create_notification(
        v_mentioned_user_id,
        'mention',
        'Nouvelle mention',
        v_author_name || ' vous a mentionné dans un commentaire sur "' || v_rex_title || '"',
        '/rex/' || NEW.rex_id,
        NEW.rex_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_mention ON comments;
CREATE TRIGGER trigger_notify_on_mention
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (array_length(NEW.mentions, 1) > 0)
  EXECUTE FUNCTION notify_on_mention();

-- Trigger to notify author when REX is validated
CREATE OR REPLACE FUNCTION notify_on_validation() RETURNS TRIGGER AS $$
DECLARE
  v_validator_name TEXT;
BEGIN
  IF NEW.status = 'validated' AND OLD.status != 'validated' THEN
    SELECT full_name INTO v_validator_name FROM profiles WHERE id = NEW.validated_by;

    PERFORM create_notification(
      NEW.author_id,
      'validation',
      'REX validé',
      'Votre REX "' || NEW.title || '" a été validé par ' || v_validator_name,
      '/rex/' || NEW.id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_validation ON rex;
CREATE TRIGGER trigger_notify_on_validation
  AFTER UPDATE ON rex
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_validation();

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

GRANT SELECT ON notifications TO authenticated;
GRANT UPDATE ON notifications TO authenticated;
