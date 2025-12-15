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

### 📄 Gestion des REX
- **Création de REX** avec éditeur riche (Tiptap)
  - Titre, date d'intervention, type, gravité
  - Description, contexte opérationnel, moyens engagés
  - Difficultés rencontrées, enseignements
  - Tags personnalisés
  - Visibilité (SDIS, Inter-SDIS, Public)
- **Édition de REX** (auteur ou admin)
- **Suppression de REX** avec confirmation
- **Export PDF** des REX
- **Pièces jointes** avec upload drag & drop
  - Images (JPG, PNG, GIF, WebP) et PDF
  - Prévisualisation des images
  - Max 5 Mo par fichier, 10 fichiers max

### 📋 Liste & Recherche
- **Liste paginée** des REX avec vue grille/liste
- **Page de recherche avancée** `/search` avec :
  - Recherche full-text (titre, description, contexte)
  - Filtres : type, SDIS, sévérité, statut, période, tags
  - Résultats paginés avec tri
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
- **Graphiques interactifs** (Recharts)
  - Évolution des REX sur 12 mois (Area Chart)
  - Répartition par type (Pie Chart)
  - Répartition par gravité (Bar Chart)
- **REX récents**
- **Top contributeurs**
- **Actions rapides**

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
- **Centre de notifications** avec popover dans le header
- **Badge animé** pour les non-lues
- **Actions** : marquer lu, tout marquer lu, supprimer
- **Liens cliquables** vers les RETEX concernés

### 🎨 Interface
- **Sidebar collapsible** avec tooltips
- **Thème clair/sombre** avec toggle
- **Design responsive** adapté mobile
- **Affichage/masquage mot de passe** sur login/register
- **Page À propos** avec présentation du projet
- **Page Paramètres** `/settings`
  - Modification du profil (nom, grade, SDIS)
  - Upload d'avatar
  - Changement de mot de passe

### 👥 Administration
- **Gestion des utilisateurs** `/admin/users`
  - Liste avec recherche et filtres
  - Modification des rôles (user, validator, admin, super_admin)
  - Statistiques par rôle
- **Permissions** :
  - Admin : gère les utilisateurs de son SDIS
  - Super Admin : accès à tous les SDIS
- **Compte démo** disponible pour la hiérarchie

---

## 🛠️ Stack Technique

### Frontend
- **Next.js 16** (App Router, React 19)
- **TypeScript**
- **Tailwind CSS 4** + shadcn/ui
- **Tiptap** (éditeur riche)
- **Recharts** (graphiques)
- **Lucide React** (icônes)
- **React Hook Form** + Zod (formulaires)
- **Sonner** (notifications toast)
- **date-fns** (dates)

### Backend
- **Supabase** (PostgreSQL, Auth, Storage, Realtime)
- **API Routes** Next.js
- **OpenRouter API** (LLM multi-modèles)
- **OpenAI API** (embeddings)
- **Sentry** (monitoring erreurs)

### Base de données
- **PostgreSQL** avec extensions :
  - `pgvector` pour recherche sémantique
  - `pg_trgm` pour recherche textuelle
- **Row Level Security (RLS)**
- **Triggers** automatiques

---

## 📁 Structure du Projet

```
src/
├── app/
│   ├── (auth)/           # Pages authentification
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/      # Pages protégées
│   │   ├── dashboard/
│   │   ├── rex/
│   │   │   ├── [id]/     # Détail & édition REX
│   │   │   └── new/
│   │   ├── favorites/
│   │   ├── search/
│   │   ├── about/
│   │   └── admin/
│   │       ├── users/
│   │       └── validation/
│   └── api/              # API Routes
│       ├── rex/
│       ├── comments/
│       ├── notifications/
│       ├── search/
│       └── ai/
├── components/
│   ├── ui/               # Composants shadcn/ui
│   ├── layout/           # Header, Sidebar, Footer
│   ├── rex/              # Composants REX
│   ├── comments/         # Système de commentaires
│   ├── dashboard/        # Dashboard & graphiques
│   ├── favorites/        # Liste des favoris
│   ├── notifications/    # Cloche de notifications
│   ├── admin/            # Gestion utilisateurs
│   └── search/           # Recherche avancée
├── lib/
│   ├── supabase/         # Clients Supabase
│   ├── actions/          # Server Actions
│   ├── validators/       # Schémas Zod
│   ├── notifications.ts  # Service notifications
│   └── openai.ts         # Client OpenRouter/OpenAI
├── hooks/                # Hooks React personnalisés
│   └── use-notifications.ts
├── types/                # Types TypeScript
└── supabase/
    └── migrations/       # Scripts SQL
```

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- Compte Supabase
- Clé API OpenRouter (optionnel)
- Clé API OpenAI (optionnel, pour embeddings)

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
```

### 4. Lancer le serveur
```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## 📡 API Routes

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/rex` | Liste des REX (paginée, filtrée) |
| `POST` | `/api/rex` | Créer un REX |
| `GET` | `/api/rex/[id]` | Détail d'un REX |
| `PUT` | `/api/rex/[id]` | Modifier un REX |
| `DELETE` | `/api/rex/[id]` | Supprimer un REX |
| `GET` | `/api/rex/stats` | Statistiques des REX |
| `POST` | `/api/rex/[id]/favorite` | Ajouter aux favoris |
| `DELETE` | `/api/rex/[id]/favorite` | Retirer des favoris |
| `POST` | `/api/rex/[id]/validate` | Valider/Rejeter un REX |
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
| `POST` | `/api/rex/attachments` | Upload pièce jointe REX |
| `DELETE` | `/api/rex/attachments/[id]` | Supprimer pièce jointe |

---

## 🔒 Sécurité

- **Authentification** Supabase Auth (JWT)
- **Row Level Security** sur toutes les tables
- **Validation** des données avec Zod
- **Permissions** vérifiées côté serveur
- **Variables d'environnement** pour les secrets

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

### 3. Déployer
Vercel déploiera automatiquement à chaque push sur `main`.

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

- [x] Recherche avancée avec filtres
- [x] Notifications temps réel
- [x] Gestion des utilisateurs
- [x] Page À propos
- [x] Page Paramètres utilisateur
- [x] Upload d'images pour les REX
- [x] Monitoring Sentry
- [ ] Intelligence Artificielle (analyse de patterns)
- [ ] Application mobile (React Native)
- [ ] Export Excel/CSV
- [ ] Intégration cartographique
- [ ] Statistiques avancées par SDIS
- [ ] Mode hors-ligne (PWA)

---

## 📄 Licence

Projet privé - Tous droits réservés

---

## 👥 Contributeurs

Développé pour les SDIS de France 🇫🇷
