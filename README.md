# RETEX360 🚒

**Plateforme de Retours d'Expérience (REX) pour les Services Départementaux d'Incendie et de Secours (SDIS)**

RETEX360 est une application web moderne permettant aux pompiers de partager, consulter et analyser les retours d'expérience opérationnels entre différents SDIS.

---

## 🎯 Fonctionnalités

### 🔐 Authentification & Profils
- **Connexion** Supabase Auth ; **inscription sur invitation uniquement** (lien tokenisé émis par un admin SDIS / super_admin, SDIS + rôle pré-assignés, usage unique, expiration 7 j)
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
- **Jest** + 70 tests (validators, rate-limit, sanitize, sanitize-server, image-optimizer)
- **GitHub Actions** (lint + typecheck + tests + build)
- **Prettier** + eslint-config-prettier (formatage)
- **Logging structuré** avec correlation IDs + intégration Sentry

### Base de données
- **PostgreSQL** avec extensions :
  - `pgvector` pour recherche sémantique
  - `pg_trgm` pour recherche textuelle
- **Row Level Security (RLS)** cloisonnée par SDIS (validateurs/admins limités à leur SDIS, super_admin transverse)
- **Triggers** automatiques (fonctions `SECURITY DEFINER` avec `search_path` fixé)
- **13 migrations** ordonnées (idempotentes)
- **Index composites** optimisés (status+validated_at, favorites, comments, attachments)
- **Storage privé** : bucket `rex-attachments` non public + RLS storage (accès via URLs signées)

---

## 🔒 Sécurité

- **Authentification** Supabase Auth (JWT)
- **Row Level Security** sur toutes les tables, **cloisonnée par SDIS**
- **Validation Zod** sur toutes les API (REX, commentaires, mentions plafonnées)
- **Politique de mot de passe forte** (12 caractères min + majuscule/minuscule/chiffre) à la création, au changement et à la réinitialisation (le login reste permissif pour ne pas verrouiller les comptes existants)
- **Vérification anti-compromission** des mots de passe (HaveIBeenPwned en k-anonymity, côté serveur, fail-open) à la création/au changement/à la réinitialisation
- **Inscription sur invitation uniquement** : pas d'auto-inscription. Token aléatoire (32 octets) dont seul le **hash SHA-256** est stocké, usage unique, expiration ; SDIS + rôle pré-assignés par l'invitation ; restriction secondaire par domaine email (`allowed_domains`). Tables gérées exclusivement via le rôle service (RLS verrouillée). **Email d'invitation** envoyé automatiquement si SMTP configuré (sinon le lien reste copiable côté admin)
- **Notifications** : insertion restreinte par RLS à son propre `user_id` ; les notifications cross-user (commentaire, mention, validation, rejet) passent par le client admin après contrôle d'autorisation
- **Sanitization XSS double couche** : DOMPurify côté serveur **au stockage** (`sanitize-server.ts` + jsdom) ET côté client au rendu, config partagée (sans `style`, `rel=noopener` forcé)
- **Headers de sécurité** : CSP, HSTS, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **Rate limiting** :
  - Global : 120 req/min par IP (Redis Upstash, persistant entre invocations serverless)
  - Auth : 5/min, Upload : 10/min, API : 60/min, AI : 10/min, PDF : 10/min
  - **Fail-closed** sur auth & IA si Redis est injoignable ; **Upstash obligatoire en production** (échec au boot sinon)
