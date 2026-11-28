-- ============================================================================
-- Migration 026 — Remise en état (audit de novembre 2026)
-- ============================================================================
-- Six défauts où la base laissait faire, ou au contraire empêchait, autre chose
-- que ce que l'application annonce. Chacun est couvert par un test dans
-- `src/__tests__/rls/remise-en-etat-026.rls.test.ts`, écrit avant la correction.
--
--   1. REJET IMPOSSIBLE. La route de rejet repassait le REX en `draft` par un
--      UPDATE direct. Or un brouillon n'est lisible que par son auteur, et
--      Postgres exige que la ligne obtenue par un UPDATE reste lisible par celui
--      qui l'écrit : « new row violates row-level security policy ». Aucun
--      validateur ne pouvait rejeter quoi que ce soit.
--   2. NUMÉROTATION BLOQUÉE. `COUNT(*) + 1` redonne un numéro déjà pris dès
--      qu'un REX numéroté a été supprimé, et l'index unique refuse alors toute
--      validation du SDIS pour l'année concernée. Le comptage se faisait de plus
--      sous la visibilité de l'appelant.
--   3. PROFIL AUTO-ATTRIBUÉ. La policy INSERT de `profiles` (013) ne vérifiait
--      que `auth.uid() = id` : un compte sans profil choisissait son SDIS et son
--      rôle, `super_admin` compris. Seul le réglage « inscription désactivée »
--      du tableau de bord Supabase l'empêchait.
--   4. ADRESSE DE PROFIL MODIFIABLE. La 024 a retiré la LECTURE de
--      `profiles.email`, pas son écriture.
--   5. PIÈCE JOINTE POINTANT CHEZ UN AUTRE. `rex_attachments.storage_path` était
--      libre. Supprimer « sa » ligne faisait purger le fichier d'autrui par le
--      rôle service.
--   6. REX VALIDÉ SUPPRIMABLE PAR SON AUTEUR. Le gel de la 024 ne couvre que la
--      modification.
--
-- ORDRE DE DÉPLOIEMENT. Appliquer cette migration AVANT de déployer le code qui
-- l'accompagne : la route de rejet appelle `reject_rex()`. Dans l'ordre inverse
-- le rejet reste simplement en échec, comme il l'était déjà.
--
-- Idempotent.

