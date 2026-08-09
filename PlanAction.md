# PLAN D'ACTION RECOMMANDÉ

## Phase 1 — Sécurité (avant déploiement) : ✅ TERMINÉE
1. ✅ Headers de sécurité (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)
2. ✅ Rate limiting global (middleware 120 req/min) + spécifique sur toutes les routes API
3. ✅ Vérification du mot de passe actuel avant changement
4. ✅ Sentry sampling réduit (traces: 0.2, profiles: 0.1)

## Phase 2 — Qualité (première semaine) : ✅ TERMINÉE
5. ✅ Jest + React Testing Library + 73 tests critiques (validators, rate-limit, sanitize, sanitize-server, image-optimizer)
6. ✅ Pipeline CI GitHub Actions (lint + typecheck + tests + build)

## Phase 3 — Polish (avant commercialisation) :
7. ✅ Prettier + eslint-config-prettier pour le formatage du code
8. ✅ Logging structuré avec correlation IDs + intégration Sentry
9. ✅ Open Graph / Twitter meta tags sur toutes les pages clés
10. PWA manifest si pertinent
11. Ajouter robots.txt + sitemap.ts

## Phase 4 — Bugs critiques & UX (avant commercialisation) :
12. Whitelist de domaines email pour l'inscription (bloquer les inscriptions non-SDIS)
13. ✅ Rate limiter global middleware → Redis Upstash (persistant entre les invocations serverless)
14. ✅ Migration SDIS : ON CONFLICT (code) DO NOTHING (préserve les modifications admin)
15. ✅ Police de lecture Inter pour le texte de corps (JetBrains Mono réservé au code via font-mono)

## Phase 5 — Performance & Optimisation :

### 5A — Requêtes & API (impact critique) : ✅ TERMINÉE
16. ✅ Page REX detail : 9 requêtes séquentielles → 2 Promise.all parallèles + fire-and-forget views
17. ✅ Dashboard : hook useDashboardStats/useDashboardCharts avec cache mémoire + dédup des requêtes in-flight
18. ✅ Charts API : requêtes ciblées par colonne + filtre date 12 mois au lieu de charger toute la table
19. ✅ Contributors API : query légère (author_id seul) + profils fetchés uniquement pour le top 5

### 5B — Bundle & code-splitting (impact haut) : ✅ TERMINÉE
20. ✅ @react-pdf/renderer : déjà server-only (API route), pas dans le bundle client
21. ✅ recharts (~200 KB) : lazy-load via next/dynamic + ssr:false + skeleton loading
22. ✅ @tiptap (~150 KB) : lazy-load via next/dynamic dans rex-form + skeleton loading
23. ✅ Suspense boundary sur RecentRex (async server component) avec skeleton streaming
24. ✅ @next/bundle-analyzer configuré (npm run analyze)

### 5C — React re-renders (impact moyen) : ✅ TERMINÉE
25. ✅ useMemo sur filteredUsers + stats dans UsersTable
26. ✅ analysisConfig extrait hors du composant AiAnalysis (constante module-level)
27. ✅ Références stables pour les 6 valeurs watch de RexForm (EMPTY_* useMemo)
28. ✅ Hook useRexList extrait (11 useState + 3 useCallback + 3 useEffect → hook dédié)
29. ✅ RexDetail (446 lignes) wrappé avec React.memo

### 5D — Cache & données (impact bas) : ✅ TERMINÉE
30. ✅ Cache-Control private max-age=300 + stale-while-revalidate sur stats/charts API
31. ✅ unstable_cache sur SDIS (1h) + tags (10min) sur la page search
32. ✅ Export CSV streaming avec ReadableStream + pagination par 500
33. ✅ Index DB : composite status+validated_at, favorites.created_at, comments.created_at, rex_attachments.rex_id

### 5E — Génération PDF (6 corrections critiques) : ✅ TERMINÉE
33b. ✅ Timeout Vercel PDF : 30s → 60s (route dédiée) + limites de taille (200 chrono, 200 prescriptions, 100k chars/champ, 5MB total)
33c. ✅ Double buffer mémoire éliminé : Buffer → ArrayBuffer zero-copy au lieu de new Uint8Array(copy)
33d. ✅ stripHtml artisanal → html-entities decode + regex robuste (gère tous les entities named/numeric/hex)
33e. ✅ Font JetBrains Mono inutile supprimée (enregistrée mais jamais utilisée, -500ms par PDF)
33f. ✅ Rate-limit spécifique PDF : 10/min par IP (séparé du rate-limit API global)
33g. ✅ Monitoring PDF : correlation ID, durée, taille, alerte si > 25s + requête Supabase optimisée (colonnes ciblées)
33h. ✅ Images/attachments dans le PDF : fetch parallèle, max 10 images, grille 2 colonnes avec légendes
33i. ✅ Anonymisation complète côté serveur : email non fetché, full_name masqué si anonymize=true
33j. ✅ Cache PDF : ETag basé sur updated_at + If-None-Match → 304 Not Modified + Cache-Control 5min
33k. ✅ Monitoring taille : alerte si PDF > 10 Mo


