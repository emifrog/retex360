-- ============================================================================
-- Harnais de test RLS — jeu de données
-- ============================================================================
-- Deux SDIS (06 = A, 13 = B, insérés par la migration 001), chacun avec ses
-- rôles, et des REX couvrant toutes les combinaisons statut × visibilité qui
-- déterminent la frontière de tenant. Les UUID sont fixes et repris dans
-- src/__tests__/rls/fixtures.ts.
--
-- Exécuté sous le rôle propriétaire (RLS contournée) : c'est l'état de départ,
-- pas un scénario. Les claims sont vidés d'abord pour que les triggers de garde
-- (019 : role/sdis_id, auto-validation) considèrent l'écriture comme venant du
-- rôle service, comme lors d'un vrai seed.

SELECT set_config('request.jwt.claim.sub', '', false);
SELECT set_config('request.jwt.claims', '{}', false);

-- ---- Comptes ---------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-a000-0000000000a1', 'user.a@sdis06.fr'),
  ('c0000000-0000-4000-a000-0000000000a2', 'validator.a@sdis06.fr'),
  ('c0000000-0000-4000-a000-0000000000a3', 'admin.a@sdis06.fr'),
  ('c0000000-0000-4000-a000-0000000000b1', 'user.b@sdis13.fr'),
  ('c0000000-0000-4000-a000-0000000000b3', 'admin.b@sdis13.fr'),
  ('c0000000-0000-4000-a000-0000000000f0', 'super@retex360.fr'),
  ('c0000000-0000-4000-a000-0000000000d0', 'demo@retex360.fr');

INSERT INTO profiles (id, sdis_id, email, full_name, role) VALUES
  ('c0000000-0000-4000-a000-0000000000a1', 'a0000000-0000-4000-a000-000000000001', 'user.a@sdis06.fr',      'Agent A',      'user'),
  ('c0000000-0000-4000-a000-0000000000a2', 'a0000000-0000-4000-a000-000000000001', 'validator.a@sdis06.fr', 'Valideur A',   'validator'),
  ('c0000000-0000-4000-a000-0000000000a3', 'a0000000-0000-4000-a000-000000000001', 'admin.a@sdis06.fr',     'Admin A',      'admin'),
  ('c0000000-0000-4000-a000-0000000000b1', 'a0000000-0000-4000-a000-000000000002', 'user.b@sdis13.fr',      'Agent B',      'user'),
  ('c0000000-0000-4000-a000-0000000000b3', 'a0000000-0000-4000-a000-000000000002', 'admin.b@sdis13.fr',     'Admin B',      'admin'),
  ('c0000000-0000-4000-a000-0000000000f0', 'a0000000-0000-4000-a000-000000000001', 'super@retex360.fr',     'Super Admin',  'super_admin'),
  ('c0000000-0000-4000-a000-0000000000d0', 'a0000000-0000-4000-a000-000000000001', 'demo@retex360.fr',      'Compte Démo',  'user');

-- ---- REX -------------------------------------------------------------------
-- Statut × visibilité : c'est ce couple qui décide de la visibilité inter-SDIS.
INSERT INTO rex (id, sdis_id, author_id, title, intervention_date, type, severity, status, visibility) VALUES
  ('e0000000-0000-4000-a000-0000000000a1', 'a0000000-0000-4000-a000-000000000001', 'c0000000-0000-4000-a000-0000000000a1', 'A validé SDIS',       '2026-01-10', 'Incendie', 'majeur',        'validated', 'sdis'),
  ('e0000000-0000-4000-a000-0000000000a2', 'a0000000-0000-4000-a000-000000000001', 'c0000000-0000-4000-a000-0000000000a1', 'A validé inter-SDIS', '2026-01-11', 'Incendie', 'majeur',        'validated', 'inter_sdis'),
  ('e0000000-0000-4000-a000-0000000000a3', 'a0000000-0000-4000-a000-000000000001', 'c0000000-0000-4000-a000-0000000000a1', 'A en attente',        '2026-01-12', 'SAV',      'significatif',  'pending',   'sdis'),
  ('e0000000-0000-4000-a000-0000000000a4', 'a0000000-0000-4000-a000-000000000001', 'c0000000-0000-4000-a000-0000000000a1', 'A brouillon',         '2026-01-13', 'SAV',      'significatif',  'draft',     'sdis'),
  ('e0000000-0000-4000-a000-0000000000b1', 'a0000000-0000-4000-a000-000000000002', 'c0000000-0000-4000-a000-0000000000b1', 'B validé SDIS',       '2026-01-14', 'FDF',      'critique',      'validated', 'sdis'),
  ('e0000000-0000-4000-a000-0000000000b2', 'a0000000-0000-4000-a000-000000000002', 'c0000000-0000-4000-a000-0000000000b1', 'B validé inter-SDIS', '2026-01-15', 'FDF',      'critique',      'validated', 'inter_sdis'),
  ('e0000000-0000-4000-a000-0000000000b3', 'a0000000-0000-4000-a000-000000000002', 'c0000000-0000-4000-a000-0000000000b1', 'B en attente',        '2026-01-16', 'Incendie', 'majeur',        'pending',   'sdis'),
  ('e0000000-0000-4000-a000-0000000000b4', 'a0000000-0000-4000-a000-000000000002', 'c0000000-0000-4000-a000-0000000000b1', 'B brouillon',         '2026-01-17', 'Incendie', 'majeur',        'draft',     'sdis');

-- ---- Commentaires ----------------------------------------------------------
INSERT INTO comments (id, rex_id, author_id, content) VALUES
  ('f0000000-0000-4000-a000-0000000000a1', 'e0000000-0000-4000-a000-0000000000a1', 'c0000000-0000-4000-a000-0000000000a1', 'Commentaire de l''agent A sur un REX de A'),
  ('f0000000-0000-4000-a000-0000000000b1', 'e0000000-0000-4000-a000-0000000000b2', 'c0000000-0000-4000-a000-0000000000b1', 'Commentaire de l''agent B sur un REX de B');

-- ---- Pièces jointes --------------------------------------------------------
-- `staged` : déposée mais pas encore rattachée (rex_id NULL) — l'état exact que
-- l'ancienne policy INSERT rendait impossible.
INSERT INTO rex_attachments (id, rex_id, uploaded_by, file_name, storage_path) VALUES
  ('90000000-0000-4000-a000-0000000000a1', 'e0000000-0000-4000-a000-0000000000a1', 'c0000000-0000-4000-a000-0000000000a1', 'a.webp',      'rex-attachments/c0000000-0000-4000-a000-0000000000a1/a.webp'),
  ('90000000-0000-4000-a000-0000000000b1', 'e0000000-0000-4000-a000-0000000000b2', 'c0000000-0000-4000-a000-0000000000b1', 'b.webp',      'rex-attachments/c0000000-0000-4000-a000-0000000000b1/b.webp'),
  ('90000000-0000-4000-a000-0000000000a9', NULL,                                   'c0000000-0000-4000-a000-0000000000a1', 'staged.webp', 'rex-attachments/c0000000-0000-4000-a000-0000000000a1/staged.webp');
