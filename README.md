# RETEX360 🚒

**Plateforme de Retours d'Expérience (REX) pour les Services Départementaux d'Incendie et de Secours (SDIS)**

RETEX360 est une application web moderne permettant aux pompiers de partager, consulter et analyser les retours d'expérience opérationnels entre différents SDIS.

---

## 🎯 Fonctionnalités

### 🔐 Authentification & Profils
- **Inscription/Connexion** avec Supabase Auth
- **Profils utilisateurs** avec grade, SDIS d'appartenance, avatar
- **Rôles** : Utilisateur, Validateur, Admin, Super Admin
- **Thème clair/sombre** avec persistance
- **Vérification du mot de passe actuel** avant changement

### 📄 Gestion des REX
- **Création de REX** avec éditeur riche (Tiptap, lazy-loaded)
  - Titre, date d'intervention, type, gravité
  - Description, contexte opérationnel, moyens engagés
  - Difficultés rencontrées, enseignements
  - Tags personnalisés
  - Visibilité (SDIS, Inter-SDIS, Public)
- **Workflow à 3 niveaux** (Mémento DGSCGC septembre 2022)
  - **Signalement** : Remontée rapide d'un événement
  - **PEX** : Partage d'Expérience (synthèse factuelle, max 4 pages)
  - **RETEX** : Retour d'Expérience complet avec plan d'actions
  - Promotion progressive Signalement → PEX → RETEX
  - Indicateur de complétion des champs requis/recommandés
- **Champs DGSCGC enrichis**
  - Message d'ambiance, SITAC
  - Éléments favorables/défavorables
  - Focus thématiques (Annexe F)
  - Documentation opérationnelle
- **Chiffres clés de l'intervention**
  - SP engagés, durée, véhicules, bilan humain
  - SDIS impliqués, surface sinistrée, personnes évacuées
  - Affichage en infographie avec icônes
- **Timeline chronologique**
  - Événements horodatés (alerte, arrivée, actions, fin)
  - Types colorés : alerte, arrivée, action, message radio, fin
  - Affichage vertical avec ligne de connexion
  - Layout responsive (vertical sur mobile)
- **Prescriptions catégorisées**
  - Catégories : Opérations, Prévention, Formation, Technique
  - Statuts : À faire, En cours, Fait
  - Responsable et échéance optionnels
- **Édition de REX** (auteur ou admin)
- **Suppression de REX** avec confirmation
- **Export PDF** des REX
  - Export standard ou anonymisé (noms → grades, côté serveur)
  - Mise en page professionnelle DGSCGC
  - Images/pièces jointes intégrées (max 10, grille 2 colonnes)
  - Chiffres clés en infographie
  - Timeline chronologique colorée
  - Prescriptions groupées par catégorie
  - Header avec logo SDIS et type de production
  - Cache ETag + rate-limit dédié + monitoring durée/taille
  - Gardes anti-OOM (200 items max, 100k chars/champ, 5MB total)
- **Pièces jointes** avec upload drag & drop
  - Images (JPG, PNG, GIF, WebP) et PDF
  - **Optimisation automatique** : compression Sharp + conversion WebP + thumbnails
  - Prévisualisation avec thumbnails dans les grilles
  - Max 10 Mo par fichier (compressé côté serveur), 10 fichiers max

### 📋 Liste & Recherche
- **Liste paginée** des REX avec vue grille/liste
- **Page de recherche avancée** `/search` avec :
  - Recherche full-text (titre, description, contexte)
  - Filtres : type, SDIS, sévérité, statut, période, tags
  - Résultats paginés avec tri
  - Cache sur SDIS (1h) et tags (10min)
- **Recherche rapide** dans le header
- **Recherche sémantique** avec OpenAI embeddings
- **Statistiques** en haut de liste (total, validés, en attente, brouillons)

### ⭐ Favoris
- **Ajouter/Retirer** des favoris
- **Page dédiée** `/favorites` avec liste des REX favoris
- **Compteur de favoris** sur chaque REX

### 💬 Commentaires
- **Système de threads** (commentaires + réponses)
- **Mentions @utilisateur** avec autocomplétion
- **Mise en surbrillance** des mentions
- **Édition/Suppression** de ses propres commentaires
- **Badges de rôle** (Admin, Validateur)
- **Temps relatif** en français

