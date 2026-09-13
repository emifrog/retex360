-- Migration 023 — Rubriques manquantes des plans types DGSCGC (annexes D et E)
--
-- La migration 004 a transposé l'annexe F (focus thématiques) et les champs de
-- perception opérationnelle. Elle laissait six rubriques des PLANS TYPES sans
-- emplacement : deux dans le plan type PEX (annexe D), trois dans le plan type
-- RETEX (annexe E), plus la localisation qui figure dans les deux.
--
-- Après cette migration, chaque rubrique des annexes D et E a une colonne
-- dédiée, et la correspondance se vérifie rubrique par rubrique. Les commentaires
-- de colonne ci-dessous citent la rubrique d'origine : c'est ce qui rend la
-- conformité opposable — devant un acheteur public comme devant les auteurs du
-- mémento — plutôt que simplement affirmée.
--
-- ANNEXE D (PEX)                              COLONNE
--   Date et heure de l'intervention           intervention_date + intervention_heure  ← ajoutée
--   Lieu de l'intervention                    localisation + commune                  ← ajoutées
--   Nature de l'intervention                  type
--   Moyens engagés                            means_deployed
--   Situation à l'arrivée des secours         message_ambiance
--   Message du premier chef de groupe         message_ambiance
--   Problématiques rencontrées                difficulties + focus_thematiques
--   Photos et schémas                         rex_attachments + sitac
--   Éléments favorables / défavorables        elements_favorables / elements_defavorables
--   Ce qu'il faut retenir                     lessons_learned + prescriptions
--   Documentation opérationnelle              documentation_operationnelle
--
-- ANNEXE E (RETEX) — en plus des rubriques ci-dessus
--   2. Objectifs du RETEX                     objectifs                               ← ajoutée
--   3. Chronologie                            chronologie
--   4. Données (nature, sources, collecte)    donnees_sources                         ← ajoutée
--   5. Situation initiale                     message_ambiance
--   6. Argumentation de la méthode retenue    methode_argumentation                   ← ajoutée
--   7. Analyse thématique                     focus_thematiques
--   8. Enseignements et plan d'action         lessons_learned + prescriptions
--   9. Annexes                                rex_attachments
--   Sommaire                                  généré par l'export PDF
--
-- CHOIX D'IMPLÉMENTATION
--
--  * `intervention_heure` est une colonne SÉPARÉE plutôt qu'un passage de
--    `intervention_date` en TIMESTAMP. Changer le type d'une colonne NOT NULL
--    déjà peuplée et indexée (`idx_rex_intervention_date`) imposerait une
--    réécriture de table et un choix de fuseau pour des dates qui n'en portent
--    pas. Une colonne à part est réversible, sans effet sur l'existant, et
--    l'heure reste facultative — beaucoup de signalements ne la connaissent pas.
--
--  * La localisation est scindée en DEUX colonnes. `localisation` porte le
--    libellé attendu par le plan type (« Parking souterrain Nice Étoile,
--    30 av. Jean Médecin ») ; `commune` isole la seule partie exploitable par
--    une machine — filtrage, agrégation, géocodage. Un libellé libre unique
--    aurait satisfait le plan type sans rien apporter à la cartographie.
--    Aujourd'hui, le lieu n'existe que dans le titre des REX (« Effondrement
--    parking souterrain - Nice Centre ») : lisible, mais ni filtrable ni
--    cartographiable.
--
--  * Les trois rubriques RETEX sont facultatives EN BASE. La doctrine veut que
--    le PEX reste léger : exiger objectifs, sources et méthode d'un signalement
--    ou d'un PEX contredirait le mémento. L'exigence est portée par la
--    validation applicative, qui dépend déjà de `type_production`
--    (`src/lib/validators/rex.ts`), comme pour `focus_thematiques` en 004.
--
-- Idempotent : ré-exécutable sans effet.

-- ============================================================================
-- PARTIE 1 : Plan type PEX (annexe D) — rubriques « date et heure » et « lieu »
-- ============================================================================

ALTER TABLE rex ADD COLUMN IF NOT EXISTS intervention_heure TIME;
COMMENT ON COLUMN rex.intervention_heure IS
  'Plan type PEX (annexe D), rubrique "date et heure de l''intervention" : heure de '
  'déclenchement, complément de intervention_date. Facultative — une heure de nuit ou '
  'de pointe change la lecture de l''intervention. Colonne séparée et non TIMESTAMP '
  'pour ne pas réécrire intervention_date (NOT NULL, indexée) ni lui imposer un fuseau.';

ALTER TABLE rex ADD COLUMN IF NOT EXISTS localisation TEXT;
COMMENT ON COLUMN rex.localisation IS
  'Plan type PEX (annexe D) et RETEX (annexe E), rubrique "lieu de l''intervention" : '
  'libellé lisible du lieu (adresse, lieu-dit, point de repère). Voir rex.commune pour '
  'la partie exploitable par filtrage et géocodage.';

