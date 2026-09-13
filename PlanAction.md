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
10. ✅ PWA manifest (`src/app/manifest.ts` → `/manifest.webmanifest`)
11. ✅ `robots.txt` + `sitemap.xml` (`src/app/robots.ts`, `src/app/sitemap.ts`)

## Phase 4 — Bugs critiques & UX (avant commercialisation) :
12. ✅ Whitelist de domaines email — table `allowed_domains` par SDIS, appliquée à
    l'émission d'invitation (`/api/admin/invitations`) et administrable via
    `/api/admin/domains`
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


## Phase 10 quater — Item 8 : pagination bornée & rate-limit complet : ✅ TERMINÉE

118. ✅ **Rate-limit sur les 12 handlers restants.** L'audit initial était fait par
     FICHIER, ce qui masquait les handlers non protégés dans un fichier dont un autre
     handler l'était (`GET /api/rex` à côté d'un `POST` protégé, `DELETE
     /api/comments/[id]` à côté d'un `PUT`, `GET /api/rex/[id]/comments`). Refait par
     handler : **48 handlers, 0 sans limiteur**.
     Routes couvertes : `dashboard/{stats,charts,contributors}`, `rex/stats`,
     `favorites`, `notifications` (GET + POST), `profile/export`,
     `rex/attachments/[id]` DELETE, `rex/[id]` DELETE, `rex` GET,
     `rex/[id]/comments` GET, `comments/[id]` DELETE.
     Plusieurs handlers ne recevaient pas `request` du tout : paramètre ajouté.
119. ✅ **Limiteur `export` (5/min)** pour `dashboard/export` et `profile/export`.
     Un export streame l'intégralité du corpus auquel l'appelant a droit (jusqu'à
     10 000 REX, ou toutes ses données personnelles) : c'est le levier naturel d'une
     exfiltration en masse par un compte légitime, pas un appel API ordinaire.
120. ✅ **`paginationSchema` enfin branché** — il existait depuis longtemps sans être
     utilisé nulle part. `GET /api/rex` (`page`, `limit`) et `/api/notifications`
     (`limit`) passaient `parseInt()` directement à Postgres : `?limit=999999`
     scannait toute la table, `?page=abc` produisait `range(NaN, NaN)`.
     Subtilité : `searchParams.get()` renvoie `null` pour un paramètre absent, et la
     coercion Zod transforme `null` en 0, qui échoue sur `.positive()`. Passer `null`
     tel quel aurait cassé toute requête sans pagination — d'où `?? undefined`
     (et `?? '20'` pour les notifications, dont la taille par défaut diffère).
121. ✅ `search-results.tsx` : `page` vient de l'URL sans plafond ni garde. `NaN` et
     valeurs négatives retombent sur 1 au lieu de faire échouer la page.
122. ✅ `notifications` POST : `notificationIds` partait non validé dans une liste
     PostgREST `in.(...)` — même classe que le lot 4, filtré par `isUuid`.
123. ✅ 7 tests fixant le contrat de `paginationSchema`, dont le comportement sur
     `null` qui motive le `?? undefined`. **106 tests unitaires.**

> Vérifié : `tsc --noEmit`, `eslint`, `format:check`, `next build`, 106 tests
> unitaires + 67 tests RLS, seuil de couverture respecté — tous verts.


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
Tests	A	106 tests unitaires + 67 tests RLS sur Postgres réel (PGlite) appliquant les vraies migrations ; seuil de couverture en CI. Restent non couvertes : les routes API elles-mêmes (handlers HTTP)
CI/CD	A	GitHub Actions (lint + typecheck + tests + couverture + RLS + build + audit)
Formatage	A	Prettier + eslint-config-prettier
Logging	A	Structuré, correlation IDs, intégration Sentry prod
SEO / Social	A	Open Graph + Twitter Cards sur toutes les pages clés
Typographie	A	Inter (texte de corps) + JetBrains Mono (code/données)
Fonts	A	next/font optimisé (subset latin, CSS variables)
Images	A	next/image + sharp + lazy loading + sizes responsive

---

## Phase 11 — Audit externe (11 septembre 2026), lots P0 à P3 : ✅ TERMINÉE

