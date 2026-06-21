-- ============================================================================
-- Migration 015 — Verrouillage de l'INSERT sur `notifications`
-- ============================================================================
-- Avant : la policy "System can insert notifications" était WITH CHECK (true)
-- => n'importe quel utilisateur authentifié pouvait créer une notification pour
-- N'IMPORTE QUEL user_id (spam / phishing interne).
--
-- Après : un client utilisateur ne peut insérer que des notifications LE
-- concernant (auth.uid() = user_id). Les notifications cross-user légitimes
-- (commentaire, mention, validation, rejet) sont désormais insérées côté serveur
-- via le client admin (service role, bypass RLS) APRÈS contrôle d'autorisation
-- dans les routes correspondantes.
--
-- On révoque aussi l'exécution de create_notification() pour anon/authenticated :
-- cette fonction SECURITY DEFINER (qui écrit en bypass RLS) n'est pas utilisée
-- par l'application et constituerait sinon le même vecteur d'abus.
--
-- Idempotent.

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fermer l'accès à la fonction SECURITY DEFINER (non utilisée par l'app).
REVOKE EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