## Phase 6 — Responsive Mobile :

### 6A — Critiques (overflow / inaccessibilité) : ✅ TERMINÉE
34. ✅ Popover notifications : w-[calc(100vw-2rem)] sm:w-96 + ScrollArea max-h-[60vh]
35. ✅ Table admin : overflow-x-auto + colonnes SDIS/Inscrit cachées sur mobile (hidden sm:/md:table-cell)
36. ✅ Timeline horizontale : layout vertical automatique sur mobile (md:hidden / hidden md:block)

### 6B — Moyens (UX dégradée) : ✅ TERMINÉE
37. ✅ Popover notification-bell : w-[calc(100vw-2rem)] sm:w-80 + ScrollArea max-h-[50vh]
38. ✅ SelectTrigger filtres admin : w-full sm:w-40 / w-full sm:w-44
39. ✅ Sidebar mobile : w-[85vw] max-w-72 (adaptatif petits écrans 320px)
40. ✅ ScrollArea notifications : max-h-[60vh] sm:max-h-[400px] (fait avec 6A.34)
41. ✅ Charts : hauteurs responsives h-[200px] sm:h-[250px] / h-[150px] sm:h-[180px] + skeleton adaptatif

### 6C — Bas (améliorations) : ✅ TERMINÉE
42. ✅ Touch targets toolbar Tiptap : h-8 w-8 → h-9 w-9 (36px, +12.5%)
43. ✅ Grid form : grid-cols-1 sm:grid-cols-2 md:grid-cols-3 (étape intermédiaire tablette)


## Phase 7 — Commercialisation (bloquant avant toute vente) :

