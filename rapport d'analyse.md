# Avis sur RETEX360

Analyse du 13 septembre 2026, sur l’archive `retex360-main.zip` fournie.

**Mon avis : le projet possède une vraie cohérence métier et une base technique sérieuse. Je le considère comme une version avancée à fiabiliser avant un déploiement avec des données opérationnelles sensibles. La priorité est de garantir les règles de validation et de confidentialité, puis de vérifier les parcours complets avec des utilisateurs.**

## Périmètre et vérifications

Lecture de la structure, des principaux parcours, des routes serveur, des migrations SQL, des tests et de la configuration de livraison. Les documents du dépôt ont été traités comme des descriptions à confronter au code, pas comme des demandes de modification.

Travail sur une copie extraite de l’archive. Aucun accès à une base de production, aucun envoi de message et aucune correction du code applicatif.

| Vérification locale | Résultat |
|---|---|
| Tests unitaires | 259 réussis, 15 suites |
| Tests des droits d’accès aux données, RLS | 67 réussis, 6 suites |
| Vérification TypeScript | Réussie |
| Analyse ESLint | Réussie |
| Formatage Prettier | Réussi |
| Construction de production Next.js | Réussie avec des paramètres Supabase fictifs |
| Couverture des lignes mesurées dans `src/lib/**/*.ts` | 41,25 % |

Cette couverture ne représente pas toute l’application : les routes et les composants ne sont pas inclus dans ce périmètre. Aucune suite de tests de parcours navigateur n’a été identifiée. Le build émet des avertissements de dépréciation concernant la convention middleware et des options Sentry.

Les vérifications complémentaires utilisent le harnais PGlite du projet et ses migrations, dans une base locale jetable. Elles confirment les comportements du schéma fourni ; la configuration effectivement déployée de Supabase n’a pas été inspectée. Les migrations vectorielles 002 et 022 sont exclues par ce harnais. Les services réels d’authentification, de stockage et d’IA n’ont pas été testés.

## Ce qui fonctionne bien dans la conception

- **Une cible et un usage précis.** Signalement → PEX → RETEX, validation, chronologie, prescriptions et partage entre SDIS forment un parcours cohérent. La valeur potentielle vient de la capitalisation des enseignements et de leur réutilisation.
- **Une architecture compréhensible.** Next.js, React et TypeScript ; séparation entre interface, routes, services et migrations. Une réécriture générale ne me paraît pas justifiée.
- **Des protections concrètes.** Invitations avec jeton haché, contrôles de rôles, politiques RLS, nettoyage HTML, contrôle des signatures de fichiers et stockage privé avec liens temporaires.
- **Un effort de qualité déjà conséquent.** Tests des migrations sur PostgreSQL embarqué, intégration continue, contrôles de types et formatage, surveillance des dépendances prévue dans les workflows.
- **Une IA intégrée à des tâches précises.** Synthèse et recherche sémantique, avec limitation du contexte et mécanismes de repli. Son utilité réelle reste à mesurer sur un corpus représentatif.

## Problèmes à traiter en priorité

### 1. Un agent peut créer directement un REX validé — priorité haute

**Confirmé sur la base locale :** un utilisateur de rôle `user` peut insérer son propre REX avec `status = 'validated'` et `visibility = 'inter_sdis'`.

La migration 019 protège le passage au statut validé uniquement lors d’un UPDATE. Sa politique INSERT vérifie l’auteur et le SDIS, sans restreindre le statut. La route POST reprend également `clean.status` depuis le corps initial : la validation Zod ne définit pas ce champ et le résultat transformé de cette validation n’est pas utilisé pour l’écriture.

**Conséquence :** le circuit d’approbation peut être court-circuité et un contenu apparaître comme validé sans validation effective.

**Correction conseillée :** autoriser explicitement les statuts de création, écrire les seules données validées et contrôler les transitions dans la base pour INSERT comme UPDATE. Réserver les métadonnées de validation à une opération dédiée.

Références : `src/app/api/rex/route.ts:73`, `:83`, `:99` ; `src/lib/validators/rex.ts:25` ; `supabase/migrations/019_tenant_isolation_hardening.sql:76`, `:103`.

### 2. Les règles d’édition de l’interface ne sont pas garanties par la base — priorité haute

**Deux comportements confirmés localement avec un simple agent :** modification du titre de son REX déjà validé en conservant ce statut ; déplacement de son brouillon vers un autre SDIS en modifiant `sdis_id`.

La route d’édition interdit certaines opérations, mais la politique RLS UPDATE reste permissive pour l’auteur. Le trigger de validation ne s’applique pas à une modification qui conserve le statut `validated`. Le rattachement du REX au SDIS n’est pas verrouillé à la modification.

**Conséquence :** l’approbation ne garantit plus le contenu consulté, et un agent peut attribuer son document à un autre SDIS. Cela ne prouve pas qu’il puisse lire les documents privés de cet autre SDIS.

**Correction conseillée :** protéger les colonnes d’appartenance et définir les champs modifiables selon le rôle et le statut au niveau base. Pour les changements après validation, prévoir une nouvelle version ou une nouvelle validation.

Références : `supabase/migrations/013_rls_sdis_partitioning.sql:39` ; `supabase/migrations/019_tenant_isolation_hardening.sql:87` ; `src/app/api/rex/[id]/route.ts`.

### 3. Le parcours de récupération du mot de passe est incohérent — priorité haute

