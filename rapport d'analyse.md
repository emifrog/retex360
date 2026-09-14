# Avis sur RETEX360

Analyse du 13 septembre 2026, sur l’archive `retex360-main.zip` fournie.

**Mon avis : le projet possède une vraie cohérence métier et une base technique sérieuse. Je le considère comme une version avancée à fiabiliser avant un déploiement avec des données opérationnelles sensibles. La priorité est de garantir les règles de validation et de confidentialité, puis de vérifier les parcours complets avec des utilisateurs.**

---

## Suites données — 14 septembre 2026

Les six constats ont été repris dans le code et corrigés. Chaque section ci-dessous porte un encadré **« Correction apportée »** décrivant ce qui a été fait et comment cela est vérifié. Le texte de l’analyse initiale est conservé tel quel : il reste le constat de départ.

| Constat | Priorité | État |
|---|---|---|
| 1. Création directe d’un REX validé | Haute | Corrigé, vérifié en base |
| 2. Règles d’édition non garanties par la base | Haute | Corrigé, vérifié en base |
| 3. Parcours de récupération du mot de passe | Haute | Corrigé, **reste à éprouver de bout en bout** |
| 4. Confidentialité des profils et des PDF | Haute | Corrigé, vérifié en base |
| 5. Rubriques absentes de l’export PDF | Moyenne | Corrigé |
| 6. Échec de la suppression d’un compte | Moyenne | Corrigé |

Le verrouillage des écritures repose sur une migration ajoutée, `024_rex_write_guards.sql`, appliquée à l’instance Supabase du projet. Sa bonne application y a été confirmée par deux requêtes : le trigger `trg_rex_guard_write` est présent et remplace `trg_rex_guard_validation` ; le rôle `authenticated` ne détient plus que sept colonnes en lecture sur `profiles`, `email` n’en faisant plus partie.

**Ce qui reste ouvert**, détaillé en fin de document : la vérification du parcours de récupération avec un courriel réel, la variable `NEXT_PUBLIC_APP_URL` en production, les liens légaux, et l’absence de tests de parcours navigateur — que ces corrections n’adressent pas.

---

## Périmètre et vérifications

Lecture de la structure, des principaux parcours, des routes serveur, des migrations SQL, des tests et de la configuration de livraison. Les documents du dépôt ont été traités comme des descriptions à confronter au code, pas comme des demandes de modification.

Travail sur une copie extraite de l’archive. Aucun accès à une base de production, aucun envoi de message et aucune correction du code applicatif.

| Vérification locale | Au 13 septembre | Après correction |
|---|---|---|
| Tests unitaires | 259 réussis, 15 suites | 268 réussis, 16 suites |
| Tests des droits d’accès aux données, RLS | 67 réussis, 6 suites | 86 réussis, 6 suites |
| Vérification TypeScript | Réussie | Réussie |
| Analyse ESLint | Réussie | Réussie |
| Formatage Prettier | Réussi | Réussi |
| Construction de production Next.js | Réussie avec des paramètres Supabase fictifs | Réussie |
| Couverture des lignes mesurées dans `src/lib/**/*.ts` | 41,25 % | 41,01 % |

Les dix-neuf tests RLS ajoutés sont des tests négatifs : ils vérifient qu’une écriture interdite échoue réellement en base, et non que la route la refuse. C’est la distinction que les constats 1 et 2 ont rendue nécessaire.

La couverture recule légèrement, et il vaut mieux le dire que le masquer. Deux modules sont apparus dans le périmètre mesuré : `lib/pdf/rex-columns.ts`, couvert à 100 %, et `lib/auth/recovery.ts`, à 0 %. Ce dernier ne contient que deux constantes, exercées en production par le middleware et deux routes, mais qu’aucun test unitaire n’importe — les tester reviendrait à vérifier qu’une chaîne de caractères vaut elle-même. Le chiffre baisse donc sans que rien ne soit moins testé qu’avant.

Cette couverture ne représente pas toute l’application : les routes et les composants ne sont pas inclus dans ce périmètre. Aucune suite de tests de parcours navigateur n’a été identifiée, et les corrections n’en ajoutent pas. Le build émet des avertissements de dépréciation concernant la convention middleware et des options Sentry ; ils subsistent.

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