> Point de départ : le code du 9 août était propre le 9 août. Un mois plus tard,
> l'arbre de production portait 1 CVE critique et 5 élevées **sans qu'une ligne
> ait changé**. La leçon du lot est là : sur un projet qui connaîtra des périodes
> sans développement actif, la veille automatisée des dépendances n'est pas du
> confort, c'est le seul dispositif qui tienne quand plus personne ne regarde.

### P0 — Bloquants (corrigés)
111. ✅ `npm audit fix` : **7 → 0** vulnérabilité en production. `next` 16.3.0 →
     **16.3.4** (2 RCE non authentifiées : API d'optimisation d'images sur AVIF
     `GHSA-2xp9-vwfh-vxw4`, et serveur hébergé sous Windows `GHSA-p293-qw3h-jr36`),
     `sharp` 0.35.3 → **0.35.4** (libheif), `nodemailer` 9.0.1 → **9.1.1**
     (contournement de validation du domaine destinataire — or l'invitation
     tokenisée est le mécanisme d'entrée dans un tenant), `@tiptap/core` → **3.31.3**.
     `package.json` inchangé : les plages `^` couvraient déjà les correctifs.
112. ✅ Validation des **magic bytes** avant Sharp (`src/lib/file-signature.ts`,
     100 % couvert). Le contrôle portait sur `file.type` — déclaratif, falsifiable —
     tandis que Sharp détecte le format par le contenu : un HEIF/AVIF annoncé
     `image/jpeg` traversait et atteignait libheif. Liste blanche de signatures,
     puis c'est le type **vérifié** qui sert en aval (extension, aiguillage,
     colonne `file_type`). Le même trou existait dans `/api/profile/avatar`
     (bucket **public**) : corrigé aussi, et le contrôle y précède désormais la
     suppression de l'ancien avatar.

### P1 — Élevés (corrigés)
113. ✅ `images.remotePatterns` épinglé au projet Supabase courant, dérivé de
     `NEXT_PUBLIC_SUPABASE_URL`. `*.supabase.co` autorisait **tous** les projets
     Supabase existants : proxy d'images ouvert à nos frais, et moyen de placer
     un fichier choisi devant le décodeur.
114. ✅ Rate limiting **par utilisateur** (`limitByUser`) et non plus par IP, sur
     47 des 48 handlers ; les 5 routes anonymes restent en IP (`limitByIp`), ce
     qui est l'effet recherché contre le bourrage d'identifiants. Un SDIS est une
     collectivité derrière une IP unique : le quota « par IP » y était un quota
     « par SDIS », produisant des 429 en usage normal sans jamais plafonner un
     compte. Le limiteur global du middleware devient un garde-fou anti-flood
     (1000/min par IP, `GLOBAL_RATE_LIMIT_PER_MINUTE`).
115. ✅ `GET /api/rex/[id]` et `GET /api/rex/[id]/comments` ne contrôlaient pas
     l'authentification (ils s'en remettaient à la RLS). Contrôle explicite :
     un anonyme reçoit désormais **401** au lieu de 404.
116. ⏸️ Facturation : reportée sur décision. L'absence de prélèvement en ligne
     est un choix déjà acté en **7B** (marché public = bon de commande + mandat),
     et il tient. Ce qui manque n'est donc pas Stripe mais le suivi qui rend ce
     modèle tenable à l'échelle : `subscriptions` est saisie à la main par le
     super_admin, sans échéancier, sans facture émise, sans relance. Supportable
     à 2 clients, coûteux à 10.

### P2 — Moyens (corrigés)
117. ✅ `subscription.ts` **0 % → 100 %** (22 tests). `deriveState()` décide qui
     peut écrire et quand l'accès se coupe — logique de facturation jusque-là
     non testée. Le **fail-open** (une panne de lecture laisse tout le monde
     écrire) est désormais documenté par un test, pour qu'un basculement en
     fail-closed soit une décision et non un effet de bord.
     ⚠️ **Asymétrie constatée, à trancher** : un essai qui expire seul obtient
     les 30 jours de grâce ; le même passé manuellement à `expired` est bloqué
     immédiatement, car l'ancrage ne suit `trial_ends_at` que si le statut est
     resté `trial`. Test écrit sur le comportement actuel.
118. ✅ `validators/rex.ts` **0 % → 100 %** branches/fonctions/lignes (32 tests) :
     la règle de promotion DGSCGC Signalement → PEX → RETEX.
