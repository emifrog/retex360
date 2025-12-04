-- ============================================
-- Semantic Search Function
-- ============================================

-- Function to search REX by embedding similarity
CREATE OR REPLACE FUNCTION search_rex_by_embedding(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rex.id,
    1 - (rex.embedding <=> query_embedding) AS similarity
  FROM rex
  WHERE 
    rex.embedding IS NOT NULL
    AND rex.status = 'validated'
    AND 1 - (rex.embedding <=> query_embedding) > match_threshold
  ORDER BY rex.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Index for faster vector search
CREATE INDEX IF NOT EXISTS rex_embedding_idx ON rex 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