> **Correction apportée — 14 septembre 2026**
>
> Le garde-fou de la base couvre désormais l’INSERT autant que l’UPDATE. La migration `024_rex_write_guards.sql` remplace `rex_guard_validation()` par `rex_guard_write()`, déclenché en `BEFORE INSERT OR UPDATE` : une création est limitée aux statuts `draft` et `pending`, et les métadonnées de validation — `validated_by`, `validated_at`, `numero_rex` — ne sont acceptées que d’un validateur du SDIS.
>
> Côté API, le statut est validé par un schéma dédié, `rexAuthorStatusSchema`, qui n’accepte que `draft` et `pending`. Il n’était jusque-là contrôlé nulle part : absent des schémas Zod, il était recopié tel quel depuis le corps de la requête. Le schéma répond 400 là où la base lèverait une exception SQL ; c’est la base qui reste la garantie.
>
> Ordre de déclenchement vérifié sur l’instance : `trg_generate_numero_rex` précède `trg_rex_guard_write` dans l’ordre alphabétique, donc le numéro attribué automatiquement à la validation est déjà posé quand le garde-fou examine la ligne. L’ordre inverse aurait fait échouer toute validation.
>
> Vérifié par quatre tests RLS négatifs et quatre tests unitaires.

### 2. Les règles d’édition de l’interface ne sont pas garanties par la base — priorité haute

**Deux comportements confirmés localement avec un simple agent :** modification du titre de son REX déjà validé en conservant ce statut ; déplacement de son brouillon vers un autre SDIS en modifiant `sdis_id`.

La route d’édition interdit certaines opérations, mais la politique RLS UPDATE reste permissive pour l’auteur. Le trigger de validation ne s’applique pas à une modification qui conserve le statut `validated`. Le rattachement du REX au SDIS n’est pas verrouillé à la modification.

**Conséquence :** l’approbation ne garantit plus le contenu consulté, et un agent peut attribuer son document à un autre SDIS. Cela ne prouve pas qu’il puisse lire les documents privés de cet autre SDIS.

**Correction conseillée :** protéger les colonnes d’appartenance et définir les champs modifiables selon le rôle et le statut au niveau base. Pour les changements après validation, prévoir une nouvelle version ou une nouvelle validation.

Références : `supabase/migrations/013_rls_sdis_partitioning.sql:39` ; `supabase/migrations/019_tenant_isolation_hardening.sql:87` ; `src/app/api/rex/[id]/route.ts`.

> **Correction apportée — 14 septembre 2026**
>
> Même migration. `sdis_id` et `author_id` sont figés à la modification pour toute écriture portant une identité utilisateur : un REX n’est ni déplaçable vers un autre SDIS, ni réattribuable. Un transfert légitime passe par le rôle service, de façon tracée.
>
> Le contenu d’un REX validé n’est plus modifiable, sauf par un validateur du SDIS. La comparaison ne porte pas sur une liste de colonnes mais sur la ligne entière, moins les compteurs d’usage et l’horodatage : une rubrique ajoutée par une migration future est protégée d’office, sans qu’il faille penser à l’inscrire quelque part. C’est ce type d’oubli qui avait produit le constat.
>
> L’exclusion des compteurs n’est pas une facilité : `views_count` est incrémenté à chaque consultation et `favorites_count` par un trigger, tous deux sous l’identité du lecteur. Sans elle, ouvrir un REX validé aurait levé une exception.
>
> La route d’édition accepte toujours `draft` et `pending`, et ne touche plus au statut quand la requête ne le mentionne pas — ce qui permet à un administrateur de corriger un REX validé sans le faire retomber en brouillon.
>
> Vérifié par six tests RLS.

### 3. Le parcours de récupération du mot de passe est incohérent — priorité haute

**Constat de code, sans essai d’un courriel réel :** la page considère toujours le lien valide à cause de `|| true`. Aucun traitement explicite du code de récupération par `exchangeCodeForSession` ou `verifyOtp` n’a été trouvé. Le middleware redirige les utilisateurs déjà authentifiés hors de `/reset-password`.

L’API de réinitialisation vérifie une session authentifiée, mais pas son origine « récupération ». Elle n’impose donc pas elle-même la preuve supplémentaire attendue pour ce parcours, contrairement au changement de mot de passe classique qui vérifie le mot de passe actuel. Le comportement final dépend aussi des paramètres Supabase non fournis.

**Correction conseillée :** réaliser un parcours de récupération explicite, autoriser sa page dans le middleware et tester le lien valide, expiré, déjà utilisé ainsi que le cas d’une session ordinaire.

Références : `src/app/(auth)/reset-password/page.tsx:44` ; `src/lib/supabase/middleware.ts:111`, `:132` ; `src/app/api/auth/reset-password/route.ts:45`, `:55`.

