-- Migration 012 — Rendre le bucket `rex-attachments` privé + RLS storage
--
-- Avant : le bucket était public (getPublicUrl partout) => toute pièce jointe,
-- y compris d'un REX en brouillon/en attente, était accessible par URL devinable
-- ou partagée, en contournant la RLS applicative.
--
-- Après : bucket privé. Les lectures passent par des URLs signées générées
-- côté serveur (service role) après vérification de la visibilité du REX.
-- Les écritures restent faites par le client utilisateur, restreintes au
-- dossier de l'utilisateur (clé d'objet : rex-attachments/<user_id>/<fichier>).
--
-- Idempotent : ré-exécutable sans erreur.

-- 1) Créer le bucket s'il n'existe pas, et forcer public = false.
insert into storage.buckets (id, name, public)
values ('rex-attachments', 'rex-attachments', false)
on conflict (id) do update set public = false;

-- 2) Upload : un utilisateur authentifié ne peut écrire que dans son dossier.
--    foldername('rex-attachments/<uid>/f.webp') = {rex-attachments, <uid>}
drop policy if exists "rex_attachments_insert_own" on storage.objects;
create policy "rex_attachments_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'rex-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- 3) Suppression par le propriétaire (cleanup d'upload, suppression de sa pièce).
--    Les suppressions inter-utilisateurs (admin) passent par le service role.
drop policy if exists "rex_attachments_delete_own" on storage.objects;
create policy "rex_attachments_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'rex-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- 4) Pas de policy SELECT publique ni "authenticated" volontairement :
--    la lecture est servie exclusivement via createSignedUrl côté serveur
--    (service role), ce qui lie l'accès aux pièces jointes à la visibilité
--    du REX parent (déjà filtrée par la RLS de la table `rex`).
--
-- Note : si d'anciennes policies de storage permissives existent (créées à la
-- main lors du passage en bucket public), les retirer :
--   drop policy if exists "Public read rex-attachments" on storage.objects;
--   drop policy if exists "Anyone can view rex-attachments" on storage.objects;