ALTER TABLE rex ADD COLUMN IF NOT EXISTS commune VARCHAR(200);
COMMENT ON COLUMN rex.commune IS
  'Plan type PEX (annexe D) et RETEX (annexe E), rubrique "lieu de l''intervention" : '
  'part structurée du lieu, isolée de rex.localisation pour être filtrable, agrégeable '
  'et géocodable. Saisie libre : contraindre à un référentiel INSEE alourdirait la '
  'saisie sans bénéfice immédiat, et le géocodage tolère l''approximation.';

-- ============================================================================
-- PARTIE 2 : Plan type RETEX (annexe E) — rubriques 2, 4 et 6
-- ============================================================================

ALTER TABLE rex ADD COLUMN IF NOT EXISTS objectifs TEXT;
COMMENT ON COLUMN rex.objectifs IS
  'Plan type RETEX (annexe E), rubrique 2 "objectifs du RETEX" : ce que la démarche '
  'cherche à établir, et pourquoi cette intervention a été retenue. Facultative en base, '
  'exigée pour type_production = retex par la validation applicative.';

ALTER TABLE rex ADD COLUMN IF NOT EXISTS donnees_sources TEXT;
COMMENT ON COLUMN rex.donnees_sources IS
  'Plan type RETEX (annexe E), rubrique 4 "données" : nature des données, sources et '
  'méthodes de collecte (entretiens, rapports d''intervention, enregistrements radio, '
  'main courante). C''est ce qui distingue un RETEX d''un récit : dire d''où viennent '
  'les informations. Facultative en base, exigée pour type_production = retex.';

ALTER TABLE rex ADD COLUMN IF NOT EXISTS methode_argumentation TEXT;
COMMENT ON COLUMN rex.methode_argumentation IS
  'Plan type RETEX (annexe E), rubrique 6 "argumentation de la méthode retenue" : '
  'justification de la démarche d''analyse employée. Distincte de l''analyse elle-même, '
  'portée par focus_thematiques (annexe F). Facultative en base, exigée pour '
  'type_production = retex.';

-- ============================================================================
-- PARTIE 3 : Index
-- ============================================================================

-- La commune est un critère de recherche et d'agrégation (« que s'est-il passé
-- chez nous ? »), au même titre que le type ou la gravité. Index partiel : les
-- REX antérieurs à cette migration ont la colonne à NULL et n'ont rien à y faire.
CREATE INDEX IF NOT EXISTS idx_rex_commune ON rex(commune) WHERE commune IS NOT NULL;

-- Pas d'index sur `intervention_heure` : personne ne cherche « les interventions
-- de 14 h ». L'heure se lit, elle ne se filtre pas.

-- ============================================================================
-- PARTIE 4 : Données existantes
-- ============================================================================

-- Aucune reprise automatique. Le lieu figure aujourd'hui dans le titre de
-- certains REX, mais l'en extraire par heuristique produirait des communes
-- fausses sans que personne ne le voie. Les colonnes restent à NULL et sont
-- renseignées à la prochaine édition ; l'affichage et l'export omettent les
-- rubriques vides plutôt que d'afficher un intitulé sans contenu.

-- ============================================================================
-- PARTIE 5 : RLS
-- ============================================================================

-- Rien à faire : les policies de `rex` portent sur les lignes, pas sur les
-- colonnes. Le cloisonnement par SDIS (migration 013) couvre donc ces champs
-- comme les autres.

-- ============================================================================
-- SUITE À DONNER (hors migration)
-- ============================================================================
--
--  1. `src/types/database.ts` et `src/types/index.ts` — ajouter les six champs.
--  2. `src/lib/validators/rex.ts` — rendre `objectifs`, `donnees_sources` et
--     `methode_argumentation` requis pour `rexRetexSchema` uniquement, et
--     facultatifs pour signalement et PEX. Mettre à jour
--     `getRequiredFieldsForType` (utilisée par l'indicateur de complétion et le
--     bouton de promotion).
--  3. `src/components/rex/rex-form.tsx` — n'afficher les trois champs RETEX que
--     lorsque `type_production === 'retex'`, pour ne pas alourdir la saisie
--     courante d'un PEX.
--  4. `src/lib/pdf/rex-template.tsx` — restituer les rubriques dans l'ordre du
--     plan type ; c'est le document qui sera lu comme preuve de conformité.
--  5. `src/app/api/rex/route.ts` et `src/app/api/rex/[id]/route.ts` — inclure
--     les six champs à la création et à la mise à jour.
--  6. `src/lib/ai-context.ts` — décider si ces rubriques alimentent l'analyse IA
--     et l'embedding. `objectifs` et `donnees_sources` sont riches de sens pour
--     la recherche sémantique ; `methode_argumentation` beaucoup moins.