> **Correction apportée — 14 septembre 2026**
>
> Le maillon manquant était la route de rappel. `src/app/api/auth/callback/route.ts` traite maintenant le lien reçu par courriel, dans ses deux formats — `code` échangé par `exchangeCodeForSession`, ou `token_hash` et `type` vérifiés par `verifyOtp`, selon le gabarit configuré dans Supabase. Le paramètre de redirection interne est contraint à un chemin local, pour que le lien ne puisse pas servir de redirection ouverte.
>
> En cas de succès, un cookie `httpOnly` de quinze minutes marque la session comme issue d’une récupération. C’est lui qui distingue ce parcours d’une session ordinaire, distinction que `supabase.auth.getUser()` ne permet pas : le middleware laisse passer `/reset-password` sur sa seule présence, et l’API de réinitialisation l’exige puis le consomme, de sorte qu’un lien ne serve qu’une fois. Le changement de mot de passe retrouve ainsi la preuve supplémentaire qui lui manquait.
>
> Le `|| true` de la page a disparu : la validité n’est plus devinée depuis l’URL mais établie par la route de rappel, et l’écran « lien invalide ou expiré » — jusqu’ici inatteignable — s’affiche enfin.
>
> **Réserve, et elle est entière :** ce parcours n’a pas été éprouvé de bout en bout. Cela demande une instance Supabase et un courriel réel. Deux conditions extérieures au code conditionnent son fonctionnement, décrites en fin de document : la déclaration de l’URL de rappel dans les redirections autorisées du projet Supabase — faite — et la valeur de `NEXT_PUBLIC_APP_URL` en production, qui fabrique le lien envoyé.

### 4. La confidentialité des profils et des PDF est plus limitée que les libellés ne le suggèrent — priorité haute

**Confirmé localement :** un utilisateur peut lire l’adresse email d’un auteur d’un autre SDIS dès lors que cet auteur possède un REX partagé. La politique qui autorise l’affichage de son identité donne accès à la ligne du profil, dont la colonne email, même si l’interface ne l’affiche pas.

**Constat de code :** l’export « anonymisé » masque le nom de l’auteur. Les noms éventuellement saisis dans les textes, les responsables de prescriptions et les images ne subissent pas ce traitement.

**Correction conseillée :** séparer les données de profil partageables des données privées. Décrire précisément le masquage proposé par l’export et prévoir une revue avant diffusion lorsque le contenu doit être anonymisé.

Références : `supabase/migrations/019_tenant_isolation_hardening.sql:51` ; `supabase/migrations/001_initial_schema.sql:34` ; `src/app/api/rex/[id]/pdf/route.ts:136` ; `src/lib/pdf/rex-template.tsx:545`, `:749` ; `src/components/rex/export-pdf-button.tsx`.

> **Correction apportée — 14 septembre 2026**
>
> *Confidentialité des profils.* La policy de la 019 rend visible la LIGNE de profil d’un auteur de REX partagé hors de son SDIS, pour afficher son nom ; une policy filtre des lignes et jamais des colonnes, l’adresse suivait donc. La correction est un privilège de colonne, seul mécanisme qui sache masquer une colonne : `authenticated` perd le droit de lecture sur `profiles` au niveau table, et le retrouve sur sept colonnes nommées, `email` exclu. Retirer la colonne des requêtes applicatives n’aurait rien réglé — l’application parle à Supabase avec la clé anon depuis le navigateur, et la requête directe restait possible.
>
> Six appels applicatifs ont été alignés ; l’adresse de l’utilisateur courant vient désormais de la session, qui en est la source de vérité. Un type `ReadableProfile` matérialise dans le code ce que le rôle applicatif a le droit de lire. Conséquence assumée : un `select('*')` sur `profiles` échoue maintenant, et toute colonne ajoutée plus tard devra être explicitement accordée. Le défaut devient la non-divulgation.
>
> Vérifié sur l’instance déployée : `authenticated` ne détient plus que `id`, `sdis_id`, `full_name`, `role`, `grade`, `avatar_url` et `created_at`.
>
> *Export PDF.* Le responsable de prescription — une personne nommée, au même titre que l’auteur — est désormais masqué. Surtout, le document porte en tête un encadré énonçant ce qui est masqué et ce qui ne l’est pas : noms cités dans les textes libres, personnes visibles sur les images, lieux, dates et unités engagées. Le libellé du menu passe d’« Export anonymisé » à « Export sans nom d’auteur », assorti d’une invitation à relire avant diffusion. Le traitement reste partiel, mais il ne promet plus davantage qu’il ne fait — c’était l’objet du constat.
>
> Vérifié par six tests RLS.

### 5. L’export PDF omet des rubriques pourtant prévues — priorité moyenne