119. ✅ Accessibilité : les **34 règles `jsx-a11y`** du preset *recommended* en
     `error` (obligation légale, décret n°2019-768, et critère d'attribution en
     marché public). **30 → 0** violation. Défauts réels corrigés au passage, que
     le linter ne voyait pas : filtres par tag en `<span>` cliquables donc
     inatteignables au clavier ; actions du centre de notifications imbriquées
     dans une zone cliquable (bouton dans lien) et invisibles au focus clavier.
     Déclaration `/accessibilite` mise à jour et datée, avec ce qui reste
     explicitement non couvert.

### P3 — Dette (traitée)
120. ✅ Filtrage Sentry (`src/lib/sentry-scrub.ts`, 100 % couvert) : corps de
     requête, paramètres d'URL, cookies et en-têtes hors liste blanche sont
     retirés avant envoi. Un REX décrit une intervention réelle, et le cookie de
     session partait avec. `sendDefaultPii: false` explicite sur les trois
     runtimes. Config Session Replay morte supprimée (taux d'échantillonnage
     sans `replayIntegration`).
121. ✅ `requireUser` étendu : **15 → 30** fichiers de routes sur 41. Les 6
     routes répondant `{ message: 'Non autorisé' }` sont laissées en l'état —
     migrer changerait la forme de leur réponse, donc le contrat de l'API.
     ⚠️ **À trancher** : l'API a deux conventions de réponse d'erreur
     (`{ error }` et `{ message }`). Les unifier est un changement de contrat.
122. ✅ `script-src 'unsafe-eval'` retiré **en production** (conservé en
     développement, où React Refresh en a besoin).
     ⚠️ **À valider en préproduction** avant mise en production.
