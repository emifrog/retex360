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

### 5C — React re-renders (impact moyen)
25. useMemo sur filteredUsers + stats dans UsersTable (recalculé à chaque render)
26. Extraire analysisConfig hors du composant AiAnalysis (objet lourd recréé à chaque render)
27. useMemo sur les 6 valeurs watch de RexForm (tags, focusThematiques, keyFigures, chronologie, prescriptions)
28. Extraire un hook useRexFilters pour RexList (11 useState au même niveau)
29. Wrapper RexDetail (446 lignes) avec React.memo

### 5D — Cache & données (impact bas)
30. Ajouter du cache Next.js sur stats/charts API (revalidate: 300s)
31. Cacher la liste SDIS + tags sur la page search (données quasi-statiques, revalidate: 3600s)
32. Streaming pour l'export CSV (actuellement tout en mémoire)
33. Vérifier/ajouter les index DB sur rex.created_at, rex.status, comments.rex_id


## CE QUI EST BIEN EN PLACE
Domaine	Note	Détails
Auth & RBAC	A	Supabase + middleware + rôles (user/validator/admin/super_admin)
Validation des entrées	A	Zod sur toutes les API + DOMPurify XSS
RGPD/GDPR	A	Export données, suppression compte, cookie consent, mentions légales
Base de données	A+	8 migrations ordonnées, RLS activé, pgvector, indexes
Responsive mobile	A	Tailwind breakpoints, mobile-first
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