La requête de la route PDF ne sélectionne pas `temoignages`, `description_site`, `ressources_complementaires` ni `numero_rex`. Le modèle de document prévoit leur affichage, mais ne reçoit pas ces données. Une conversion de type forcée masque cette divergence à TypeScript.

**Correction conseillée :** définir un type explicite pour les données d’export, aligner la sélection et ajouter une vérification d’export sur un REX contenant toutes les rubriques.

Références : `src/app/api/rex/[id]/pdf/route.ts:54`, `:146` ; `src/lib/pdf/rex-template.tsx:466`, `:583`, `:765`, `:788`.

> **Correction apportée — 14 septembre 2026**
>
> Les quatre rubriques sont chargées. Plutôt que de compléter la liste de colonnes — ce qui aurait rétabli la situation sans empêcher qu’elle se reproduise — la liste devient une source unique, `REX_PDF_COLUMNS` dans `src/lib/pdf/rex-columns.ts`, déclarée à côté du rendu et utilisée par la route pour construire sa requête. Module distinct du template, qui importe `@react-pdf/renderer` publié en ESM et ne peut donc pas être chargé par un test.
>
> La conversion de type forcée n’a pas disparu — le client Supabase n’est pas typé par le schéma, et la liste de colonnes est construite à l’exécution — mais elle a changé de place. Elle se trouve à la frontière d’entrée des données, où elle décrit ce que la requête rapporte, et non plus à l’appel du template, où elle affirmait que le contrat du document était satisfait. C’est cette affirmation qui masquait les rubriques manquantes ; l’appel de rendu est désormais vérifié par le compilateur.
>
> Cinq tests relisent le template et vérifient la correspondance dans les deux sens : toute colonne lue est déclarée, toute colonne déclarée est lue. Une rubrique ajoutée au document sans être chargée fait échouer la suite.

### 6. La suppression d’un compte contributeur échoue — priorité moyenne

**Confirmé localement :** supprimer le profil d’un auteur de REX provoque une violation de la contrainte `rex_author_id_fkey`.

La route suppose que les REX seront supprimés en cascade, mais leur référence à l’auteur n’est pas configurée ainsi. D’autres références au profil peuvent aussi empêcher l’opération.

**Correction conseillée :** définir le devenir des contributions au départ d’un agent : conservation avec désactivation ou anonymisation, réattribution, ou suppression lorsque c’est approprié. Adapter ensuite les contraintes et le parcours. Éviter d’ajouter une cascade générale qui effacerait involontairement la mémoire du SDIS.

Références : `src/app/api/profile/delete/route.ts:28` ; `supabase/migrations/001_initial_schema.sql:51`, `:75`, `:119`, `:133`.

> **Correction apportée — 14 septembre 2026**
>
> Décision retenue parmi les trois voies proposées : **conservation avec anonymisation**. La cascade manquante n’a pas été ajoutée — elle aurait effacé des REX validés et partagés avec d’autres SDIS, ce que le constat mettait précisément en garde de faire.
>
> Le compte est neutralisé plutôt que supprimé. Le profil devient une pierre tombale : nom, adresse, grade et avatar effacés, rôle ramené à `user`, rattachement au SDIS conservé puisqu’il porte celui des REX. Les données strictement personnelles — favoris et notifications — sont supprimées ; elles disparaissaient jusqu’ici par cascade depuis `profiles`, et le profil survivant, il faut les retirer explicitement. Les REX et commentaires restent, attribués au profil anonymisé. Le compte d’authentification est banni et son adresse neutralisée dans un domaine réservé par la RFC 2606, ce qui ferme l’accès et libère l’adresse pour une éventuelle réinscription.
>
> Aucune donnée personnelle ne subsiste : l’anonymisation vaut effacement sans détruire ce qui a été partagé.
>
> L’ordre des opérations est choisi pour que l’échec soit rattrapable — le profil d’abord, la fermeture du compte en dernier. Si la dernière étape échoue, l’agent est encore connecté et peut relancer l’opération, qui est idempotente ; l’ordre inverse l’aurait enfermé dehors avec un profil encore nominatif.
>
> Les libellés de l’interface, qui annonçaient la suppression définitive des REX — ce que la route ne faisait pas et n’aurait pas dû faire — énoncent désormais ce qui se passe réellement.
>
> Deux tests RLS, dont un qui fige la violation de `rex_author_id_fkey`. S’il se met à passer, c’est qu’une cascade a été ajoutée, et qu’un départ d’agent efface désormais des REX validés.

## Mon avis sur la suite du produit