### 7A — Inscription sur invitation (PRIORITÉ MAX) — MODÈLE ✅ (UI restante)
> Modèle retenu : **invitation uniquement** (pas d'auto-inscription). Le contrôle
> primaire est le lien tokenisé ; `allowed_domains` est une restriction secondaire.

44. ✅ Migration SQL : tables `allowed_domains` + `invitations` (migration 016, RLS verrouillée, service-role only)
45. ✅ Inscription invitation-only : `lib/invitations.ts` (token 32o, hash SHA-256, usage unique, expiration 7 j) — server action + `/api/auth/register` reworkés
46. ✅ Messages explicites (lien invalide/expiré, domaine non autorisé)
47. ✅ Auto-inscription désactivée par défaut (page register pilotée par token)
48. ✅ Invitation par lien tokenisé : `POST /api/admin/invitations` (admin SDIS → user/validator de son SDIS ; super_admin → tout) + `GET /api/auth/invitation` (infos pour la page)
49. ✅ UI d'invitations `/admin/invitations` : créer (avec lien copiable usage unique), lister (statut en attente/accepté/expiré) et révoquer — scopée au SDIS (super_admin transverse) + lien de nav (sidebar/mobile). `DELETE /api/admin/invitations/[id]`.
50. ✅ UI de gestion des `allowed_domains` (ajout/suppression par SDIS) intégrée à `/admin/invitations` + endpoints `POST /api/admin/domains` et `DELETE /api/admin/domains/[id]`.
    ⚠️ Déploiement : appliquer la migration 016 avec le déploiement du code.

> **7A — état** : modèle invitation-only + UI invitations + UI domaines +
> **envoi automatique de l'email d'invitation** (SMTP générique via nodemailer,
> `lib/email.ts`, fournisseur au choix par env, fail-open vers le lien copiable) = ✅ TERMINÉ.

### 7B — Gestion des abonnements (avant la première facturation réelle) : ✅ TERMINÉE
> Pas besoin de Stripe maintenant. Dans le marché public, c'est bon de commande + mandat
> de paiement, pas de paiement en ligne. Ce qui compte : tracer quel SDIS est sur quel plan
> et jusqu'à quand, pour que ce soit opposable en cas de litige.

51. ✅ Migration SQL : table `subscriptions` (créée avec 7C, **migration 017**) :
    - `sdis_id` (FK UNIQUE), `plan` (essentiel/reseau/premium)
    - `status` (trial/active/suspended/expired), `suspended_reason` (text nullable)
    - `trial_ends_at`, `current_period_start`, `current_period_end`
    - `max_users` (null = illimité), `max_rex_per_month` (null = illimité)
    - RLS verrouillée (service-role only) — 7B ajoutera une policy de lecture « son SDIS »
52. ✅ Vérification d'abonnement actif au niveau du **layout dashboard** (1 lecture/navigation, plutôt que middleware edge par requête) : `getSubscriptionState` calcule le mode (`active`/`trial`/`readonly`/`blocked`) ; `mode=blocked` → redirection `/abonnement-expire`. Statut **dérivé à la lecture** (`lib/subscription.ts`), sans cron.
53. ✅ Trial : accès complet + bannière de rappel de fin d'essai (`subscription-banner.tsx`)
54. ✅ Expiré : lecture seule 30 j (grâce) puis blocage total. Écritures bloquées **au niveau base** par RLS `RESTRICTIVE` (`sdis_write_blocked()`, **migration 018**) sur rex/comments/rex_attachments — incontournable ; côté UI : bannière + masquage « Nouveau REX » + garde de `/rex/new` + erreurs 403 lisibles.
55. ✅ Page `/abonnement-expire` (« Votre abonnement a expiré — contactez votre référent SDIS », hors layout dashboard pour éviter la boucle de redirection)
56. ✅ Limites par plan côté API : `max_users` (création d'invitation + **gate final à l'inscription** anti-course) et `max_rex_per_month` (création de REX, compté par mois calendaire). Le super_admin n'est jamais soumis aux limites.

> **7B — état** : migration **018** (policy lecture self-SDIS + RLS RESTRICTIVE
> écritures) + helper d'état dérivé + bannière + page d'expiration + limites par plan
> = ✅ TERMINÉ. Pas de paiement en ligne (marché public : bon de commande + mandat).
> ⚠️ Déploiement : appliquer la migration **018** avec le déploiement du code.
> ℹ️ L'expiration est dérivée des dates (`trial_ends_at`/`current_period_end`) ; le super_admin
> peut aussi forcer `status` manuellement depuis le panel 7C. Un SDIS **sans** abonnement
> (référence non onboardée) n'est jamais bloqué ni limité.

### 7C — Panel super_admin d'onboarding (avant le 3e client) : ✅ TERMINÉE
> Ajouter un SDIS impliquait jusqu'ici de passer par la console Supabase ou des requêtes
> SQL manuelles. Acceptable pour 1-2 clients, ingérable à partir de 5.

57. ✅ Routes `/super-admin` (vue d'ensemble) et `/super-admin/sdis` protégées par rôle super_admin (gating page + nav dédiée sidebar/mobile)
58. ✅ Wizard "Ajouter un SDIS client" multi-étapes (`add-sdis-wizard.tsx`) : infos SDIS (existant ou nouveau : code/nom/département/région/logo) → domaines email autorisés → plan + statut + dates + limites → compte admin initial (invitation tokenisée 7A + email auto, fail-open lien copiable). `POST /api/super-admin/sdis`.
59. ✅ Vue liste SDIS clients : nom, plan, statut, nb users (/max), nb REX, date d'expiration, actions (`sdis-clients-table.tsx`)
60. ✅ Actions : suspendre/réactiver (avec motif), modifier l'abonnement (plan + limites + dates), réinitialiser MDP admin (lien de récupération + email). `PATCH /api/super-admin/sdis/[id]`, `POST .../reset-admin`.
61. ✅ Dashboard super_admin : métriques globales (SDIS clients/actifs/essai, users totaux, REX totaux, MRR estimé via `PLAN_CONFIG`)
62. ✅ Logs d'audit (`admin_audit_log`, helper `lib/audit.ts`, fail-open) : qui/quoi/quand, affichés sur la vue d'ensemble

> **7C — état** : migration **017** (`subscriptions` [modèle 7B #51], `admin_audit_log`,
> colonnes `sdis.departement`/`logo_url`) + routes API + UI (dashboard, liste, wizard,
> actions) + audit = ✅ TERMINÉ. **Enforcement** des abonnements (middleware, lecture seule,
> limites par plan) volontairement laissé à **7B**.
> ⚠️ Déploiement : appliquer la migration **017** avec le déploiement du code.
> ℹ️ Prix de plan (MRR) à ajuster dans `PLAN_CONFIG` (`src/types/index.ts`).

### 7D — Guide d'onboarding documenté (avant pilote SDIS 06)
> Le guide n'est pas de la documentation pour faire bonne figure : c'est ce qui évite
> de passer deux heures au téléphone à chaque nouveau client.

63. Tour guidé interactif in-app (première connexion → tooltips/popovers pas-à-pas)
64. Guide utilisateur (opérationnels) — PDF 8-10 pages :
    - Connexion, créer un premier REX
    - Recherche sémantique, filtres, favoris
    - Exports PDF
65. Guide administrateur (référent RETEX du SDIS) — PDF 5-8 pages :
    - Gestion des utilisateurs et rôles (user/validator/admin)
    - Configuration du SDIS, export des données
    - Sert aussi à rassurer les DSI lors de l'évaluation technique
66. FAQ intégrée dans l'app (/aide) avec les questions les plus fréquentes
67. Email de bienvenue automatique à l'inscription avec lien vers le guide

## Phase 8 — Scale (optionnel, fort impact commercial) :

### 8A — Sous-domaines par SDIS
> Ce n'est pas une nécessité technique, c'est un argument de vente.
> sdis06.retex360.fr communique une chose que retex360.vercel.app ne peut pas :
> "c'est votre espace, pas un espace partagé."

68. Domaine retex360.fr en production (sortir de .vercel.app)
69. Middleware multi-tenant Next.js : intercepter le host, identifier le SDIS, passer sdis_id au contexte
70. Certificats SSL wildcard *.retex360.fr (automatique chez Vercel sur domaine custom)
71. Branding par SDIS (logo, couleurs) dans le header — argument plan Premium
72. Redirection retex360.fr → page d'accueil marketing / login générique


## Phase 9 — Audit de sécurité & corrections (juin 2026) : ✅ EN GRANDE PARTIE TERMINÉE

### 9A — Bloquants (corrigés) : ✅ TERMINÉE
73. ✅ Changement de rôle admin cassé par la RLS (`profiles UPDATE USING auth.uid()=id` → 0 ligne en silence) : update via service role (`createAdminClient`) + détection 0 ligne
74. ✅ Sentry jamais initialisé (aucune instrumentation) : `instrumentation.ts` (register server/edge + `onRequestError`) + `instrumentation-client.ts`
75. ✅ Rate-limiting fail-open en serverless : Upstash **obligatoire en prod** (échec au boot), **fail-closed** sur auth & IA
76. ✅ Bucket `rex-attachments` public (IDOR storage) : bucket privé (migration 012) + **URLs signées** server-side (`lib/storage.ts`)

### 9B — Court terme (corrigés) : ✅ TERMINÉE
77. ✅ HTML Tiptap non assaini au stockage : `sanitize-server.ts` (DOMPurify + jsdom) sur POST/PUT REX ; config partagée durcie (sans `style`, `rel=noopener` forcé)
78. ✅ Commentaires sans validation : Zod + strip HTML + mentions plafonnées/dédupliquées/vérifiées (anti-spam notifications)
79. ✅ Fuites RLS inter-SDIS : migration 013 (validateurs/admins cloisonnés par SDIS, commentaire seulement sur REX visible, auteur peut supprimer son REX, `profiles INSERT` restreint)
80. ✅ Fonctions `SECURITY DEFINER` sans `search_path` : `ALTER FUNCTION ... SET search_path` (migration 013)
81. ✅ Duplication auth/rôle dans les routes : helper `requireUser`/`requireRole` (`lib/api-auth.ts`, appliqué aux routes admin)
82. ✅ Fuite de `error.message` au client (10 occurrences) : messages génériques + log interne
83. ✅ `npm audit fix` (non-breaking) : 43 → 20 vulnérabilités
84. ✅ README + PlanAction mis à jour

### 9C — Actions manuelles requises (sur les environnements) :
- ⚠️ Exécuter les migrations **012** puis **013** dans Supabase (prod + staging)
- ⚠️ Vérifier l'affichage des pièces jointes + export PDF après passage du bucket en privé (URLs signées)
- ⚠️ Confirmer que `UPSTASH_REDIS_REST_URL` / `_TOKEN` sont définis en production (sinon l'app refuse de démarrer — voulu)
- ⚠️ Tester un cycle complet création/édition/commentaire/validation **inter-SDIS** (cloisonnement RLS)

### 9D — Suivi sécurité (recommandé, non bloquant) :
85. ✅ Bump `next@16.2.9` (corrige le bypass middleware + la vuln npm haute) — audit 9F
86. [ ] Étendre `requireRole` aux ~25 routes restantes
87. [ ] CSP à nonce (retirer `unsafe-inline` / `unsafe-eval`)
88. [ ] Validation des magic bytes des uploads (extension/ré-encodage faits en 9F ; magic bytes encore à faire)
89. ✅ Validation Zod du PUT `/api/rex/[id]` (+ rate-limit) — audit 9F
90. [ ] Tests serveur d'autorisation (RBAC) + isolation multi-SDIS + seuil de couverture en CI
91. ✅ Durcir la CI : `npm audit` (seuil haut) + `format:check` — audit 9F
92. ✅ Supprimer la route de debug `/api/sentry-test` — audit 9F
93. [ ] Quotas IA par utilisateur (coût borné) — délimitation anti prompt-injection faite en 9F (insights)


### 9E — Durcissements complémentaires (juin 2026) : ✅ TERMINÉE
94. ✅ Politique de mot de passe forte : `strongPasswordSchema` (12 car. min + majuscule/minuscule/chiffre), appliquée à l'inscription, au changement et à la réinitialisation (login laissé permissif). Tests mis à jour.
95. ✅ Vérification anti-compromission HaveIBeenPwned (k-anonymity, côté serveur, fail-open) sur les 4 points de définition de mot de passe (`lib/password-breach.ts`).
96. ✅ Verrouillage `notifications INSERT` (lève la note de la migration 013) : policy restreinte à `auth.uid() = user_id` (migration 015), notifications cross-user routées via le client admin après autorisation, `EXECUTE` révoqué sur `create_notification`.
    ⚠️ Déploiement : code AVANT migration 015 (sinon coupure temporaire des notifications).

### 9D bis — Reste à traiter (recommandé) :
- [ ] Évolution mot de passe : refuser aussi la réutilisation de l'ancien (déjà géré par Supabase « same password »).
- [ ] Bump `next@16.2.9` (seule vuln npm haute restante).
- [ ] Étendre `requireRole` aux routes restantes ; CSP à nonce ; magic bytes uploads ; tests RBAC ; CI (`npm audit`, `format:check`) ; suppression `/api/sentry-test`.


### 9F — Audit complet & corrections (juin 2026) : ✅ TERMINÉE
> Audit multi-axes (sécurité, back-end, base de données, front-end, prod-readiness),
> corrigé en 3 lots : A (bugs visibles), B (sécurité), C (intégrité/perf/finitions).
> Vérifié : typecheck + lint + format + build OK, 73/73 tests, `npm audit` haute = 0.

**Isolation multi-tenant (migration 019)**
97. ✅ `profiles` n'est plus lisible globalement : SELECT scopé SDIS + super_admin + auteurs de REX partagés (helpers SECURITY DEFINER, anti-récursion).
98. ✅ Verrou `role`/`sdis_id` sur `profiles` (trigger) : un utilisateur ne peut plus changer de SDIS ni de rôle (écritures service-role préservées). `sdis_id` retiré de `profileUpdateSchema`.
99. ✅ `rex` INSERT impose `sdis_id = SDIS de l'auteur` (plus d'insertion cross-tenant).
100. ✅ Anti auto-validation : passer un REX à `validated` exige le rôle validateur+ (trigger).
101. ✅ Embedding écrit via le client RLS (plus d'overwrite cross-tenant via service-role).

**Bugs visibles (Lot A)**
102. ✅ Notifications en double supprimées (drop triggers 003 mention/validation ; l'app les insère déjà).
103. ✅ Mode lecture seule complet en UI : `canWrite` propagé (édition/promotion/suppression/validation/rejet + composer commentaires) + garde de `/rex/[id]/edit`.
104. ✅ validate/reject : contrôle du nombre de lignes (404/409 au lieu d'un faux succès + fausse notification).
105. ✅ Page `/notifications` créée ; retour d'erreur sur échec favori ; mentions `@` fiabilisées (Map persistante).
106. ✅ Liens légaux dé-codés en dur (`lib/legal.ts`, `NEXT_PUBLIC_LEGAL_BASE_URL`).

**Sécurité (Lot B)**
107. ✅ `dashboard/export` : réservé validateur+, scopé SDIS, rate-limité, plafonné (10k lignes).
108. ✅ `dashboard/insights` : données REX délimitées + consigne anti prompt-injection.
109. ✅ Uploads : extension dérivée du type réel ; avatar re-encodé, SVG/GIF refusés (anti-XSS bucket public) ; `rexId` validé.
110. ✅ PUT `/api/rex/[id]` validé (Zod) + rate-limité ; `next@16.2.9` ; `/api/sentry-test` supprimée ; check des variables d'env critiques au boot.

**Intégrité & perf (Lot C)**
111. ✅ Onboarding SDIS : rollback du SDIS créé si une étape échoue (plus d'orphelin).
112. ✅ Inscription : rollback du compte auth si la création de profil échoue (invitation réutilisable).
113. ✅ Quota mensuel REX en UTC ; `allowed_domains` unique par SDIS (migration 019).
114. ✅ Perf : vue `rex_counts_by_sdis` (fin du N+1 super_admin) + index `rex(author_id)` et `rex(sdis_id, created_at)`.
115. ✅ SEO/PWA (`robots`/`sitemap`/`manifest`) ; CI durcie ; `error.tsx` via Sentry ; code mort retiré ; doc à jour.

**Contrôles post-audit**
116. ✅ « disable_signup » vérifié côté GoTrue (`disable_signup: true`) : inscriptions publiques fermées — 7A non contournable depuis la console navigateur.
117. ✅ Exemption super_admin ajoutée dans `sdis_write_blocked()` (migration 018) : cohérence base ↔ application (le super_admin n'est jamais bloqué en écriture).
118. ✅ Export COMPLET par SDIS (`/api/admin/sdis/export`) : SDIS + abonnement + domaines + utilisateurs + REX + commentaires + **favoris** + manifest des PJ (admin = son SDIS ; super_admin = tout SDIS), audité. Accès UI : action « Exporter » dans la table super-admin + bouton « Exporter les données du SDIS » sur `/admin/users`.
119. ✅ Bug export RGPD personnel corrigé (`/api/profile/export` ciblait des colonnes inexistantes `factual_elements`/`production_type` → REX silencieusement omis ; corrigé).
120. ✅ Rollback d'inscription enveloppé dans try/catch (couvre le cas réseau qui *jette* au lieu de renvoyer `{ error }` ; suppression best-effort du compte auth).
121. ✅ Vue `rex_counts_by_sdis` en `security_invoker = on` (PG15+) : plus de fuite d'agrégats cross-SDIS si un client admin la requête (le panel super_admin passe par le rôle service).
122. ✅ Policy `profiles` : auto-lecture garantie (`id = auth.uid()`), robuste même si `sdis_id` était NULL.
123. ✅ Middleware : `manifest.webmanifest` / `robots.txt` / `sitemap.xml` exclus du matcher (étaient redirigés vers `/login` → erreur « manifest syntax error » dans la console). Désormais servis publiquement.
124. ✅ `dashboard/insights` : calcul LLM mis en cache (`unstable_cache`, 30 min) + bascule du limiteur `ai` → `api` + `Cache-Control` 10 min → fin des **429** et du coût d'un appel LLM par affichage du dashboard.

> ⚠️ Déploiement : appliquer les migrations **018** puis **019** avec ce code.
> ℹ️ Restant (hors lots, recommandé, non bloquant) : re-auth du changement de mot de passe sur client
> dédié, scoping SDIS des widgets dashboard (contributeurs/stats), clé de rate-limit anti-spoof XFF,
> magic bytes uploads, quotas IA, CSP à nonce, tests RBAC/RLS de bout en bout.


## Phase 10 — Audit (août 2026), lot 1-4 : ✅ TERMINÉE
> Quatre défauts trouvés en relisant la frontière application / RLS. Le fil rouge est
> le même partout : **PostgREST ne signale PAS par une erreur une écriture réduite à
> 0 ligne par la RLS** — il renvoie un succès vide. Tout code qui ne teste que
> `if (error)` prend un refus de la base pour une réussite.

97. ✅ **`rex_attachments` : policies `UPDATE`/`DELETE` inexistantes** (migration 020).
    Depuis la 001 la table n'avait que `SELECT` et `INSERT` permissives ; les 014 et 018
    n'ajoutent que du `RESTRICTIVE` (qui restreint, n'accorde jamais). Conséquences en
    cascade, toutes silencieuses :
    - dépôt initial impossible — la `WITH CHECK` exigeait un REX parent, or à la création
      le fichier est envoyé AVANT que le REX existe (`rex_id IS NULL`) ;
    - rattachement post-création (`update({ rex_id })`) sans effet → PJ orphelines ;
    - suppression sans effet côté base, alors que le fichier était déjà détruit (cf. 98).
    La 020 pose un jeu explicite SELECT/INSERT/UPDATE/DELETE (déposant, auteur du REX
    parent, admin du même SDIS via le helper `rex_sdis_id`), ajoute `uploaded_by =
    auth.uid()` en garde d'écriture, complète le verrou démo sur l'UPDATE et indexe
    `uploaded_by`.
    ⚠️ Si la base de prod fonctionne aujourd'hui, c'est que des policies y ont été
    ajoutées à la main hors migration : la 020 les remplace par du versionné.
98. ✅ **Suppressions : storage purgé avant l'autorisation base** (`rex/[id]`, `rex/attachments/[id]`).
    `removeAttachmentObjects` (service role, bypass RLS) s'exécutait AVANT le `DELETE`
    sous RLS. Un admin du SDIS A sur un REX validé inter-SDIS du SDIS B : fichiers
    détruits pour de bon, REX conservé, réponse `200 « REX supprimé »`. Ordre inversé,
    `.select('id')` sur le delete, `403` + log si 0 ligne — la RLS redevient l'autorité.
99. ✅ **Insights IA : fuite inter-SDIS** (`dashboard/insights`). Le corpus était lu via le
    client admin sans filtre SDIS (50 derniers REX, tous statuts, titres + difficultés +
    enseignements), puis mis en cache sous une clé unique et servi à tous. Désormais
    filtré explicitement sur les REX **validés** visibles par le SDIS de l'appelant
    (son SDIS + inter-SDIS/public), avec le `sdis_id` dans la clé et les tags de cache.
100. ✅ **Injection de filtre PostgREST** (`api/search`, `search-results`). `.or()` reçoit une
    *expression* parsée, pas une valeur : `q = "x,status.eq.draft"` produisait
    `or=(title.ilike.%x,status.eq.draft%)`, soit deux conditions. Nouveau module
    `lib/supabase/filters.ts` (`quoteFilterValue`, `orIlike`, `isUuid`) + 14 tests ;
    `searchParams.q` (sans plafond côté page serveur) est aussi tronqué à 500 car.
    `attachmentIds` passé à `.in()` est filtré sur la forme UUID (même classe de faille).

> Vérifié : `tsc --noEmit`, `eslint`, `format:check`, 87/87 tests, `next build` — tous verts.
> Sérialisation `.or()` contrôlée sur supabase-js : `or=(title.ilike."%x,status.eq.draft%")`
> = une seule condition, et une tentative de fermeture de guillemet ressort en `\"`.


## Phase 10 bis — Items 5 & 6 : ✅ TERMINÉE

### Item 5 — Dépendances : `npm audit` = 0 vulnérabilité
101. ✅ `npm audit fix` (non-breaking) : `next` 16.2.9 → **16.3.0** (DoS Image Optimization
     via SVG + divulgation des endpoints Server Functions), `postcss` → **8.5.23** (4 CVE,
     dont path traversal via `sourceMappingURL`).
102. ✅ `sharp` 0.34.5 → **0.35.3** (breaking annoncé) — 4 CVE libvips héritées.
     Les API utilisées (`metadata`, `rotate`, `resize`, `webp`, `toBuffer`) sont inchangées ;
     la suite `image-optimizer` encode/décode de vraies images (pas de mock) et passe.
     Runtime vérifié : sharp 0.35.3 / libvips 8.18.3. Node 20 en CI couvre le minimum requis.
     → `npm audit` **et** `npm audit --omit=dev` : 0 vulnérabilité.

### Item 6 — Cloisonnement SDIS des contrôles admin
> Le contrôle applicatif était `role === 'admin' || role === 'super_admin'`, sans jamais
> comparer les SDIS. La RLS, elle, cloisonne. L'écart ne créait pas d'accès illégitime
> (la base refusait), mais il produisait des refus SILENCIEUX — la cause racine du lot 2.
> La règle : **le contrôle applicatif doit être aussi étroit que la policy**.

103. ✅ Helper `isSdisAdmin(profile, sdisId)` dans `lib/api-auth.ts` — `super_admin`
     transverse, `admin` limité à son SDIS, deux `sdis_id` NULL ne s'égalent jamais.
104. ✅ Appliqué à 6 points de contrôle : `PUT`/`DELETE /api/rex/[id]`,
     `POST /api/rex/[id]/promote`, `DELETE /api/comments/[id]`,
     `DELETE /api/rex/attachments/[id]`, garde de page `/rex/[id]/edit`.
105. ✅ **Migration 021** — `comments` : la policy DELETE était `author_id = auth.uid()`,
     donc la suppression admin d'un commentaire tiers était un no-op silencieux
     (`{ success: true }` sans rien supprimer). Nouvelle policy : auteur **ou** admin du
     SDIS du REX parent, via le helper `SECURITY DEFINER` `comment_sdis_id()`.
     L'UPDATE reste réservé à l'auteur (un admin modère en supprimant, il ne réécrit pas).
106. ✅ Détection du 0 ligne étendue à `DELETE /api/comments/[id]` et
     `POST /api/rex/[id]/promote` (`maybeSingle` au lieu de `single` : un refus RLS est
     un 403, pas un 500).
107. ✅ `promote` : `updateError.message` ne fuit plus vers le client (message générique).
108. ✅ Helper `toOne()` (`lib/supabase/relations.ts`) : PostgREST renvoie un objet pour
     une relation to-one, supabase-js la type en tableau faute de types générés. Un cast
     aurait parié sur une forme ; se tromper ici rend un contrôle d'autorisation inopérant.
109. ✅ 12 tests sur `isSdisAdmin` + `toOne` (`__tests__/api-auth.test.ts`, env node —
     `next/server` exige les globales fetch). **99/99 tests.**

> Vérifié : `tsc --noEmit`, `eslint`, `format:check`, 99/99 tests, `next build` — tous verts.
> ⚠️ Migration 021 à appliquer sur les environnements.


## Phase 10 ter — Item 7 : tests RBAC / isolation multi-SDIS : ✅ TERMINÉE
> Les lots 1, 2 et 6 ont tous découvert la MÊME classe de défaut : un écart entre
> ce que l'application croit autoriser et ce que la RLS permet, invisible parce que
> PostgREST ne signale pas par une erreur une écriture réduite à 0 ligne. Rien dans
> la CI ne pouvait l'attraper : aucun test ne touchait une base.

110. ✅ **Harnais RLS sur Postgres réel** (`src/__tests__/rls/harness.ts`).
     Applique `supabase/test/bootstrap.sql` puis **les vraies migrations du dépôt** à
     une base neuve. Les policies testées sont celles qui partent en production.
     Moteur : **PGlite** (PostgreSQL 18 compilé en WASM) — tourne à l'identique en
     local et en CI, sans Docker ni service container. Choix motivé : une infra de
     test non exécutable localement serait invérifiable, donc exactement le genre de
     faux filet de sécurité que cet audit corrige.
111. ✅ `supabase/test/bootstrap.sql` : reconstitue la surface Supabase absente d'un
     Postgres nu — rôles `anon`/`authenticated`/`service_role`, schéma `auth`
     (`uid()`, `jwt()`, table `users`), schéma `storage` (`buckets`, `objects`,
     `foldername()`), domaine `vector`. `grants.sql` reproduit le modèle Supabase
     (DML complet à `authenticated`, la RLS seule tranche) — sans quoi les tests
     échoueraient en « permission denied » avant toute évaluation de policy.
112. ✅ Garde-fou : la migration 002 est ignorée (pgvector indisponible sous PGlite,
     et elle ne contient aucune policy). Le harnais **échoue** si une migration
     ignorée se met à contenir un `CREATE POLICY` — pas d'angle mort silencieux.
113. ✅ **62 tests RLS** sur 5 suites, ciblant les régressions déjà rencontrées :
     - `rex` : matrice statut × visibilité × rôle × SDIS, SDIS imposé à l'INSERT (019),
       auto-validation bloquée (019), **DELETE inter-SDIS = 0 ligne sans erreur** (lot 2) ;
     - `rex_attachments` : dépôt non rattaché accepté, rattachement, suppression par
       déposant / auteur du REX / admin du bon SDIS, **refus silencieux pour l'admin
       d'un autre SDIS** (lots 1 et 6), et le parcours de création complet de bout en bout ;
     - `comments` : modération admin cloisonnée (021), cascade des réponses ;
     - `profiles` : annuaire cloisonné, `role`/`sdis_id` verrouillés (019), compte démo ;
     - harnais : RLS active sur toutes les tables, cohérence seed ↔ fixtures.
114. ✅ Suite séparée (`npm run test:rls`, `jest.config.rls.js`, env node) : elle
     applique 21 migrations par fichier, trop lent pour la boucle de développement.
     Job CI dédié, `build` en dépend.
115. ✅ **Seuil de couverture en CI** (`npm run test:coverage`). Mesuré sur `src/lib`
     seulement — inclure les composants diluerait le seuil jusqu'à l'insignifiance.
     Calé en **cliquet** sur le niveau actuel (toute baisse échoue), avec **100 %
     exigé** sur les modules purs qui gardent une décision d'autorisation ou
     d'échappement (`supabase/filters`, `supabase/relations`, `sanitize`,
     `sanitize-config`).

### Ce que le harnais a révélé
116. ℹ️ **Le `super_admin` n'est PAS transverse en lecture sur `rex`.** La policy SELECT
     (013) ne lui accorde le cross-SDIS que pour le statut `pending` : un REX validé en
     visibilité `sdis` d'un autre SDIS, ou un brouillon d'autrui, lui reste masqué. Le
     panel super_admin affiche pourtant des agrégats complets — parce qu'il passe par le
     rôle service, pas parce que la policy l'autorise. Comportement défendable, mais la
     documentation le présentait comme un accès transverse simple. Encodé en test.

> Vérifié : `tsc --noEmit`, `eslint`, `format:check`, `next build`, **99 tests
> unitaires + 62 tests RLS**, seuil de couverture respecté — tous verts.
> Aucune infrastructure de test livrée sans avoir été exécutée.

### Réparation des données antérieures à la 020
117. ✅ `supabase/maintenance/reconcile_attachments.sql` — rapproche
     `rex_attachments` de `storage.objects` (backend Supabase Storage) et rapporte :
     synthèse, **lignes fantômes** (fichier détruit avant la 020, ligne survivante),
     objets orphelins, vignettes manquantes. Lecture seule ; le nettoyage est en
     section 5, à décommenter, et archive dans `rex_attachments_phantom_backup`
     avant suppression — un script écrit après un incident de destruction ne doit
     pas pouvoir détruire à son tour par inadvertance.
     - Piège traité : les vignettes (`<base>_thumb.webp`) existent dans le storage
       mais ne sont **jamais** enregistrées en base ; un rapprochement naïf les
       compterait toutes comme orphelines.
     - Les objets orphelins ne doivent PAS être supprimés par SQL sur
       `storage.objects` (le blob S3 resterait) : passer par l'API Storage.
     - Vérifié par `reconcile.rls.test.ts` (5 tests) sur Postgres réel, avec
       fantômes et orphelins fabriqués. Non-vacuité contrôlée par mutation :
       retirer l'exclusion des vignettes fait bien échouer le test.
     ⚠️ Si `SCALEWAY_S3_*` est défini en production, les objets ne sont pas dans
     `storage.objects` et ce script ne s'applique pas — vérifier l'environnement
     Vercel avant de l'exécuter.

> **67 tests RLS** au total après ajout.


## CE QUI EST BIEN EN PLACE
Domaine	Note	Détails
Auth & RBAC	A	Supabase + middleware + rôles (user/validator/admin/super_admin)
Validation des entrées	A	Zod sur les API (REX, commentaires, mentions) + sanitization XSS serveur (stockage) ET client (rendu)
RGPD/GDPR	A	Export données, suppression compte, cookie consent, mentions légales
Base de données	A	21 migrations ordonnées, RLS cloisonnée par SDIS, search_path fixé, pgvector, indexes
Stockage fichiers	A	Bucket rex-attachments privé + URLs signées (accès lié à la visibilité du REX)
Responsive mobile	A	Tailwind breakpoints, mobile-first, popovers/table/timeline/charts adaptifs (Phase 6)
Optimisation images	A	Sharp + WebP + thumbnails
Gestion d'erreurs	A	Try/catch, error boundaries, logging centralisé
TypeScript	A	Mode strict activé
Accessibilité	B	ARIA labels, sémantique HTML, page déclaration RGAA
React Compiler	A	Activé (memoization automatique partielle)
Code propre	A+	0 TODO/FIXME/HACK, 0 console.log sauvages
Sécurité headers	A	CSP, HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy (CSP à durcir : nonce)
Rate limiting	A+	Global Redis Upstash + par route (auth: 5/min, upload: 10/min, API: 60/min, AI: 10/min), fail-closed auth/IA, Upstash requis en prod
Tests	A	99 tests unitaires + 67 tests RLS sur Postgres réel (PGlite) appliquant les vraies migrations ; seuil de couverture en CI. Restent non couvertes : les routes API elles-mêmes (handlers HTTP)
CI/CD	A	GitHub Actions (lint + typecheck + tests + couverture + RLS + build + audit)
Formatage	A	Prettier + eslint-config-prettier
Logging	A	Structuré, correlation IDs, intégration Sentry prod
SEO / Social	A	Open Graph + Twitter Cards sur toutes les pages clés
Typographie	A	Inter (texte de corps) + JetBrains Mono (code/données)
Fonts	A	next/font optimisé (subset latin, CSS variables)
Images	A	next/image + sharp + lazy loading + sizes responsive
