-- ============================================================================
-- Migration 024 — Garde-fous d'écriture `rex` + confidentialité de `profiles.email`
-- ============================================================================
-- Corrige quatre trous où la règle métier n'existait QUE dans le code applicatif.
-- Rappel du modèle de menace : l'application parle à Supabase avec la clé anon
-- depuis le navigateur. Tout contrôle absent de la base est contournable par une
-- requête PostgREST directe — les routes API ne sont pas la frontière.
--
--   1. INSERT : la policy de la 019 n'imposait que l'auteur et le SDIS. Un agent
--      pouvait donc créer son REX directement `status = 'validated'`, et se
--      décerner `validated_by` / `validated_at` / `numero_rex`. Le trigger de
--      garde de la 019 ne couvrait que l'UPDATE.
--   2. UPDATE : `sdis_id` et `author_id` n'étaient verrouillés nulle part. Un
--      agent pouvait déplacer son REX vers un autre SDIS, ou le réattribuer.
--   3. UPDATE : le trigger de la 019 ne se déclenche que sur la TRANSITION vers
--      `validated`. Un REX déjà validé restait librement modifiable par son
--      auteur — l'approbation ne garantissait donc pas le contenu consulté.
--   4. `profiles.email` était lisible hors du SDIS dès que l'auteur possédait un
--      REX partagé (branche `is_public_rex_author` de la policy SELECT de 019).
--      La RLS est ligne-à-ligne : elle ne sait pas masquer une colonne. C'est donc
--      un privilège de colonne qui s'en charge ici.
--
-- Idempotent.

-- ---- Helper : l'appelant est-il validateur pour ce SDIS ? ------------------
-- SECURITY DEFINER pour lire `profiles` sans buter sur sa propre RLS.
CREATE OR REPLACE FUNCTION current_user_can_validate(target_sdis uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('validator', 'admin', 'super_admin')
      AND (p.role = 'super_admin' OR p.sdis_id = target_sdis)
  );
$$;