### ✅ Workflow de Validation
- **Statuts** : Brouillon, En attente, Validé, Archivé
- **Types de production** : Signalement, PEX, RETEX
- **Bouton de promotion** avec checklist des champs requis
- **Interface admin** pour valider/rejeter
- **Commentaires de rejet** pour l'auteur
- **Historique de validation** avec nom du validateur

### 📊 Dashboard
- **Cartes de statistiques** (REX total, SDIS, en attente, patterns IA)
- **KPIs avancés** avec tendances
  - Temps moyen de validation
  - Taux de validation
  - Contributeurs actifs
  - Commentaires, Favoris
- **Graphiques interactifs** (Recharts, lazy-loaded)
  - Évolution des REX sur 12 mois (Area Chart)
  - Répartition par type (Pie Chart)
  - Répartition par gravité (Bar Chart)
  - Hauteurs responsives sur mobile
- **REX récents** (Suspense + streaming)
- **Top contributeurs**
- **Actions rapides**
- **Export CSV** streaming avec pagination par 500

### 🤖 Intelligence Artificielle
- **Intégration OpenRouter** (Claude, GPT-4, Mistral, Llama, Gemini)
- **Analyse de REX** avec 4 modes :
  - **Synthèse** : Résumé des points clés
  - **Suggestions** : Recommandations d'amélioration
  - **Patterns** : Tendances identifiées
  - **Tags** : Suggestions de tags
- **Recherche sémantique** avec embeddings vectoriels

### 🔔 Notifications
- **Notifications en temps réel** (Supabase Realtime WebSocket)
- **Types** : Mention, Commentaire, Validation, Rejet, Nouveau REX
- **Centre de notifications** avec popover responsive dans le header
- **Badge animé** pour les non-lues
- **Actions** : marquer lu, tout marquer lu, supprimer
- **Liens cliquables** vers les RETEX concernés
- **ScrollArea** avec hauteur adaptative (max-h-[60vh])

### 🎨 Interface
- **Typographie** : Inter (texte de corps) + JetBrains Mono (code/données)
- **Sidebar collapsible** avec tooltips + responsive mobile (w-[85vw] max-w-72)
- **Thème clair/sombre** avec toggle
- **Design responsive** mobile-first
  - Popovers, tables, timelines, charts adaptifs
  - Touch targets 36px sur la toolbar Tiptap
  - Grilles adaptatives (1 → 2 → 3 colonnes)
- **Affichage/masquage mot de passe** sur login/register
- **Page À propos** avec présentation du projet
- **Page Accessibilité** (déclaration RGAA)
- **Page Paramètres** `/settings`
  - Modification du profil (nom, grade, SDIS)
  - Upload d'avatar
  - Changement de mot de passe (avec vérification actuel)
- **Open Graph / Twitter Cards** sur toutes les pages clés
- **Cookie consent** RGPD

### 👥 Administration
- **Gestion des utilisateurs** `/admin/users`
  - Liste avec recherche et filtres (responsive, colonnes masquées sur mobile)
  - Modification des rôles (user, validator, admin, super_admin)
  - Statistiques par rôle (useMemo optimisé)
- **Permissions** :
  - Admin : gère les utilisateurs de son SDIS
  - Super Admin : accès à tous les SDIS
- **Compte démo** disponible pour la hiérarchie

---

## 🛠️ Stack Technique

### Frontend
- **Next.js 16** (App Router, React 19, React Compiler)
- **TypeScript** (mode strict)
- **Tailwind CSS 4** + shadcn/ui
- **Tiptap** (éditeur riche, lazy-loaded via next/dynamic)
- **Recharts** (graphiques, lazy-loaded via next/dynamic)
- **Lucide React** (icônes)
- **React Hook Form** + Zod (formulaires)
- **Sonner** (notifications toast)
- **date-fns** (dates, locale fr)
- **next/image** + **Sharp** (optimisation images, WebP, thumbnails)
- **html-entities** (décodage HTML robuste pour PDF)
- **@next/bundle-analyzer** (analyse du bundle)

### Backend
- **Supabase** (PostgreSQL, Auth, Storage, Realtime)
- **API Routes** Next.js
- **OpenRouter API** (LLM multi-modèles, lazy init)
- **OpenAI API** (embeddings)
- **Sentry** (monitoring erreurs + breadcrumbs)
- **Upstash Redis** (rate limiting global + par route)
- **@react-pdf/renderer** (génération PDF côté serveur)