- **Permissions** vérifiées côté serveur (helper réutilisable `requireUser`/`requireRole`)
- **Pièces jointes privées** : bucket non public, servies par **URLs signées** courtes (accès lié à la visibilité du REX)
- **Pas de fuite d'erreurs internes** : messages génériques au client, détails loggués en interne
- **Anonymisation PDF** côté serveur (email non fetché, full_name masqué)
- **Variables d'environnement** pour les secrets
- **Sentry** initialisé via `instrumentation.ts` / `instrumentation-client.ts`, sampling réduit en production (traces: 0.2, profiles: 0.1)

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
│   ├── supabase/         # Clients Supabase (user + admin) + middleware sécurité
│   ├── actions/          # Server Actions
│   ├── validators/       # Schémas Zod
│   ├── hooks/            # Hooks React (useUser, useRexList, useDashboard...)
│   ├── pdf/              # Template PDF @react-pdf/renderer
│   ├── api-auth.ts       # Gardes d'autorisation réutilisables (requireUser/requireRole)
│   ├── sanitize.ts       # Sanitization HTML côté client (rendu)
│   ├── sanitize-server.ts # Sanitization HTML côté serveur (stockage, jsdom)
│   ├── sanitize-config.ts # Allowlist DOMPurify partagée client/serveur
│   ├── storage.ts        # URLs signées + suppression pièces jointes (bucket privé)
│   ├── image-optimizer.ts # Sharp compression + thumbnails
│   ├── logger.ts         # Logging structuré + correlation IDs
│   ├── rate-limit.ts     # Rate limiters Upstash Redis (fail-closed auth/IA)
│   ├── notifications.ts  # Service notifications
│   └── openai.ts         # Client OpenRouter/OpenAI (lazy init)
├── types/                # Types TypeScript
└── supabase/
    └── migrations/       # 13 scripts SQL (idempotents)
```

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- Compte Supabase
- Clé API OpenRouter (optionnel)
- Clé API OpenAI (optionnel, pour embeddings)
- Compte Upstash Redis (**obligatoire en production** pour le rate limiting ; optionnel en dev — fallback mémoire)

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
-- 1.  supabase/migrations/001_initial_schema.sql
-- 2.  supabase/migrations/002_semantic_search.sql
-- 3.  supabase/migrations/003_notifications.sql
-- 4.  supabase/migrations/004_dgscgc_fields.sql
-- 5.  supabase/migrations/005_key_figures.sql
-- 6.  supabase/migrations/006_timeline_prescriptions.sql
-- 7.  supabase/migrations/007_rejection_reason.sql
-- 8.  supabase/migrations/008_all_sdis.sql
-- 9.  supabase/migrations/009_performance_indexes.sql
-- 10. supabase/migrations/010_temoignages_site.sql
-- 11. supabase/migrations/011_ressources_numerotation.sql
-- 12. supabase/migrations/012_private_attachments_bucket.sql   -- rend le bucket privé + RLS storage
-- 13. supabase/migrations/013_rls_sdis_partitioning.sql        -- cloisonnement RLS par SDIS + search_path
-- 14. supabase/migrations/014_demo_readonly.sql                -- (OPTIONNEL) compte démo en lecture seule
-- 15. supabase/migrations/015_notifications_insert_lockdown.sql -- INSERT notifications restreint (déployer le code AVANT)
-- 16. supabase/migrations/016_invitations.sql                   -- inscription sur invitation + domaines autorisés
```