-- ---- Garde-fou unique, INSERT + UPDATE -------------------------------------
-- Remplace `rex_guard_validation()` (019), qui ne couvrait que l'UPDATE et que
-- la seule transition de statut.
--
-- `auth.uid() IS NULL` => écriture par le rôle service (seed, indexation des
-- embeddings, tâches d'administration). Ces écritures restent libres : elles ne
-- passent pas par une identité utilisateur, donc il n'y a rien à contraindre ici.
--
-- Ordre des triggers BEFORE : Postgres les exécute par ordre alphabétique de nom.
-- `trg_generate_numero_rex` (011) et `set_rex_updated_at` (001) passent donc AVANT
-- `trg_rex_guard_write` — c'est voulu : le numéro attribué automatiquement à la
-- validation est déjà posé quand le garde-fou l'examine, et il l'accepte parce
-- que l'auteur de la transition est bien un validateur.
CREATE OR REPLACE FUNCTION rex_guard_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  can_validate boolean;
  old_content jsonb;
  new_content jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  can_validate := current_user_can_validate(NEW.sdis_id);

  IF TG_OP = 'INSERT' THEN
    -- Un REX se crée en brouillon ou en attente de validation. Rien d'autre.
    IF NEW.status IS DISTINCT FROM 'draft' AND NEW.status IS DISTINCT FROM 'pending'
       AND NOT can_validate THEN
      RAISE EXCEPTION 'Création limitée aux statuts draft / pending';
    END IF;

    -- Métadonnées de validation : elles s'obtiennent en étant validé, pas en le
    -- déclarant à la création.
    IF NOT can_validate
       AND (NEW.validated_by IS NOT NULL
            OR NEW.validated_at IS NOT NULL
            OR NEW.numero_rex IS NOT NULL) THEN
      RAISE EXCEPTION 'Métadonnées de validation réservées aux validateurs du SDIS';
    END IF;

    RETURN NEW;
  END IF;

  -- ---- UPDATE --------------------------------------------------------------

  -- Rattachement figé : un REX n'est ni déplaçable vers un autre SDIS, ni
  -- réattribuable à un autre auteur. Un transfert légitime passe par le rôle
  -- service, de façon tracée.
  IF NEW.sdis_id IS DISTINCT FROM OLD.sdis_id THEN
    RAISE EXCEPTION 'Le SDIS de rattachement d''un REX n''est pas modifiable';
  END IF;
  IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'L''auteur d''un REX n''est pas modifiable';
  END IF;

  -- Passage à `validated` : réservé aux validateurs du SDIS (règle de la 019).
  IF NEW.status = 'validated' AND OLD.status IS DISTINCT FROM 'validated'
     AND NOT can_validate THEN
    RAISE EXCEPTION 'Validation réservée aux validateurs du SDIS';
  END IF;

  -- Métadonnées de validation : modifiables par les seuls validateurs.
  IF NOT can_validate
     AND (NEW.validated_by IS DISTINCT FROM OLD.validated_by
          OR NEW.validated_at IS DISTINCT FROM OLD.validated_at
          OR NEW.numero_rex IS DISTINCT FROM OLD.numero_rex) THEN
    RAISE EXCEPTION 'Métadonnées de validation réservées aux validateurs du SDIS';
  END IF;

  -- Contenu figé après validation. C'est le cœur de la confiance dans un REX
  -- validé : ce qui est consulté est ce qui a été approuvé.
  --
  -- Comparaison de la ligne entière plutôt que d'une liste de colonnes : une
  -- rubrique ajoutée par une migration future est protégée d'office. Les seules
  -- exclusions sont les compteurs d'usage et l'horodatage, qui ne portent aucun
  -- contenu — `views_count` est incrémenté à chaque consultation et
  -- `favorites_count` par le trigger de `favorites`, tous deux sous l'identité
  -- du lecteur. `embedding` est exclu du coût de la comparaison : il n'est écrit
  -- que par le rôle service, déjà sorti plus haut.
  IF OLD.status = 'validated' AND NOT can_validate THEN
    old_content := to_jsonb(OLD) - 'views_count' - 'favorites_count' - 'updated_at' - 'embedding';
    new_content := to_jsonb(NEW) - 'views_count' - 'favorites_count' - 'updated_at' - 'embedding';
    IF new_content IS DISTINCT FROM old_content THEN
      RAISE EXCEPTION 'REX validé : modification réservée aux validateurs du SDIS';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rex_guard_validation ON rex;
DROP FUNCTION IF EXISTS rex_guard_validation();
DROP TRIGGER IF EXISTS trg_rex_guard_write ON rex;
CREATE TRIGGER trg_rex_guard_write
  BEFORE INSERT OR UPDATE ON rex
  FOR EACH ROW EXECUTE FUNCTION rex_guard_write();

-- ---- profiles.email : privilège de colonne ---------------------------------
-- La policy SELECT de la 019 donne accès à la LIGNE de profil d'un auteur de REX
-- partagé, pour afficher son nom hors de son SDIS. Elle donne du même coup accès
-- à son adresse email : une policy ne filtre pas les colonnes.
--
-- Le `REVOKE` porte d'abord sur la table : Supabase accorde `SELECT` au niveau
-- table à `authenticated`, et un `REVOKE SELECT (email)` seul ne retire PAS un
-- privilège accordé au niveau table. Il faut donc reprendre le droit de table,
-- puis le ré-accorder colonne par colonne.
--
-- Conséquence à connaître : toute colonne ajoutée plus tard à `profiles` sera
-- invisible à `authenticated` tant qu'elle n'est pas ajoutée à ce GRANT — et un
-- `select('*')` sur `profiles` depuis le client utilisateur échoue désormais en
-- « permission denied ». C'est délibéré : le défaut est la non-divulgation.
--
-- Son propre email reste accessible par `supabase.auth.getUser()`, et les flux
-- légitimes (invitations, export RGPD d'un SDIS, panel super_admin) passent déjà
-- par le rôle service, que ces privilèges ne concernent pas.
REVOKE SELECT ON profiles FROM authenticated;
GRANT SELECT (id, sdis_id, full_name, role, grade, avatar_url, created_at)
  ON profiles TO authenticated;
