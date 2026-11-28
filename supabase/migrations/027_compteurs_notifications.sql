-- Migration 027 — Compteurs de vues et de favoris, notifications, commentaires
--
-- Suite de l'audit du 13 novembre 2026 (point 12 du plan d'action).
--
--  1. Les compteurs de vues et de favoris étaient écrits sous l'identité du
--     lecteur, que la policy de modification de `rex` n'autorise pas : pour un
--     lecteur ordinaire l'écriture touchait zéro ligne, sans erreur. Seules
--     comptaient les consultations de l'auteur et des validateurs.
--  2. L'auteur pouvait, lui, écrire dans ces deux colonnes la valeur de son
--     choix, y compris sur un REX validé.
--  3. Chaque consultation comptée changeait `updated_at`, qui sert d'empreinte
--     au cache du PDF et s'affiche comme date de modification.
--  4. Aucune policy ne permettait de supprimer une notification : la suppression
--     touchait zéro ligne et la notification revenait au rechargement.
--  5. Les commentaires étaient enregistrés avec des entités HTML (« &lt; » pour
--     « < ») puis affichés tels quels.
--
-- Idempotente : ré-exécutable.
-- Ordre de déploiement indifférent : le code qui appelle `increment_rex_views`
-- ignore son absence, et l'ancien code continue de fonctionner après elle (ses
-- écritures directes dans `views_count` sont simplement sans effet, comme elles
-- l'étaient déjà pour la plupart des lecteurs).

-- ============================================================
-- 1. Compteurs protégés, et `updated_at` réservé aux vraies modifications
-- ============================================================
-- Remplace, pour `rex` seulement, la fonction générique `update_updated_at()`
-- (toujours utilisée par `comments`).
--
-- SECURITY INVOKER, et c'est voulu : `current_user` y vaut le rôle qui émet
-- l'écriture. `authenticated` pour un appel direct de l'API ; le propriétaire
-- des fonctions SECURITY DEFINER ci-dessous quand l'écriture vient d'elles ;
-- `service_role` pour le client d'administration. Seul le premier cas est
-- contraint.
--
-- Les compteurs sont remis à leur valeur plutôt que l'écriture refusée : le
-- formulaire et l'ancien code de la fiche n'ont pas à échouer pour une colonne
-- qu'ils n'ont pas à connaître.
CREATE OR REPLACE FUNCTION rex_counters_and_timestamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  direct_write boolean := current_user IN ('authenticated', 'anon');
  counters_changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF direct_write THEN
      NEW.views_count := 0;
      NEW.favorites_count := 0;
    END IF;
    RETURN NEW;
  END IF;

  IF direct_write THEN
    NEW.views_count := OLD.views_count;
    NEW.favorites_count := OLD.favorites_count;
  END IF;

  counters_changed := NEW.views_count IS DISTINCT FROM OLD.views_count
                   OR NEW.favorites_count IS DISTINCT FROM OLD.favorites_count;

  -- Une écriture qui ne change QUE les compteurs n'est pas une modification du
  -- REX. La comparaison de la ligne entière n'est faite que dans ce cas : une
  -- modification ordinaire ne la paie pas. Même forme que `rex_guard_write`
  -- (024), pour qu'une colonne ajoutée plus tard soit prise en compte d'office.
  IF counters_changed
     AND (to_jsonb(NEW) - 'views_count' - 'favorites_count' - 'updated_at')
         IS NOT DISTINCT FROM
         (to_jsonb(OLD) - 'views_count' - 'favorites_count' - 'updated_at') THEN
    NEW.updated_at := OLD.updated_at;
  ELSE
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Même nom de trigger qu'en 001 : l'ordre d'exécution des triggers BEFORE est
-- alphabétique, et `rex_guard_write` (024) compte sur le fait que celui-ci passe
-- avant lui.
DROP TRIGGER IF EXISTS set_rex_updated_at ON rex;
CREATE TRIGGER set_rex_updated_at
  BEFORE INSERT OR UPDATE ON rex
  FOR EACH ROW EXECUTE FUNCTION rex_counters_and_timestamp();