123. ❌ CSP à nonce — **tentée, puis retirée**. Next prérend `/login`,
     `/register`, `/forgot-password`, `/reset-password`, `_not-found` et
     `_global-error` : leur HTML est figé au build, donc sans nonce, alors que
     l'en-tête en porte un nouveau à chaque requête. Vérifié sur le HTML
     prérendu — `.next/server/app/login.html` contient 4 `<script>` inline
     (bascule de thème, polyfill de soumission de formulaire, deux blocs
     d'hydratation) et 0 attribut `nonce`. En l'état, la politique aurait cassé
     toutes les pages d'entrée dans l'application. Y parvenir suppose de rendre
     ces pages dynamiques — et `_not-found` / `_global-error` ne s'y prêtent pas
     simplement — puis de vérifier sur un serveur réel que Next appose bien le
     nonce. Chantier à mener application démarrée, pas une ligne de config.
124. ✅ Documentation resynchronisée : items 10, 11 et 12 étaient faits sans être
     cochés (manifest PWA, `robots.txt` / `sitemap.xml`, whitelist de domaines).

### Reste à faire, hors périmètre de ces lots
- **Dependabot / Renovate + `npm audit --audit-level=high` en CI.** C'est la vraie
  correction du P0 : rien n'avait prévenu pendant un mois.
- **RGAA manuel** : contrastes sur les deux thèmes, parcours clavier des cinq
  écrans principaux, restitution par lecteur d'écran. Demande l'application qui
  tourne ; la part automatisable est verrouillée.
- **Facturation** (116), **CSP à nonce** (123), **unification des réponses
  d'erreur** (121), **asymétrie de la grâce d'abonnement** (117).

---

## Phase 12 — Garde-fous IA (11 septembre 2026) : ✅ TERMINÉE

> Le constat qui ouvre le lot : le limiteur de débit borne la FRÉQUENCE des
> appels au modèle, jamais leur COÛT. Les champs REX n'ayant aucune borne haute
> (`TEXT` en base, uniquement des `.min()` côté Zod), un REX d'un mégaoctet
> représentait ~250 000 tokens par appel — soit, au quota de 10 appels/minute,
> jusqu'à 150 millions de tokens par heure et par compte. La route PDF avait
> ses gardes (100 k caractères/champ, 5 Mo) ; les routes IA n'en avaient aucune.

125. ✅ `src/lib/ai-context.ts` (100 % couvert, 20 tests) : troncature par champ
     (4 000 caractères — un RETEX complet passe sans être coupé), corpus
     d'embedding borné à 18 000 caractères pour tenir sous les 8 192 tokens de
     `text-embedding-3-small` (au-delà, l'API ne tronque pas : elle refuse).
126. ✅ Anti-injection étendu à `/api/ai/analyze`, qui injectait le REX brut
     dans le prompt alors que `dashboard/insights` délimitait déjà le sien.
     Scénario : un rédacteur glisse des instructions dans un champ, un
     validateur demande l'analyse, et le verdict qui lui est rendu est fabriqué
     par l'auteur du REX.
     Deux failles corrigées au passage :
     - **Sortie du bloc par balise fermante** : ni `analyze` ni `insights` ne
       neutralisaient les chevrons DANS le contenu. Écrire `</donnees_rex>`
       suffisait à refermer le bloc et à faire passer la suite pour une consigne.
       `neutralizeDelimiters` les remplace par des chevrons simples.
     - **Fuite hors bloc** : le prompt `tags` d'`analyze` interpolait
       `rex.tags.join(', ')` en dehors du corpus délimité. Retiré — les tags
       figurent déjà dedans.
     L'avertissement système est désormais une constante unique
     (`UNTRUSTED_CONTENT_NOTICE`) partagée par les deux surfaces, appliquée
     après le `switch` pour qu'aucun cas ne puisse partir sans elle.
127. ✅ Timeout explicite de 25 s sur le client LLM (`maxDuration: 30` dans
     `vercel.json` : le défaut du SDK — 10 minutes — laissait la fonction être
     tuée avant d'avoir pu logger l'échec) + `maxRetries: 1`, chaque tentative
     étant facturée.
128. ✅ Journalisation des tokens consommés à chaque appel (`model`,
     `promptTokens`, `completionTokens`, `totalTokens`, `durationMs`). Sans
     cette trace, la dépense LLM est invisible : ni alerte de dérive, ni
     refacturation possible par SDIS.

### Reste à traiter sur l'IA
- **Modèles datés de 2024** : `anthropic/claude-3.5-sonnet` (défaut de
  `chatCompletion`) et `anthropic/claude-3-haiku` (usage réel des deux routes).
  La génération actuelle côté Anthropic est Opus 5 / Sonnet 5 / **Haiku 4.5**,
  successeur direct du Haiku en place. Les autres entrées de
  `OPENROUTER_MODELS` (GPT-4 Turbo, Mistral Large, Llama 3.1, Gemini Pro 1.5)
  sont de la même génération. ⚠️ Les identifiants OpenRouter diffèrent de ceux
  de l'API Anthropic directe : à vérifier sur leur catalogue avant de modifier
  la constante.
- **Fallback embeddings mort** : `src/lib/openai.ts` note lui-même qu'OpenRouter
  ne supporte pas les embeddings, et tente quand même l'appel. Sans
  `OPENAI_API_KEY`, chaque recherche sémantique paie un aller-retour voué à
  l'échec avant de retomber sur la recherche texte.
- **Quota IA par SDIS** (item 93) : les garde-fous ci-dessus bornent le coût
  PAR APPEL ; il n'existe toujours pas de plafond mensuel. Le modèle est prêt
  côté données (`subscriptions.max_rex_per_month` fait déjà ce travail pour les
  REX) mais demande une migration.
- **`max_tokens: 500`** sur `analyze` et `insights` : serré pour « 3 à 5
  recommandations concrètes ».

---

## Phase 13 — Bascule vers Mistral AI (11 septembre 2026) : ✅ TERMINÉE (chat)

> Décision : appeler Mistral **en direct** (`api.mistral.ai`) plutôt que via
> OpenRouter. Les contenus de REX décrivent des interventions réelles ; les
> faire transiter par une passerelle hors UE affaiblissait l'argument de
> souveraineté que portent déjà Scaleway (stockage) et GlitchTip (supervision) —
> et cet argument est un critère de recevabilité auprès d'un acheteur public.

129. ✅ `src/lib/openai.ts` → `src/lib/llm.ts` (12 tests, 100 % lignes/fonctions).
     Le nom n'était plus vrai : le module sert désormais deux fournisseurs.
     - **Génération de texte → Mistral en direct.** L'API est compatible OpenAI
       au niveau du fil : le SDK `openai` la sert avec une `baseURL` différente.
     - **Embeddings → OpenAI, inchangés.** Voir 131.
130. ✅ Modèle par défaut `mistral-small-2603` (Mistral Small 4, $0,15/$0,60 par
     million de tokens), ajustable par `MISTRAL_MODEL` sans redéploiement.
     `mistral-medium-2604` est disponible dans `MISTRAL_MODELS` mais coûte ~10×
     plus en entrée et ~12× en sortie. Remplace `anthropic/claude-3-haiku`
     (mars 2024) et le défaut `anthropic/claude-3.5-sonnet` (juin 2024).
131. ⏸️ **Embeddings NON migrés — blocage de schéma.** `mistral-embed` produit
     des vecteurs de **1024** dimensions, or `rex.embedding` (migration 001) et
     `search_rex_by_embedding` (migration 002) sont figés à **1536**, plus
     l'index `ivfflat` construit dessus. Basculer suppose une migration de
     schéma ET la régénération de tous les embeddings existants : les anciens
     vecteurs ne deviennent pas imprécis, ils deviennent **incomparables**. La
     recherche sémantique reste donc sur OpenAI jusqu'à ce lot.
132. ✅ Repli d'embedding mort supprimé. Le code appelait
     `openrouter.ai/api/v1/embeddings` alors que son propre commentaire notait
     qu'OpenRouter ne sert pas les embeddings : chaque recherche sémantique
     payait un aller-retour voué à l'échec avant de retomber sur le plein texte.
     Échec explicite désormais — l'appelant a déjà son repli.
133. ✅ `connect-src` nettoyé de `https://openrouter.ai` : les appels au modèle
     partent des routes API, côté serveur, où cette directive — qui ne régit que
     le navigateur — n'a aucune prise. L'entrée n'autorisait rien d'utile.
134. ✅ Badges « OpenRouter » de l'interface (`ai-insights`, `ai-analysis`)
     remplacés par « Mistral AI » — c'est visible par l'utilisateur final.
135. ✅ `.env.example`, README et tableau des variables mis à jour, avec la
     raison du maintien d'OpenAI pour les seuls embeddings.

### Reste à traiter
- **Migration des embeddings vers `mistral-embed`** (131) : migration SQL
  (colonne `VECTOR(1024)`, signature de la fonction, index) + script de
  régénération. Supprimerait la dernière dépendance non européenne.
- ⚠️ **Rotation de clé** : la clé Mistral initiale a transité en clair et doit
  être considérée comme compromise — à régénérer avant tout déploiement.
- **Quota IA par SDIS** (item 93) : toujours ouvert. Les garde-fous de la
  phase 12 bornent le coût PAR APPEL, pas le volume mensuel.

---

## Phase 14 — Embeddings sur Mistral (13 septembre 2026) : ✅ SOCLE POSÉ

136. ✅ **Migration 022** : `rex.embedding` passe de `VECTOR(1536)` à
     `VECTOR(1024)`, signature de `search_rex_by_embedding` et index ivfflat
     repris. Un vecteur de 1536 dimensions ne se convertit pas en 1024 — ce sont
     deux espaces différents — mais un embedding est une donnée DÉRIVÉE,
     recalculable depuis le contenu du REX. La fonction reste SECURITY INVOKER
     (le cloisonnement RLS par SDIS de la migration 013 s'applique donc aussi à
     la recherche sémantique) et gagne un `search_path` fixé, comme les
     fonctions durcies en 013.
137. ✅ `generateEmbedding` bascule sur `mistral-embed`. Plus aucune dépendance
     à OpenAI : un seul fournisseur, européen, une seule clé.
     Garde de cohérence ajoutée — un vecteur dont la dimension ne correspond pas
     à `EMBEDDING_DIMENSIONS` est refusé à la source, avec un message qui nomme
     la migration à reprendre, plutôt qu'une erreur d'insertion Postgres à
     l'autre bout de la chaîne.
138. ✅ `supabase/maintenance/regenerate_embeddings.ts` + `npm run
     embeddings:regenerate` / `embeddings:count`. Reprenable (ne traite que
     `embedding IS NULL`, donc une coupure ne coûte que le lot en vol et rien
     n'est recalculé deux fois), paginé sans offset (chaque ligne traitée sort
     du filtre — un offset ferait sauter des lignes), tolérant aux échecs
     unitaires. `tsx` ajouté en devDependency.
139. ✅ **Repli de recherche corrigé** — prérequis de la migration, et bug
     autonome. `/api/search` ne repliait sur le plein texte QUE si la fonction
     vectorielle renvoyait une erreur. Deux cas manquaient : l'embedding
     indisponible (exception non rattrapée → 500) et surtout **zéro résultat
     vectoriel**, qui renvoyait « aucun résultat » sur un corpus pourtant
     interrogeable. C'est exactement l'état de la base pendant une régénération.

### ⚠️ Constat : la recherche sémantique n'a jamais fonctionné

Vérifié sur la base de production avant migration : **13 REX sur 13 sans
embedding**. La migration ne détruit donc rien, mais la cause est plus large :

- **rien n'appelle `POST /api/rex/[id]/embedding`** — aucune référence dans le
  front, ni à la création, ni à la modification, ni à la validation d'un REX ;
- **rien n'appelle `POST /api/search`** — la page `/search` fait sa propre
  requête plein texte dans `search-results.tsx`.

La colonne, la fonction SQL, l'index ivfflat et les deux routes sont donc du
code inutilisé, et le README annonce la « recherche sémantique » comme une
fonctionnalité livrée. Avant ce lot, `/api/search` aurait d'ailleurs renvoyé
**toujours vide** : la fonction vectorielle réussissait avec 0 ligne, ce que le
code ne traitait pas comme un repli (corrigé en 139).

Trois suites possibles, à trancher :
- **Brancher** : déclencher la génération d'embedding à la validation d'un REX
  (la recherche ne porte que sur les REX validés) et exposer le mode sémantique
  dans `/search`. C'est ce qui fait exister la fonctionnalité.
- **Supprimer** : retirer colonne, fonction, index, les deux routes et la
  mention du README. Moins de surface, moins de code mort.
- **Laisser en l'état** : le schéma est désormais cohérent et prêt, mais le
  README continue d'annoncer une fonctionnalité inexistante.

### Phase 14 bis — La recherche sémantique est branchée : ✅ TERMINÉE

> Décision prise après le constat ci-dessus : brancher plutôt que supprimer.

140. ✅ `src/lib/semantic.ts` (11 tests) — indexation et interrogation au même
     endroit, une seule définition du seuil de similarité et du plafond de
     résultats.
141. ✅ **Indexation déclenchée à la validation** d'un REX, via `after()` de
     Next : l'appel au fournisseur a lieu APRÈS l'envoi de la réponse, donc le
     validateur n'attend pas. `after()` et non un appel non attendu : en
     serverless, ce dernier serait tué avec la fonction. Une indexation ratée
     n'échoue jamais vers l'appelant — la validation, elle, a eu lieu ; le REX
     reste trouvable en plein texte et `embeddings:regenerate` rattrape.
     Déclenchée à la validation et non à la création : `search_rex_by_embedding`
     ne retient que les REX `validated`, un brouillon change beaucoup et chaque
     calcul est facturé.
142. ✅ **Mode « recherche par le sens »** sur `/search` (case à cocher). Les
     identifiants proches sont récupérés d'abord, puis **tous les filtres
     existants s'appliquent dessus** — type, SDIS, gravité, statut, dates,
     tags. C'est ce que l'ancienne route `/api/search` ne faisait pas : elle les
     ignorait tous. Tri par pertinence (et non par date, qui écraserait le
     classement), pagination côté serveur sur l'ensemble rapporté.
143. ✅ **Le repli est signalé à l'utilisateur** : demander la recherche par le
     sens et recevoir du plein texte sans le savoir laisserait croire que le
     classement par pertinence a joué. Un badge dit lequel des deux a servi.
144. ✅ `/api/search` refactorée sur le même module au lieu de dupliquer la
     logique. Le champ `scores` disparaît de sa réponse (aucun appelant ne le
     lisait ; l'ordre porte déjà la pertinence).

### Déploiement, dans cet ordre
1. Déployer le code — `/api/search` et `/search` traitent le corpus non indexé
   comme un repli plein texte, donc l'application reste correcte avant migration.
2. Appliquer `022_embeddings_mistral_1024.sql` (SQL editor Supabase).
3. `npm run embeddings:regenerate` (13 REX, ~1 min).
4. `REINDEX INDEX rex_embedding_idx;` — l'index ivfflat a été créé sur une table
   vide, ses centroïdes ne servent à rien avant cette reconstruction.

### Résidus signalés, non traités
- `src/app/api/rex/[id]/validate/` est un dossier VIDE (aucun `route.ts`) :
  l'unique route de validation est `/api/admin/rex/[id]/validate`. Sans effet,
  mais trompeur à la lecture.

### Phase 14 ter — Corruption silencieuse du SDK, attrapée à l'exécution

> La migration et la régénération ont d'abord échoué. Le garde de dimension
> ajouté en 137 a arrêté le processus avec le bon message ; sans lui, l'échec
> aurait été silencieux et bien pire.

145. ✅ **`encoding_format: 'float'` est obligatoire sur `embeddings.create`.**
     Le SDK OpenAI demande `base64` de lui-même, puis décode la réponse comme
     une chaîne base64. Mistral **ignore** ce paramètre et renvoie toujours un
     tableau de nombres : le SDK interprète alors chaque flottant comme un
     OCTET et reconstruit 1024 / 4 = **256 valeurs, toutes nulles** — des
     flottants entre -1 et 1 tronqués en octets donnent zéro.
     Vérifié sur l'API réelle :
       - sans le paramètre  → 256 dimensions, `[0, 0, 0, …]`
       - avec `'float'`     → 1024 dimensions, valeurs réelles
     Aucune erreur n'est levée dans les deux cas. Si la colonne avait été
     dimensionnée à 256, ces vecteurs nuls auraient été stockés et la recherche
     aurait rendu n'importe quoi sans que rien ne le signale. C'est le garde de
     dimension qui a transformé cette corruption en échec bruyant.
     Un test fige désormais le paramètre.
     NB : `output_dimension` existe dans l'API Mistral mais `mistral-embed` ne
     le supporte pas (HTTP 400) — 1024 est bien sa sortie native, la migration
     022 était correcte.
146. ✅ `supabase/maintenance/check_semantic_search.ts` + `npm run
     embeddings:check` : vérification de bout en bout que le fournisseur, la
     dimension de la colonne et la fonction SQL s'accordent réellement — ce
     qu'aucun test unitaire ne peut établir. Contrôle aussi le nombre de
     valeurs NON NULLES, parce qu'un vecteur peut avoir la bonne taille et ne
     rien vouloir dire. À relancer après toute migration touchant
     `rex.embedding`, tout changement de modèle, et après déploiement.

### État constaté en production (13 septembre 2026)
- **13 REX sur 13 indexés**, 0 échec.
- Recherche vérifiée : « incendie dans un bâtiment avec difficulté d'accès des
  secours » remonte incendie de centre commercial (78,2 %), feu d'entrepôt
  chimique (77,6 %) et effondrement de parking (75,0 %) — aucun de ces titres
  ne partage de mot avec la requête. La recherche par le sens fonctionne.
- ⚠️ **`REINDEX INDEX rex_embedding_idx;` reste à exécuter** : l'index ivfflat a
  été créé sur une table vide, ses centroïdes ne servent à rien. Sans effet
  visible à 13 REX (Postgres fait un parcours séquentiel), à faire avant que le
  corpus grossisse.
- Le jeu de données contient des doublons apparents (« Feu d'entrepôt chimique
  - Zone industrielle Carros » et « — Zone industrielle de Carros », idem pour
  l'effondrement de parking) : probablement des restes de données de démo.

---

## Phase 15 — Veille des dépendances (13 septembre 2026) : ✅ TERMINÉE

> **Correction d'un diagnostic erroné.** Les lots précédents recommandaient
> d'« ajouter `npm audit` en CI ». Ce job EXISTAIT déjà dans `ci.yml`, avec
> exactement la commande recommandée (`npm audit --omit=dev --audit-level=high`).
> Le README le documentait. La recommandation était fausse.
>
> Le vrai défaut est plus précis, et il est ailleurs : `ci.yml` ne se déclenche
> que sur `push` et `pull_request`. Entre le 9 août et le 11 septembre, aucun
> push — donc **aucune exécution de la CI**, donc aucun audit, pendant que
> l'arbre de production passait de 0 à 7 vulnérabilités dont deux RCE non
> authentifiées. Le job aurait attrapé les six de niveau high et critical. Il
> n'a simplement jamais tourné.

147. ✅ `.github/workflows/audit.yml` : audit **programmé** (lundi 6 h UTC) et
     déclenchable à la main. Tourne sur le calendrier, pas sur l'activité —
     seul dispositif qui tienne pendant une période sans développement, et ce
     produit en connaîtra : un logiciel vendu à des SDIS vit plus longtemps
     qu'il n'est développé.
148. ✅ `.github/dependabot.yml` : mises à jour hebdomadaires npm + mensuelles
     des actions GitHub, **groupées**. Sans groupement, ce dépôt ouvrirait
     plusieurs dizaines de PR par semaine (une quinzaine de paquets
     `@radix-ui` à eux seuls) — et un déluge de PR ne se relit pas, il se ferme
     en masse, ce qui revient à n'avoir aucune veille. Un lot pour les mineures
     et correctifs, les majeures séparées. Majeures de `next`, `react` et
     `react-dom` ignorées : elles se préparent, elles ne se fusionnent pas sur
     une CI verte. Les mineures et correctifs passent bien — c'est ainsi que
     `next` 16.3.0 → 16.3.4 aurait été proposée automatiquement.
149. ✅ Suppression de `src/app/api/rex/[id]/validate/`, dossier vide (aucun
     `route.ts`, non suivi par git). L'unique route de validation est
     `/api/admin/rex/[id]/validate`.

---

## Phase 16 — `cookies()` dans `unstable_cache` : erreur de rendu et fuite de tags

> Signalé en production sous la forme d'un « Minified React error #441 » sur
> `/search` — une enveloppe générique (« erreur dans le rendu d'un Server
> Component ») dont le message réel n'apparaît que dans les journaux serveur.
> Message obtenu :
>
>   Route /search used `cookies()` inside a function cached with
>   `unstable_cache()`. Accessing Dynamic data sources inside a cache scope is
>   not supported.

150. ✅ **Cause** : `getCachedSdisList` et `getCachedTags` appelaient
     `createClient()` — qui lit les cookies — À L'INTÉRIEUR d'`unstable_cache`.
     Code d'origine du **18 mars 2026** (Phase 5D, item 31), écrit sous Next
     16.0.7 ; révélé par la montée en 16.3.4 du lot P0. Le défaut est donc
     antérieur de six mois aux lots récents, mais c'est bien cette montée de
     version qui l'a rendu visible.

151. ⚠️ **Et ce que l'erreur cachait : une fuite inter-tenant.**
     `getCachedTags` lisait `rex.tags` avec le client utilisateur — donc filtré
     par la RLS, donc par le SDIS de l'appelant — et mettait le résultat en
     cache sous une clé **globale** (`['rex-tags']`). Le premier utilisateur à
     charger `/search` remplissait le cache avec SES tags ; pendant dix
     minutes, les membres des autres SDIS voyaient cette liste. Les tags ne
     sont pas le contenu d'un REX, mais ils en nomment les sujets, les lieux et
     les opérations.
     Next avait raison de refuser : une valeur mise en cache sous une clé
     globale ne peut pas dépendre de qui la demande.

152. ✅ **Corrections.**
     - `createStaticClient()` (`supabase/server.ts`) : client anonyme SANS
       cookies, réservé aux tables dont la policy de lecture ne dépend pas de
       l'appelant. `sdis` est en `FOR SELECT USING (true)` : son cache global
       est légitime. Clé anonyme et non service role — la RLS continue de
       s'appliquer, une donnée de référence n'a pas à être lue avec des droits
       étendus.
     - `getCachedTags(sdisId)` : cache **par SDIS**, filtre EXPLICITE
       (validés du SDIS + inter-SDIS et publics des autres), `sdisId` dans la
       clé de cache — même schéma que `dashboard/insights`, déjà éprouvé.
     - Le SDIS est lu HORS du cache et passé en argument, ce que demande
       précisément le message d'erreur de Next.

> Leçon retenue : `unstable_cache` + client porteur de session = soit une erreur
> de rendu, soit — si la plateforme ne l'attrape pas — un cache partagé entre
> tenants. Le seul autre usage du dépôt (`dashboard/insights`) était déjà
> correct : client service + filtre explicite + `sdis_id` dans la clé.
