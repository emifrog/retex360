-- ============================================================================
-- Migration 025 — Lever le verrou lecture seule du compte de démonstration
-- ============================================================================
-- ⚠ À N'APPLIQUER QU'APRÈS avoir changé le mot de passe de demo@retex360.fr ET
--   l'avoir retiré du README.
--
-- POURQUOI CETTE MIGRATION EXISTE. La 014 avait rendu le compte de démonstration
-- incapable d'écrire, par des policies RESTRICTIVE ciblant son adresse. C'était
-- la bonne décision tant que ses identifiants figuraient dans le README : des
-- identifiants publics sans verrou en base, c'est une invitation au vandalisme
-- du contenu partagé.
--
-- Le compte devient le compte de travail du projet, et doit donc pouvoir créer,
-- commenter et déposer des pièces jointes. Le rôle n'y suffit pas : une policy
-- RESTRICTIVE se combine en ET avec les permissives et ignore complètement le
-- rôle. Un `super_admin` portant cette adresse resterait incapable de créer un
-- REX — c'est exactement le genre de blocage qu'on ne comprend qu'après une
-- demi-heure, parce que PostgREST renvoie un succès vide et non une erreur.
--
-- CE QUE CELA COÛTE. Dès que ce verrou est levé, la seule chose qui protège le
-- contenu partagé est le secret du mot de passe. S'il reste publié, n'importe
-- qui peut créer, modifier et supprimer des REX, et — en super_admin — sur tous
-- les SDIS. Les deux gestes du haut ne sont pas des recommandations.
--
-- Idempotent. Pour REVENIR à la lecture seule : réappliquer la migration 014.

DROP POLICY IF EXISTS "demo_readonly_rex_insert" ON rex;
DROP POLICY IF EXISTS "demo_readonly_rex_update" ON rex;
DROP POLICY IF EXISTS "demo_readonly_rex_delete" ON rex;

DROP POLICY IF EXISTS "demo_readonly_comments_insert" ON comments;
DROP POLICY IF EXISTS "demo_readonly_comments_update" ON comments;
DROP POLICY IF EXISTS "demo_readonly_comments_delete" ON comments;

DROP POLICY IF EXISTS "demo_readonly_attachments_insert" ON rex_attachments;
DROP POLICY IF EXISTS "demo_readonly_attachments_delete" ON rex_attachments;
