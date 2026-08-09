-- ============================================================================
-- Migration 021 — Modération des commentaires par les admins (RLS)
-- ============================================================================
-- La policy DELETE de la 001 est `author_id = auth.uid()` : seul l'auteur peut
-- supprimer son commentaire. Or `DELETE /api/comments/[id]` autorise aussi les
-- admins côté application. Un admin supprimant le commentaire d'un autre agent
-- déclenchait donc un DELETE que la RLS réduisait à 0 ligne — sans erreur, donc
-- avec une réponse `{ success: true }` alors que rien n'était supprimé.
--
-- Deux corrections complémentaires (l'application détecte désormais le cas
-- 0 ligne et renvoie 403) : ici on donne à la base la règle que l'application
-- applique déjà, cloisonnée par SDIS comme partout ailleurs.
--
--   DELETE : l'auteur du commentaire, ou un admin du SDIS du REX parent
--            (super_admin transverse).
--
-- L'UPDATE reste volontairement réservé à l'auteur : un admin modère en
-- supprimant, il ne réécrit pas les propos d'un tiers.
--
-- Idempotent.

-- Helper : SDIS du REX portant un commentaire. SECURITY DEFINER pour éviter que
-- la RLS de `rex` masque le REX parent à un admin qui n'a pas le droit de le
-- lire (brouillon d'un autre agent de son SDIS). Même parti pris que 019/020.
CREATE OR REPLACE FUNCTION comment_sdis_id(cid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT r.sdis_id
  FROM comments c
  JOIN rex r ON r.id = c.rex_id
  WHERE c.id = cid;
$$;

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Comment deletion by author or SDIS admin" ON comments;
CREATE POLICY "Comment deletion by author or SDIS admin" ON comments
  FOR DELETE TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
        AND (p.role = 'super_admin' OR p.sdis_id = comment_sdis_id(comments.id))
    )
  );

-- Les réponses partent en cascade (`comments.parent_id ... ON DELETE CASCADE`),
-- ce qui contourne la RLS : supprimer un commentaire racine emporte bien tout
-- le fil, y compris les réponses d'autres agents.
