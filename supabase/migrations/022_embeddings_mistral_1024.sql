-- ============================================================================
-- Migration 022 — Embeddings : 1536 → 1024 dimensions (passage à mistral-embed)
-- ============================================================================
--
-- POURQUOI. La recherche sémantique était la dernière dépendance non
-- européenne du produit : `text-embedding-3-small` (OpenAI) produit des
-- vecteurs de 1536 dimensions, `mistral-embed` en produit 1024. Le schéma étant
-- figé à 1536 (migrations 001 et 002), le fournisseur ne pouvait pas changer
-- sans toucher à la base.
--
-- CE QUI EST PERDU. Les embeddings existants. Un vecteur de 1536 dimensions ne
-- se convertit pas en 1024 : ce ne sont pas les mêmes coordonnées dans le même
-- espace, ce sont deux espaces différents. Postgres ne propose donc aucune
-- conversion, et il n'y aurait aucun sens à en écrire une.
--
-- POURQUOI C'EST ACCEPTABLE. Un embedding est une donnée DÉRIVÉE : il se
-- recalcule intégralement depuis le contenu du REX, qui lui n'est pas touché.
-- Rien d'irremplaçable n'est détruit — seulement un cache coûteux à reconstruire.
--
-- PENDANT LA RÉGÉNÉRATION. La colonne est vide, donc `search_rex_by_embedding`
-- ne renverra rien. La route `/api/search` traite désormais « zéro résultat
-- vectoriel » comme un repli vers le plein texte (et non comme « aucun
-- résultat ») : la recherche reste fonctionnelle, simplement moins fine.
-- ⚠️ Cette version de `/api/search` DOIT être déployée avant d'appliquer cette
-- migration, sinon la recherche répondra « aucun résultat » sur tout le corpus.
--
-- APRÈS. Lancer `npx tsx supabase/maintenance/regenerate_embeddings.ts`.
--
-- RETOUR ARRIÈRE. Symétrique : rejouer ce fichier en remplaçant 1024 par 1536,
-- repointer `generateEmbedding` sur OpenAI (`EMBEDDING_DIMENSIONS`), puis
-- relancer la régénération. Même durée, même dégradation temporaire.
--
-- Idempotent : ré-exécutable sans erreur, mais ré-exécuter VIDE les embeddings.

-- ---- Index : supprimé d'abord, il porte sur la colonne remplacée ------------
DROP INDEX IF EXISTS rex_embedding_idx;

-- ---- Fonction : la signature change, `CREATE OR REPLACE` ne suffirait pas ---
-- (Postgres distingue les surcharges par type de paramètre : sans ce DROP, on
--  se retrouverait avec deux fonctions homonymes et un appel ambigu.)
DROP FUNCTION IF EXISTS search_rex_by_embedding(VECTOR(1536), FLOAT, INT);
DROP FUNCTION IF EXISTS search_rex_by_embedding(VECTOR(1024), FLOAT, INT);

-- ---- Colonne ---------------------------------------------------------------
ALTER TABLE rex DROP COLUMN IF EXISTS embedding;
ALTER TABLE rex ADD COLUMN embedding VECTOR(1024);

COMMENT ON COLUMN rex.embedding IS
  'Vecteur mistral-embed (1024 dimensions). Donnée dérivée, régénérable via '
  'supabase/maintenance/regenerate_embeddings.ts. Doit rester aligné avec '
  'EMBEDDING_DIMENSIONS dans src/lib/llm.ts.';

-- ---- Fonction de recherche -------------------------------------------------
-- Reste SECURITY INVOKER (défaut) : la RLS de `rex` s'applique donc à
-- l'appelant, et le cloisonnement par SDIS de la migration 013 vaut aussi pour
-- la recherche sémantique. Ne pas y ajouter SECURITY DEFINER.
CREATE OR REPLACE FUNCTION search_rex_by_embedding(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
-- Fixé comme sur les fonctions de la migration 013 : évite qu'un schéma
-- utilisateur placé en tête de `search_path` ne détourne les références.
SET search_path = pg_catalog, public
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

-- ---- Index vectoriel -------------------------------------------------------
-- `lists = 100` convient jusqu'à quelques dizaines de milliers de lignes.
-- NOTE : un index ivfflat construit sur une table vide n'a pas de centroïdes
-- utiles. Le reconstruire APRÈS la régénération (`REINDEX INDEX
-- rex_embedding_idx;`) pour retrouver des temps de recherche corrects.
CREATE INDEX IF NOT EXISTS rex_embedding_idx ON rex
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