-- ============================================================
-- 2. Compteur de vues
-- ============================================================
-- Deux fonctions, pour ne pas recopier ici la règle de lecture de `rex` :
--
--  * `public.increment_rex_views` est SECURITY INVOKER. Elle cherche le REX sous
--    l'identité de l'appelant : la policy SELECT décide donc seule de ce qu'il
--    peut lire, et suivra ses évolutions.
--  * `private.bump_rex_views` est SECURITY DEFINER et fait l'écriture, que la
--    policy UPDATE refuserait à un simple lecteur.
--
-- Le schéma `private` n'est pas exposé par l'API (seul `public` l'est, réglage
-- par défaut de Supabase) : la seconde fonction n'est appelable que depuis SQL.
-- Si ce schéma était un jour exposé, le seul effet serait de pouvoir compter une
-- vue sur un REX validé qu'on ne peut pas lire.
--
-- Seuls les REX validés sont comptés : une vue mesure la lecture d'un REX
-- publié, pas les allers-retours de son auteur sur un brouillon.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.bump_rex_views(target_rex uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  UPDATE rex
     SET views_count = COALESCE(views_count, 0) + 1
   WHERE id = target_rex
     AND status = 'validated';
$$;

REVOKE ALL ON FUNCTION private.bump_rex_views(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.bump_rex_views(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION increment_rex_views(target_rex uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM rex WHERE id = target_rex AND status = 'validated') THEN
    PERFORM private.bump_rex_views(target_rex);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION increment_rex_views(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_rex_views(uuid) TO authenticated, service_role;

-- ============================================================
-- 3. Compteur de favoris
-- ============================================================
-- SECURITY DEFINER : le trigger s'exécutait sous l'identité de celui qui ajoute
-- le favori, et son UPDATE de `rex` ne touchait rien. La policy de `favorites`
-- a déjà vérifié, à ce stade, que l'utilisateur agit pour lui-même.
-- `GREATEST` : un compteur historiquement faux ne doit pas passer sous zéro.
CREATE OR REPLACE FUNCTION update_favorites_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE rex SET favorites_count = COALESCE(favorites_count, 0) + 1 WHERE id = NEW.rex_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE rex SET favorites_count = GREATEST(COALESCE(favorites_count, 0) - 1, 0)
     WHERE id = OLD.rex_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Remise à niveau : les compteurs en place ne reflètent que les favoris des
-- auteurs et des validateurs. `updated_at` n'est pas touché (section 1).
UPDATE rex r
   SET favorites_count = f.total
  FROM (
    SELECT rex.id, COUNT(favorites.id)::int AS total
      FROM rex LEFT JOIN favorites ON favorites.rex_id = rex.id
     GROUP BY rex.id
  ) f
 WHERE f.id = r.id
   AND r.favorites_count IS DISTINCT FROM f.total;

-- ============================================================
-- 4. Notifications : suppression par leur destinataire
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. Commentaires : retrait des entités HTML enregistrées
-- ============================================================
-- Les commentaires passaient par un assainisseur HTML avant d'être stockés, puis
-- étaient affichés comme du texte : « Pression < 8 bar » s'affichait
-- « Pression &lt; 8 bar ». Le code n'encode plus ; ceci corrige l'existant.
--
-- `&amp;` en dernier : un « &lt; » saisi tel quel a été stocké « &amp;lt; » et
-- doit redevenir « &lt; », pas « < ».
-- Le trigger d'horodatage est suspendu le temps de la reprise : ces commentaires
-- n'ont pas été modifiés par leur auteur.
ALTER TABLE comments DISABLE TRIGGER set_comment_updated_at;

UPDATE comments
   SET content = replace(replace(replace(replace(replace(replace(
         content,
         '&lt;', '<'),
         '&gt;', '>'),
         '&nbsp;', chr(160)),
         '&quot;', '"'),
         '&#39;', ''''),
         '&amp;', '&')
 WHERE content ~ '&(lt|gt|nbsp|quot|#39|amp);';

ALTER TABLE comments ENABLE TRIGGER set_comment_updated_at;