### Qualité & CI/CD
- **Jest** + 62 tests (validators, rate-limit, sanitize, image-optimizer)
- **GitHub Actions** (lint + typecheck + tests + build)
- **Prettier** + eslint-config-prettier (formatage)
- **Logging structuré** avec correlation IDs + intégration Sentry

### Base de données
- **PostgreSQL** avec extensions :
  - `pgvector` pour recherche sémantique
  - `pg_trgm` pour recherche textuelle
- **Row Level Security (RLS)**
- **Triggers** automatiques
- **8 migrations** ordonnées (idempotentes avec ON CONFLICT)
- **Index composites** optimisés (status+validated_at, favorites, comments, attachments)

---

## 🔒 Sécurité

- **Authentification** Supabase Auth (JWT)
- **Row Level Security** sur toutes les tables
- **Validation Zod** sur toutes les API + **DOMPurify** (XSS)
- **Headers de sécurité** : CSP, HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **Rate limiting** :
  - Global : 120 req/min par IP (Redis Upstash, persistant entre invocations serverless)
  - Auth : 5/min, Upload : 10/min, API : 60/min, AI : 10/min, PDF : 10/min
- **Permissions** vérifiées côté serveur
- **Anonymisation PDF** côté serveur (email non fetché, full_name masqué)
- **Variables d'environnement** pour les secrets
- **Sentry** sampling réduit en production (traces: 0.2, profiles: 0.1)

---

## ⚡ Performance

- **Requêtes parallélisées** (Promise.all sur page REX detail, PDF, dashboard)
- **Code-splitting** : Recharts (~200KB) et Tiptap (~150KB) lazy-loaded
- **Suspense + streaming** sur les composants async (RecentRex)
- **Cache API** : Cache-Control + stale-while-revalidate sur stats/charts
- **Cache données** : unstable_cache sur SDIS (1h) et tags (10min)
- **Export CSV streaming** avec ReadableStream + pagination par 500
- **Images optimisées** : Sharp compression WebP (-84%), thumbnails (-98%)
- **PDF optimisé** : timeout 60s, gardes taille, ETag cache, monitoring
- **React Compiler** activé (memoization automatique partielle)
- **useMemo/useCallback** ciblés sur les composants lourds (UsersTable, RexForm, RexDetail)
- **Bundle analyzer** configuré (`npm run analyze`)

---

## 📁 Structure du Projet

```
src/
├── app/
│   ├── (auth)/           # Pages authentification
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/      # Pages protégées
│   │   ├── rex/
│   │   │   ├── [id]/     # Détail, édition, PDF
│   │   │   └── new/
│   │   ├── favorites/
│   │   ├── search/
│   │   ├── about/
│   │   ├── accessibilite/
│   │   ├── settings/
│   │   └── admin/
│   │       ├── users/
│   │       └── validation/
│   └── api/              # API Routes
│       ├── rex/          # CRUD, PDF, attachments, promote
│       ├── comments/
│       ├── notifications/
│       ├── search/
│       ├── dashboard/    # Stats, charts, contributors, export
│       ├── ai/
│       └── profile/      # Profil, avatar, password, export, delete
├── __tests__/            # Tests Jest
├── components/
│   ├── ui/               # Composants shadcn/ui + OptimizedImage
│   ├── layout/           # Header, Sidebar, MobileSidebar, Footer
│   ├── rex/              # Composants REX + ImageUpload + Tiptap
│   ├── comments/         # Système de commentaires
│   ├── dashboard/        # Dashboard, graphiques, KPIs
│   ├── favorites/        # Liste des favoris
│   ├── notifications/    # Cloche de notifications
│   ├── admin/            # Gestion utilisateurs
│   └── search/           # Recherche avancée
├── lib/
│   ├── supabase/         # Clients Supabase + middleware sécurité
│   ├── actions/          # Server Actions
│   ├── validators/       # Schémas Zod
│   ├── hooks/            # Hooks React (useUser, useRexList, useDashboard...)
│   ├── pdf/              # Template PDF @react-pdf/renderer
│   ├── image-optimizer.ts # Sharp compression + thumbnails
│   ├── logger.ts         # Logging structuré + correlation IDs
│   ├── rate-limit.ts     # Rate limiters Upstash Redis
│   ├── notifications.ts  # Service notifications
│   └── openai.ts         # Client OpenRouter/OpenAI (lazy init)
├── types/                # Types TypeScript
└── supabase/
    └── migrations/       # 8 scripts SQL (idempotents)
```

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- Compte Supabase
- Clé API OpenRouter (optionnel)
- Clé API OpenAI (optionnel, pour embeddings)
- Compte Upstash Redis (optionnel, pour rate limiting production)

