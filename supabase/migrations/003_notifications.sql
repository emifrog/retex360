-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mention', 'comment', 'validation', 'favorite', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  rex_id UUID REFERENCES rex(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_rex_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, rex_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_rex_id)
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
  -- Get author name
  SELECT full_name INTO v_author_name FROM profiles WHERE id = NEW.author_id;
  
  -- Get REX title
  SELECT title INTO v_rex_title FROM rex WHERE id = NEW.rex_id;
  
  -- Create notification for each mentioned user
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

-- Create trigger for mentions
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
-- Enable realtime for notifications table
-- This allows the frontend to subscribe to INSERT/UPDATE/DELETE events

-- Add table to realtime publication
-- Note: This requires the supabase_realtime publication to exist
-- If it doesn't exist, create it first
DO $$
BEGIN
  -- Check if publication exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add notifications table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Grant necessary permissions for realtime
GRANT SELECT ON notifications TO authenticated;
GRANT UPDATE ON notifications TO authenticated;