> ⚠️ **Migration 015 — ordre de déploiement** : déployez d'abord le code (les
> routes insèrent désormais les notifications cross-user via le client admin),
> **puis** appliquez la 015. L'appliquer avant le déploiement casserait
> temporairement les notifications (la RLS bloquerait l'ancien code).

> ⚠️ Les migrations 012 et 013 sont des durcissements de sécurité : exécutez-les
> sur les déploiements existants. La 012 bascule le bucket `rex-attachments` en
> privé — vérifiez ensuite que l'affichage des pièces jointes et l'export PDF
> fonctionnent (URLs signées).

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
npm test             # Jest (70 tests)
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

## 🇪🇺 Souveraineté / hébergement UE

Base de données Supabase en **région UE (Irlande)**. Deux briques périphériques
peuvent être basculées vers des services souverains :

### Monitoring : Sentry → GlitchTip (API-compatible)
Aucun changement de code. Pointez le DSN sur votre instance GlitchTip :
```env
NEXT_PUBLIC_SENTRY_DSN=https://<clé>@glitchtip.votre-domaine.fr/<projet>
SENTRY_URL=https://glitchtip.votre-domaine.fr   # pour l'upload des source maps au build
```
GlitchTip ne gère ni session replay ni profiling (non utilisés ici).

### Pièces jointes : Supabase Storage → Scaleway Object Storage
Le stockage bascule automatiquement sur Scaleway dès que les 5 variables
`SCALEWAY_S3_*` sont définies (sinon il reste sur Supabase). Le modèle de sécurité
est inchangé : bucket **privé** + **URLs signées** générées côté serveur.

1. Créer un bucket **privé** sur Scaleway (ex. `retex360-attachments`, région `fr-par`).
2. Définir les variables (voir `.env.example`) :
   `SCALEWAY_S3_ENDPOINT`, `SCALEWAY_S3_REGION`, `SCALEWAY_S3_BUCKET`,
   `SCALEWAY_S3_ACCESS_KEY`, `SCALEWAY_S3_SECRET_KEY`.
3. **Migrer les objets existants** depuis Supabase Storage (clés conservées à
   l'identique) :
   ```bash
   rclone copy supabase:rex-attachments scaleway:retex360-attachments/rex-attachments
   ```
4. Déployer. Les nouvelles URLs sont signées sur Scaleway ; `next.config.ts`
   autorise automatiquement l'hôte Scaleway pour `next/image`.

> Le bucket **avatars** reste sur Supabase (donnée peu sensible) — bascule possible
> ultérieurement sur le même modèle.

---

## 🔐 Compte Démo

Un compte démo **prêt pour la présentation** est disponible : il est pré-rempli
avec un jeu de données qui couvre toutes les fonctionnalités phares.

| Champ | Valeur |
|-------|--------|
| **Email** | `demo@retex360.fr` |
| **Mot de passe** | `Demo2025!` |
| **Rôle** | Utilisateur (lecture seule) |
| **SDIS** | 06 — Alpes-Maritimes |

### Contenu de démonstration
Le seed [`supabase/seed_demo_complet.sql`](supabase/seed_demo_complet.sql) crée,
sous le compte démo :
- **3 RETEX complets** (incendie industriel, sauvetage-déblaiement, NRBC/TMD) avec
  chiffres clés, timeline chronologique, prescriptions, focus thématiques,
  témoignages, ressources et champs DGSCGC — idéal pour démontrer l'export PDF ;
- **1 PEX** et **1 Signalement** pour illustrer le workflow à 3 niveaux ;
- **commentaires + mention `@`**, **favoris** et **notifications** non lues.

### Mise en place
1. **Authentication > Users > Add user** : `demo@retex360.fr` / `Demo2025!` (Auto Confirm ✓).
2. Exécuter les migrations `001` → `013` (voir section Installation).
3. Exécuter [`supabase/seed_demo_complet.sql`](supabase/seed_demo_complet.sql).
4. *(Recommandé si les identifiants sont publics)* Exécuter la migration
   [`014_demo_readonly.sql`](supabase/migrations/014_demo_readonly.sql) pour rendre
   le compte **réellement en lecture seule** (impossible de créer/modifier des
   REX, commentaires ou pièces jointes — la consultation reste totale).

> ⚠️ **Sans la migration 014**, un compte `user` peut techniquement créer des
> brouillons et commenter ; il n'a en revanche jamais accès aux fonctions
> d'administration ni de validation. Appliquez la 014 pour un compte démo public
> infalsifiable.

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
- [x] Tests Jest (70 tests) + CI GitHub Actions
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
- [x] **Audit de sécurité + durcissement** (juin 2026) :
  - [x] Sanitization HTML serveur au stockage (REX + commentaires)
  - [x] RLS cloisonnée par SDIS + `search_path` sur fonctions `SECURITY DEFINER`
  - [x] Bucket pièces jointes privé + URLs signées
  - [x] Rate limiting fail-closed (auth/IA) + Upstash obligatoire en prod
  - [x] Sentry réellement initialisé (instrumentation Next 16)
  - [x] Correction du changement de rôle admin (bypass RLS via service role)
  - [x] Helper d'autorisation `requireRole` + fin des fuites d'erreurs internes

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