### 1. Cloner le projet
```bash
git clone https://github.com/votre-username/retex360.git
cd retex360
npm install
```

### 2. Configuration
Créer un fichier `.env.local` :
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# OpenRouter (pour l'IA)
OPENROUTER_API_KEY=sk-or-v1-xxx

# OpenAI (optionnel, pour embeddings)
OPENAI_API_KEY=sk-xxx

# Sentry (monitoring)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=votre-org
SENTRY_PROJECT=retex360
SENTRY_AUTH_TOKEN=sntrys_xxx

# Upstash Redis (rate limiting production)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Base de données
Exécuter les migrations dans Supabase SQL Editor :
```sql
-- Dans l'ordre :
-- 1. supabase/migrations/001_initial_schema.sql
-- 2. supabase/migrations/002_semantic_search.sql
-- 3. supabase/migrations/003_notifications.sql
-- 4. supabase/migrations/004_dgscgc_fields.sql
-- 5. supabase/migrations/005_key_figures.sql
-- 6. supabase/migrations/006_timeline_prescriptions.sql
-- 7. supabase/migrations/007_rejection_reason.sql
-- 8. supabase/migrations/008_all_sdis.sql
```

### 4. Lancer le serveur
```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

### 5. Scripts disponibles
```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run lint         # ESLint
npm test             # Jest (62 tests)
npm run test:watch   # Tests en mode watch
npm run test:coverage # Tests avec couverture
npm run format       # Prettier (formatage)
npm run format:check # Vérification formatage
npm run analyze      # Bundle analyzer
```

---

## 📡 API Routes

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/rex` | Liste des REX (paginée, filtrée) |
| `POST` | `/api/rex` | Créer un REX |
| `GET` | `/api/rex/[id]` | Détail d'un REX |
| `GET` | `/api/rex/[id]/pdf` | Export PDF d'un REX (?anonymize=true) |
| `POST` | `/api/rex/[id]/promote` | Promouvoir un REX (Signalement→PEX→RETEX) |
| `PUT` | `/api/rex/[id]` | Modifier un REX |
| `DELETE` | `/api/rex/[id]` | Supprimer un REX |
| `GET` | `/api/rex/stats` | Statistiques des REX |
| `POST` | `/api/rex/[id]/favorite` | Ajouter aux favoris |
| `DELETE` | `/api/rex/[id]/favorite` | Retirer des favoris |
| `POST` | `/api/rex/attachments` | Upload pièce jointe (optimisée Sharp + WebP) |
| `DELETE` | `/api/rex/attachments/[id]` | Supprimer pièce jointe (+ thumbnail) |
| `POST` | `/api/admin/rex/[id]/validate` | Valider un REX (admin) |
| `POST` | `/api/admin/rex/[id]/reject` | Rejeter un REX (admin) |
| `GET` | `/api/dashboard/stats` | Statistiques dashboard (KPI) |
| `GET` | `/api/dashboard/charts` | Données graphiques (timeline, types, sévérité) |
| `GET` | `/api/dashboard/contributors` | Top contributeurs |
| `GET` | `/api/dashboard/export` | Export CSV streaming |
| `GET` | `/api/rex/[id]/comments` | Commentaires d'un REX |
| `POST` | `/api/rex/[id]/comments` | Ajouter un commentaire |
| `PUT` | `/api/comments/[id]` | Modifier un commentaire |
| `DELETE` | `/api/comments/[id]` | Supprimer un commentaire |
| `GET` | `/api/notifications` | Notifications utilisateur |
| `POST` | `/api/notifications` | Marquer comme lu |
| `POST` | `/api/search` | Recherche sémantique |
| `POST` | `/api/ai/analyze` | Analyse IA d'un REX |
| `PUT` | `/api/admin/users/role` | Modifier le rôle d'un utilisateur |
| `PUT` | `/api/profile` | Modifier son profil |
| `PUT` | `/api/profile/password` | Changer son mot de passe |
| `POST` | `/api/profile/avatar` | Upload d'avatar |
| `GET` | `/api/profile/export` | Export données personnelles (RGPD) |
| `DELETE` | `/api/profile/delete` | Supprimer son compte (RGPD) |

