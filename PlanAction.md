# PLAN D'ACTION RECOMMANDÉ

## Phase 1 — Sécurité (avant déploiement) : ✅ TERMINÉE
1. ✅ Headers de sécurité (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)
2. ✅ Rate limiting global (middleware 120 req/min) + spécifique sur toutes les routes API
3. ✅ Vérification du mot de passe actuel avant changement
4. ✅ Sentry sampling réduit (traces: 0.2, profiles: 0.1)

## Phase 2 — Qualité (première semaine) : ✅ TERMINÉE
5. ✅ Jest + React Testing Library + 62 tests critiques (validators, rate-limit, sanitize, image-optimizer)
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

### 7A — Whitelist domaines email (PRIORITÉ MAX — bloquant avant toute vente)
> Dès qu'un SDIS signe, des gens vont parler de la plateforme. Si n'importe qui s'inscrit
> avec un Gmail, on perd le contrôle de qui accède aux données opérationnelles.
> Pour un produit institutionnel vendu à des services publics, c'est éliminatoire.

44. Migration SQL : table `allowed_domains` (id, sdis_id FK, domain UNIQUE, created_at)
45. Validation domaine email dans /api/auth/register (rejet si domaine non whitelisté)
46. Message d'erreur explicite : "Votre adresse email n'est pas autorisée. Contactez votre administrateur SDIS."
47. Mode "inscription désactivée" par SDIS (seul l'admin SDIS peut créer des comptes)
48. Système d'invitation par lien tokenisé pour les exceptions (prestataires, consultants DGSCGC)
49. Interface super_admin pour gérer les domaines autorisés par SDIS
50. Interface admin SDIS pour voir/gérer les domaines de son propre SDIS

### 7B — Gestion des abonnements (avant la première facturation réelle)
> Pas besoin de Stripe maintenant. Dans le marché public, c'est bon de commande + mandat
> de paiement, pas de paiement en ligne. Ce qui compte : tracer quel SDIS est sur quel plan
> et jusqu'à quand, pour que ce soit opposable en cas de litige.

51. Migration SQL : table `subscriptions` :
    - `sdis_id` (FK UNIQUE), `plan` (essentiel/reseau/premium)
    - `status` (trial/active/suspended/expired), `suspended_reason` (text nullable)
    - `trial_ends_at`, `current_period_start`, `current_period_end`
    - `max_users` (null = illimité), `max_rex_per_month` (null = illimité)
52. Middleware de vérification d'abonnement actif sur toutes les routes protégées
53. Comportement trial : accès complet + bannière rappelant la fin de la période d'essai
54. Comportement expiré : lecture seule pendant 30 jours, puis blocage total avec message de contact
55. Page d'expiration utilisateur ("Votre abonnement a expiré — contactez votre référent SDIS")
56. Limites par plan enforced côté API (max_users, max_rex_per_month)

### 7C — Panel super_admin d'onboarding (avant le 3e client)
> Ajouter un SDIS implique aujourd'hui de passer par la console Supabase ou des requêtes
> SQL manuelles. Acceptable pour 1-2 clients, ingérable à partir de 5.

57. Route /super-admin protégée par rôle super_admin, séparée du dashboard SDIS
58. Workflow "Ajouter un SDIS client" en multi-étapes :
    - Infos SDIS (code, nom, département, logo)
    - Domaines email autorisés
    - Plan tarifaire + dates début/fin
    - Création du compte admin initial + envoi email d'invitation sécurisé
59. Vue liste SDIS : nom, plan, statut, nb users, nb REX, date expiration, actions
60. Actions : suspendre/réactiver, changer de plan, réinitialiser MDP admin SDIS
61. Dashboard super_admin : métriques globales (SDIS actifs, REX totaux, users totaux, MRR)
62. Logs d'audit des actions super_admin (qui a fait quoi, quand)

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


## CE QUI EST BIEN EN PLACE
Domaine	Note	Détails
Auth & RBAC	A	Supabase + middleware + rôles (user/validator/admin/super_admin)
Validation des entrées	A	Zod sur toutes les API + DOMPurify XSS
RGPD/GDPR	A	Export données, suppression compte, cookie consent, mentions légales
Base de données	A+	8 migrations ordonnées, RLS activé, pgvector, indexes
Responsive mobile	A	Tailwind breakpoints, mobile-first, popovers/table/timeline/charts adaptifs (Phase 6)
Optimisation images	A	Sharp + WebP + thumbnails
Gestion d'erreurs	A	Try/catch, error boundaries, logging centralisé
TypeScript	A	Mode strict activé
Accessibilité	B	ARIA labels, sémantique HTML, page déclaration RGAA
React Compiler	A	Activé (memoization automatique partielle)
Code propre	A+	0 TODO/FIXME/HACK, 0 console.log sauvages
Sécurité headers	A	CSP, HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy
Rate limiting	A+	Global Redis Upstash + par route (auth: 5/min, upload: 10/min, API: 60/min, AI: 10/min)
Tests	A	62 tests (validators, rate-limit, sanitize, image-optimizer)
CI/CD	A	GitHub Actions (lint + typecheck + tests + build)
Formatage	A	Prettier + eslint-config-prettier
Logging	A	Structuré, correlation IDs, intégration Sentry prod
SEO / Social	A	Open Graph + Twitter Cards sur toutes les pages clés
Typographie	A	Inter (texte de corps) + JetBrains Mono (code/données)
Fonts	A	next/font optimisé (subset latin, CSS variables)
Images	A	next/image + sharp + lazy loading + sizes responsive
