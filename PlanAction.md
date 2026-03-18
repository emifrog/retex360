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


## Phase 6 — Responsive Mobile :

### 6A — Critiques (overflow / inaccessibilité) : ✅ TERMINÉE
34. ✅ Popover notifications : w-[calc(100vw-2rem)] sm:w-96 + ScrollArea max-h-[60vh]
35. ✅ Table admin : overflow-x-auto + colonnes SDIS/Inscrit cachées sur mobile (hidden sm:/md:table-cell)
36. ✅ Timeline horizontale : layout vertical automatique sur mobile (md:hidden / hidden md:block)

### 6B — Moyens (UX dégradée)
37. ✅ Popover notification-bell : w-[calc(100vw-2rem)] sm:w-80 + ScrollArea max-h-[50vh]
38. ✅ SelectTrigger filtres admin : w-full sm:w-40 / w-full sm:w-44
39. Sidebar mobile w-72 fixe → w-[85vw] max-w-72 (adaptatif petits écrans)
40. ScrollArea notifications h-[400px] fixe → max-h-[60vh] (adaptatif hauteur écran)
41. Charts hauteur fixe 180-320px → hauteurs responsives h-[200px] sm:h-[250px] lg:h-[320px]

### 6C — Bas (améliorations)
42. Touch targets toolbar Tiptap 32px → h-9 w-9 sur mobile (≥36px)
43. Grid form 1→3 colonnes direct → étape intermédiaire sm:grid-cols-2 md:grid-cols-3


## CE QUI EST BIEN EN PLACE
Domaine	Note	Détails
Auth & RBAC	A	Supabase + middleware + rôles (user/validator/admin/super_admin)
Validation des entrées	A	Zod sur toutes les API + DOMPurify XSS
RGPD/GDPR	A	Export données, suppression compte, cookie consent, mentions légales
Base de données	A+	8 migrations ordonnées, RLS activé, pgvector, indexes
Responsive mobile	B+	Tailwind breakpoints, mobile-first — overflow popovers/table/timeline à corriger (Phase 6)
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