**Je privilégierais la fiabilité et la simplicité de saisie avant d’élargir les fonctionnalités.** Le formulaire principal atteint 905 lignes et couvre de nombreuses rubriques. Sa longueur de code ne démontre pas à elle seule un problème d’ergonomie, mais sa maintenance gagnerait à séparer les sections métier. Je n’ai pas identifié de sauvegarde automatique ni d’alerte de sortie avec des modifications non enregistrées dans ce formulaire.

Pour l’utilisateur, les améliorations les plus utiles à éprouver seraient une remontée initiale très courte, des brouillons faciles à reprendre, des erreurs de validation affichées sous les champs concernés et un suivi clair des actions issues du RETEX. Le formulaire reçoit les erreurs détaillées de l’API mais affiche actuellement surtout un message générique de sauvegarde.

La documentation contient plusieurs affirmations « terminé » ou « complet » que ces constats nuancent. Je distinguerais les fonctionnalités implémentées, celles vérifiées par tests automatiques et celles validées en usage réel. L’archive ne permet pas de certifier les performances en charge, la localisation effective de tous les traitements ni la conformité des déploiements.

Ordre de travail recommandé :

1. ~~Corriger les règles de création, modification et validation dans la base, puis ajouter les tests négatifs correspondants.~~ **Fait** — migration `024_rex_write_guards.sql`, dix-neuf tests RLS négatifs.
2. Réparer et tester de bout en bout récupération de mot de passe, partage des profils, export et départ d’un agent. **Réparés ; la récupération de mot de passe reste à éprouver avec un courriel réel.**
3. Valider un parcours complet avec deux SDIS de test : invitation, rédaction, soumission, validation, partage, recherche et export.
4. Organiser un pilote restreint avec des utilisateurs métier après correction des points prioritaires. Mesurer le temps de rédaction, le taux d’abandon, la facilité à retrouver un enseignement et le suivi des prescriptions.

**Le potentiel est réel. Le prochain gain de valeur viendra de la confiance dans le contenu validé et de l’usage quotidien, plus que du nombre de fonctionnalités supplémentaires.**

---

## Ce qui reste ouvert — 14 septembre 2026

### Trouvé en corrigeant, hors des six constats

L’export RGPD sélectionnait `profiles.updated_at`, colonne qu’aucune migration n’a jamais créée. PostgREST rejetait la requête entière en 42703, et le résultat n’étant pas contrôlé, l’export partait avec `profile: null` — sans erreur visible, alors qu’il répond à une obligation de portabilité. Corrigé, avec contrôle du résultat.

### À faire avant que la récupération de mot de passe fonctionne en production

- **Redirections autorisées dans Supabase.** `…/api/auth/callback` doit y figurer pour l’environnement local comme pour la production. Fait le 14 septembre.
- **`NEXT_PUBLIC_APP_URL` en production.** C’est cette variable qui fabrique le lien envoyé par courriel, Supabase ne faisant qu’autoriser l’URL. Si elle conserve sa valeur de développement, les utilisateurs recevront un lien vers `localhost`. Elle se règle dans les variables d’environnement de l’hébergeur, pas dans le `.env` local, qui doit rester en `localhost` pour que le développement reste testable — et sans barre oblique finale, les sept utilisations concaténant un chemin derrière.
- **Essai complet.** Demande de réinitialisation, ouverture du lien dans le même navigateur, changement effectif du mot de passe. Ouvrir le lien depuis un autre appareil échoue légitimement : le flux PKCE dépose un vérificateur dans le navigateur qui fait la demande. C’est le comportement de Supabase, pas une régression.

### Points connus, non traités

- **Liens légaux cassés.** La route `/legal` n’existe pas dans l’application. La variable `NEXT_PUBLIC_LEGAL_BASE_URL` doit désigner le site qui héberge réellement les mentions légales, les CGU et la politique de confidentialité, faute de quoi les trois liens répondent 404. Des mentions légales et une politique de confidentialité sont obligatoires pour un service traitant des données d’agents publics.
- **Convention `middleware` dépréciée.** Next 16 l’a renommée `proxy` ; le build le signale. Hors du périmètre des six constats, non traité.
- **Aucun test de parcours navigateur.** Les corrections ajoutent des tests de base et des tests unitaires, aucun test d’interface. Les interactions entre formulaire, API et base restent vérifiées à la main. C’était déjà la recommandation de l’analyse initiale ; elle tient.

### Portée de ces vérifications

Les comportements de base sont vérifiés par le harnais PGlite sur les migrations réelles du dépôt, et les deux volets de la migration 024 ont été confirmés sur l’instance Supabase du projet. Les services réels d’authentification, de stockage et d’IA n’ont toujours pas été éprouvés, et aucune mesure de performance en charge n’a été faite.