-- ---- 1) Rejet d'un REX ------------------------------------------------------
-- SECURITY DEFINER : l'écriture ne peut pas passer par la RLS de l'appelant
-- (voir plus haut). L'autorisation est donc vérifiée ICI, avec les mêmes helpers
-- que les policies : validateur du SDIS du REX (super_admin transverse), et SDIS
-- non placé en lecture seule.
--
-- Un refus ne lève pas d'erreur : la fonction ne renvoie simplement aucune
-- ligne, que le REX n'existe pas, ne soit plus en attente, ou que l'appelant
-- n'ait pas le droit. Répondre différemment selon le cas dirait à n'importe qui
-- si un identifiant donné correspond à un REX en attente.
--
-- Le trigger `rex_guard_write` (024) continue de s'appliquer — `auth.uid()` est
-- celui de l'appelant, pas du propriétaire de la fonction — et il accepte ce
-- passage `pending` → `draft` fait par un validateur.
CREATE OR REPLACE FUNCTION reject_rex(target_rex uuid, reason text DEFAULT NULL)
RETURNS TABLE (author_id uuid, title text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  r record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- Alias obligatoire : `author_id` et `title` sont aussi les colonnes de
  -- sortie de la fonction, et une référence nue serait ambiguë.
  SELECT x.sdis_id, x.author_id, x.title, x.status INTO r
  FROM rex x
  WHERE x.id = target_rex
  FOR UPDATE;

  IF NOT FOUND OR r.status IS DISTINCT FROM 'pending' THEN
    RETURN;
  END IF;
  IF NOT current_user_can_validate(r.sdis_id) OR sdis_write_blocked() THEN
    RETURN;
  END IF;

  UPDATE rex
  SET status = 'draft',
      rejection_reason = NULLIF(left(btrim(reason), 1000), '')
  WHERE id = target_rex;

  author_id := r.author_id;
  title := r.title::text;
  RETURN NEXT;
END;
$$;

-- Supabase accorde par défaut l'exécution des fonctions de `public` à `anon` :
-- le retrait doit le nommer, `PUBLIC` seul ne suffit pas.
REVOKE ALL ON FUNCTION reject_rex(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_rex(uuid, text) TO authenticated, service_role;

-- ---- 2) Numérotation --------------------------------------------------------
-- `MAX(suffixe) + 1` au lieu de `COUNT(*) + 1` : un numéro supprimé laisse un
-- trou, il n'est jamais redonné. C'est aussi ce qu'on attend d'une référence
-- citée dans des documents : elle ne doit pas désigner deux REX au fil du temps.
--
-- SECURITY DEFINER : le maximum doit porter sur TOUS les REX du SDIS, y compris
-- ceux que le validateur ne peut pas lire (un super_admin ne voit pas les REX
-- « Mon SDIS » des autres services).
--
-- Le verrou consultatif sérialise deux validations simultanées du même SDIS
-- pour la même année ; il est relâché à la fin de la transaction.
CREATE OR REPLACE FUNCTION generate_numero_rex()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  sdis_code text;
  prefix text;
  next_num integer;
BEGIN
  IF NEW.status = 'validated'
     AND (OLD.status IS NULL OR OLD.status <> 'validated')
     AND NEW.numero_rex IS NULL THEN
    SELECT s.code INTO sdis_code FROM sdis s WHERE s.id = NEW.sdis_id;

    prefix := 'RETEX-' || COALESCE(sdis_code, '00') || '-'
              || EXTRACT(YEAR FROM COALESCE(NEW.intervention_date, CURRENT_DATE))::text || '-';

    PERFORM pg_advisory_xact_lock(hashtext(prefix));

    SELECT COALESCE(MAX(substring(x.numero_rex FROM '([0-9]+)$')::integer), 0) + 1
    INTO next_num
    FROM rex x
    WHERE x.numero_rex LIKE prefix || '%';

    NEW.numero_rex := prefix || lpad(next_num::text, 3, '0');
  END IF;

  RETURN NEW;
END;
$$;

-- ---- 3) et 4) profiles : ni création ni réécriture de l'adresse -------------
-- Les profils sont créés par le rôle service (inscription sur invitation,
-- `src/lib/invitations.ts`). Aucun parcours n'insère de profil avec une identité
-- utilisateur : la policy n'accordait donc rien d'utile.
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Privilèges de colonne, comme pour la lecture dans la 024 : une policy filtre
-- des lignes, jamais des colonnes. Les trois colonnes ré-accordées sont celles
-- qu'écrivent `PUT /api/profile` et `POST /api/profile/avatar`. `role` et
-- `sdis_id` restaient déjà protégés par le trigger de la 019 ; ils ne sont plus
-- inscriptibles du tout par ce rôle.
--
-- Même conséquence que pour la lecture : une colonne ajoutée plus tard à
-- `profiles` ne sera modifiable par l'utilisateur que si elle rejoint ce GRANT.
REVOKE INSERT, UPDATE ON profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON profiles FROM anon;
GRANT UPDATE (full_name, grade, avatar_url) ON profiles TO authenticated;

-- ---- 5) rex_attachments : le chemin doit être dans le dossier du déposant ---
-- La route d'upload écrit toujours `rex-attachments/<uid>/<fichier>`. La policy
-- l'exige désormais, à l'insertion comme à la modification : sans la seconde,
-- il suffirait de créer une ligne conforme puis de la rediriger.
--
-- `..` est refusé par précaution : une clé d'objet est littérale, mais rien ne
-- garantit que tous les backends de stockage le resteront.
DROP POLICY IF EXISTS "Users can upload attachments" ON rex_attachments;
CREATE POLICY "Users can upload attachments" ON rex_attachments
  FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
    AND storage_path LIKE 'rex-attachments/' || auth.uid()::text || '/%'
    AND storage_path NOT LIKE '%..%'
    AND (
      rex_attachments.rex_id IS NULL
      OR EXISTS (
        SELECT 1 FROM rex
        WHERE rex.id = rex_attachments.rex_id AND rex.author_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can link own attachments" ON rex_attachments;
CREATE POLICY "Users can link own attachments" ON rex_attachments
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (
    uploaded_by = auth.uid()
    AND storage_path LIKE 'rex-attachments/' || auth.uid()::text || '/%'
    AND storage_path NOT LIKE '%..%'
    AND (
      rex_attachments.rex_id IS NULL
      OR EXISTS (
        SELECT 1 FROM rex
        WHERE rex.id = rex_attachments.rex_id AND rex.author_id = auth.uid()
      )
    )
  );

-- ---- 6) rex : l'auteur ne supprime plus un REX validé -----------------------
-- Un REX validé a été approuvé par un tiers et peut être consulté par d'autres
-- SDIS : il n'appartient plus à son seul auteur. Sa suppression revient aux
-- admins du SDIS (super_admin transverse), comme pour le REX d'un autre agent.
-- Brouillons et REX en attente restent supprimables par leur auteur.
DROP POLICY IF EXISTS "Admins can delete REX" ON rex;
CREATE POLICY "Admins can delete REX" ON rex
  FOR DELETE TO authenticated USING (
    (author_id = auth.uid() AND status IS DISTINCT FROM 'validated')
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
        AND (p.role = 'super_admin' OR p.sdis_id = rex.sdis_id)
    )
  );
