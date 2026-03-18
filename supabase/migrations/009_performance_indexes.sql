-- ============================================
-- Performance indexes for dashboard queries
-- ============================================

-- Composite index for validated REX queries (stats dashboard)
CREATE INDEX IF NOT EXISTS idx_rex_status_validated_at
  ON rex(status, validated_at DESC)
  WHERE validated_at IS NOT NULL;

-- Index for favorites with created_at (weekly stats)
CREATE INDEX IF NOT EXISTS idx_favorites_created_at
  ON favorites(created_at DESC);

-- Index for comments with created_at (weekly stats)
CREATE INDEX IF NOT EXISTS idx_comments_created_at
  ON comments(created_at DESC);

-- Index for attachments by rex_id (REX detail page)
CREATE INDEX IF NOT EXISTS idx_rex_attachments_rex_id
  ON rex_attachments(rex_id);