**Constat de code, sans essai d’un courriel réel :** la page considère toujours le lien valide à cause de `|| true`. Aucun traitement explicite du code de récupération par `exchangeCodeForSession` ou `verifyOtp` n’a été trouvé. Le middleware redirige les utilisateurs déjà authentifiés hors de `/reset-password`.

L’API de réinitialisation vérifie une session authentifiée, mais pas son origine « récupération ». Elle n’impose donc pas elle-même la preuve supplémentaire attendue pour ce parcours, contrairement au changement de mot de passe classique qui vérifie le mot de passe actuel. Le comportement final dépend aussi des paramètres Supabase non fournis.

**Correction conseillée :** réaliser un parcours de récupération explicite, autoriser sa page dans le middleware et tester le lien valide, expiré, déjà utilisé ainsi que le cas d’une session ordinaire.

Références : `src/app/(auth)/reset-password/page.tsx:44` ; `src/lib/supabase/middleware.ts:111`, `:132` ; `src/app/api/auth/reset-password/route.ts:45`, `:55`.

### 4. La confidentialité des profils et des PDF est plus limitée que les libellés ne le suggèrent — priorité haute

**Confirmé localement :** un utilisateur peut lire l’adresse email d’un auteur d’un autre SDIS dès lors que cet auteur possède un REX partagé. La politique qui autorise l’affichage de son identité donne accès à la ligne du profil, dont la colonne email, même si l’interface ne l’affiche pas.

**Constat de code :** l’export « anonymisé » masque le nom de l’auteur. Les noms éventuellement saisis dans les textes, les responsables de prescriptions et les images ne subissent pas ce traitement.

**Correction conseillée :** séparer les données de profil partageables des données privées. Décrire précisément le masquage proposé par l’export et prévoir une revue avant diffusion lorsque le contenu doit être anonymisé.

Références : `supabase/migrations/019_tenant_isolation_hardening.sql:51` ; `supabase/migrations/001_initial_schema.sql:34` ; `src/app/api/rex/[id]/pdf/route.ts:136` ; `src/lib/pdf/rex-template.tsx:545`, `:749` ; `src/components/rex/export-pdf-button.tsx`.

### 5. L’export PDF omet des rubriques pourtant prévues — priorité moyenne

La requête de la route PDF ne sélectionne pas `temoignages`, `description_site`, `ressources_complementaires` ni `numero_rex`. Le modèle de document prévoit leur affichage, mais ne reçoit pas ces données. Une conversion de type forcée masque cette divergence à TypeScript.

**Correction conseillée :** définir un type explicite pour les données d’export, aligner la sélection et ajouter une vérification d’export sur un REX contenant toutes les rubriques.

Références : `src/app/api/rex/[id]/pdf/route.ts:54`, `:146` ; `src/lib/pdf/rex-template.tsx:466`, `:583`, `:765`, `:788`.

### 6. La suppression d’un compte contributeur échoue — priorité moyenne

**Confirmé localement :** supprimer le profil d’un auteur de REX provoque une violation de la contrainte `rex_author_id_fkey`.

La route suppose que les REX seront supprimés en cascade, mais leur référence à l’auteur n’est pas configurée ainsi. D’autres références au profil peuvent aussi empêcher l’opération.

**Correction conseillée :** définir le devenir des contributions au départ d’un agent : conservation avec désactivation ou anonymisation, réattribution, ou suppression lorsque c’est approprié. Adapter ensuite les contraintes et le parcours. Éviter d’ajouter une cascade générale qui effacerait involontairement la mémoire du SDIS.

Références : `src/app/api/profile/delete/route.ts:28` ; `supabase/migrations/001_initial_schema.sql:51`, `:75`, `:119`, `:133`.

## Mon avis sur la suite du produit

**Je privilégierais la fiabilité et la simplicité de saisie avant d’élargir les fonctionnalités.** Le formulaire principal atteint 905 lignes et couvre de nombreuses rubriques. Sa longueur de code ne démontre pas à elle seule un problème d’ergonomie, mais sa maintenance gagnerait à séparer les sections métier. Je n’ai pas identifié de sauvegarde automatique ni d’alerte de sortie avec des modifications non enregistrées dans ce formulaire.

Pour l’utilisateur, les améliorations les plus utiles à éprouver seraient une remontée initiale très courte, des brouillons faciles à reprendre, des erreurs de validation affichées sous les champs concernés et un suivi clair des actions issues du RETEX. Le formulaire reçoit les erreurs détaillées de l’API mais affiche actuellement surtout un message générique de sauvegarde.

La documentation contient plusieurs affirmations « terminé » ou « complet » que ces constats nuancent. Je distinguerais les fonctionnalités implémentées, celles vérifiées par tests automatiques et celles validées en usage réel. L’archive ne permet pas de certifier les performances en charge, la localisation effective de tous les traitements ni la conformité des déploiements.

Ordre de travail recommandé :

1. Corriger les règles de création, modification et validation dans la base, puis ajouter les tests négatifs correspondants.
2. Réparer et tester de bout en bout récupération de mot de passe, partage des profils, export et départ d’un agent.
3. Valider un parcours complet avec deux SDIS de test : invitation, rédaction, soumission, validation, partage, recherche et export.
4. Organiser un pilote restreint avec des utilisateurs métier après correction des points prioritaires. Mesurer le temps de rédaction, le taux d’abandon, la facilité à retrouver un enseignement et le suivi des prescriptions.

**Le potentiel est réel. Le prochain gain de valeur viendra de la confiance dans le contenu validé et de l’usage quotidien, plus que du nombre de fonctionnalités supplémentaires.**