---

## 🌐 Déploiement Vercel

### 1. Connecter le repo GitHub
1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer sur "Add New Project"
3. Importer le repository GitHub `retex360`

### 2. Configurer les variables d'environnement
Dans les settings du projet Vercel, ajouter :

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role Supabase |
| `OPENROUTER_API_KEY` | Clé API OpenRouter (optionnel) |
| `OPENAI_API_KEY` | Clé API OpenAI (optionnel) |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN Sentry pour le monitoring |
| `SENTRY_ORG` | Organisation Sentry |
| `SENTRY_PROJECT` | Projet Sentry |
| `SENTRY_AUTH_TOKEN` | Token d'authentification Sentry |
| `NEXT_PUBLIC_APP_URL` | URL de production (ex: https://retex360.vercel.app) |
| `UPSTASH_REDIS_REST_URL` | URL Upstash Redis (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash Redis |

### 3. Déployer
Vercel déploiera automatiquement à chaque push sur `main`.

**CI GitHub Actions** vérifie lint + typecheck + tests + build avant chaque déploiement.

### Configuration Supabase pour la production
Dans Supabase Dashboard > Authentication > URL Configuration :
- **Site URL** : `https://votre-app.vercel.app`
- **Redirect URLs** : `https://votre-app.vercel.app/**`

---

## 🔐 Compte Démo

Un compte démo est disponible pour tester l'application en lecture seule :

| Champ | Valeur |
|-------|--------|
| **Email** | `demo@retex360.fr` |
| **Mot de passe** | `Demo2025!` |
| **Rôle** | Utilisateur (lecture seule) |

> Ce compte permet de consulter les RETEX sans pouvoir les modifier ou accéder aux fonctions d'administration.

---

## 📈 Roadmap

### Terminé
- [x] Recherche avancée avec filtres
- [x] Notifications temps réel
- [x] Gestion des utilisateurs
- [x] Page À propos + Accessibilité
- [x] Page Paramètres utilisateur
- [x] Upload d'images optimisées (Sharp + WebP + thumbnails)
- [x] Monitoring Sentry + logging structuré
- [x] Rate limiting Redis Upstash (global + par route)
- [x] Validation Zod + DOMPurify XSS
- [x] Headers de sécurité (CSP, HSTS, X-Frame-Options...)
- [x] Tests Jest (62 tests) + CI GitHub Actions
- [x] Workflow DGSCGC à 3 niveaux (Signalement, PEX, RETEX)
- [x] Champs enrichis selon mémento DGSCGC
- [x] Export PDF professionnel avec images, infographies, anonymisation serveur
- [x] Chiffres clés, timeline chronologique, prescriptions catégorisées
- [x] Intelligence Artificielle (analyse, synthèse, suggestions, tags)
- [x] Export CSV streaming
- [x] Performance : lazy-loading, Suspense, cache API, bundle analyzer
- [x] Responsive mobile complet (popovers, tables, charts, touch targets)
- [x] Open Graph / Twitter Cards + SEO
- [x] Prettier + formatage automatique
- [x] Typographie Inter + JetBrains Mono
- [x] RGPD (export données, suppression compte, cookie consent)

### Prochaines étapes
- [ ] Whitelist domaines email (inscription contrôlée par SDIS)
- [ ] Gestion des abonnements (plans, expiration, limites)
- [ ] Panel super_admin d'onboarding (provisioning SDIS)
- [ ] Guide d'onboarding interactif + documentation PDF
- [ ] Sous-domaines par SDIS (sdis06.retex360.fr)
- [ ] Application mobile (React Native)
- [ ] Intégration cartographique
- [ ] Statistiques avancées par SDIS
- [ ] Mode hors-ligne (PWA)

---

## 📄 Licence

Projet privé - Tous droits réservés

---

## 👥 Contributeurs

Développé pour les SDIS de France 🇫🇷
