# 📋 Formulaire REX & Upload de Fichiers - Guide d'Installation

## 🎯 Vue d'ensemble

Ce package complet fournit :
- ✅ Formulaire de création/édition REX complet avec validation
- ✅ Upload de fichiers avec UploadThing (documents + images)
- ✅ Schémas de validation Zod
- ✅ Server Actions et API Routes
- ✅ Schéma Supabase complet
- ✅ Pages Next.js prêtes à l'emploi

## 📦 Fichiers fournis

### Configuration UploadThing
- `uploadthing-config.ts` → Configuration des routes d'upload
- `uploadthing-route.ts` → API route pour UploadThing
- `uploadthing-utils.ts` → Utilitaires client

### Validation
- `rex-validation.ts` → Schémas Zod complets avec types

### Composants
- `rex-form.tsx` → Formulaire REX complet avec :
  - 4 onglets (Informations, Analyse, Fichiers, Paramètres)
  - Upload de documents (PDF, DOCX, XLSX)
  - Upload d'images
  - Gestion des tags
  - Validation en temps réel

### Backend
- `rex-actions.ts` → Server Actions pour CRUD REX
- `rex-api-route.ts` → API POST/GET pour `/api/rex`
- `rex-api-id-route.ts` → API GET/PATCH/DELETE pour `/api/rex/[id]`

### Pages
- `rex-new-page.tsx` → Page création REX
- `rex-edit-page.tsx` → Page édition REX

### Configuration
- `schema.sql` → Schéma Supabase complet
- `env-example.txt` → Variables d'environnement
- `install-dependencies.sh` → Script d'installation

## 🚀 Installation

### Étape 1 : Créer un compte UploadThing

1. Allez sur https://uploadthing.com
2. Créez un compte (gratuit)
3. Créez une nouvelle application
4. Copiez vos clés API :
   - `UPLOADTHING_SECRET`
   - `UPLOADTHING_APP_ID`

### Étape 2 : Configurer les variables d'environnement

Créez un fichier `.env` à la racine :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/retex_connect"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="genere-avec-openssl-rand-base64-32"

# UploadThing
UPLOADTHING_SECRET="sk_live_xxxxx"
UPLOADTHING_APP_ID="your_app_id"

# OpenAI (optionnel)
OPENAI_API_KEY="sk-xxxxx"
```

### Étape 3 : Installer les dépendances

```bash
# Rendre le script exécutable
chmod +x install-dependencies.sh

# Exécuter le script
./install-dependencies.sh

# Ou manuellement :
npm install @uploadthing/react uploadthing
npm install react-hook-form @hookform/resolvers zod
npm install date-fns lucide-react
```

### Étape 4 : Configurer Supabase

```bash
# Copier le schéma Supabase



```

### Étape 5 : Structurer les fichiers

Copiez les fichiers dans votre projet Next.js :

```

```

## 📝 Utilisation

### Créer un nouveau REX

```typescript
// Dans votre page ou composant
import { RexForm } from "@/components/rex/rex-form";

export default function NewRexPage() {
  return <RexForm mode="create" />;
}
```

### Éditer un REX existant

```typescript
import { RexForm } from "@/components/rex/rex-form";
import { getRexById } from "@/app/actions/rex";

export default async function EditRexPage({ params }) {
  const rex = await getRexById(params.id);
  
  return (
    <RexForm 
      mode="edit" 
      rexId={params.id} 
      initialData={rex} 
    />
  );
}
```

### Utiliser les Server Actions

```typescript
import { createRex, updateRex, getRexList } from "@/app/actions/rex";

// Créer un REX
const newRex = await createRex(formData);

// Mettre à jour un REX
const updatedRex = await updateRex(rexId, formData);

// Récupérer la liste des REX avec filtres
const { rexList, pagination } = await getRexList({
  search: "incendie",
  type: "INTERVENTION",
  page: 1,
  limit: 20,
});
```

### Utiliser les API Routes

```typescript
// POST /api/rex - Créer un REX
const response = await fetch("/api/rex", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(formData),
});

// GET /api/rex - Liste des REX
const response = await fetch("/api/rex?page=1&limit=20&type=INTERVENTION");

// PATCH /api/rex/[id] - Mettre à jour
const response = await fetch(`/api/rex/${rexId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(updates),
});

// DELETE /api/rex/[id] - Supprimer
const response = await fetch(`/api/rex/${rexId}`, {
  method: "DELETE",
});
```

## 🎨 Personnalisation

### Modifier les types de REX

Dans `rex-validation.ts` :

```typescript
export const RexTypeEnum = z.enum([
  "INTERVENTION",
  "EXERCICE",
  "FORMATION",
  "TECHNIQUE",
  "ORGANISATIONNEL",
  "SECOURS_ROUTIER", // Ajouter ici
  "AUTRE",
]);
```

### Modifier les limites d'upload

Dans `uploadthing-config.ts` :

```typescript
rexDocuments: f({
  pdf: { maxFileSize: "32MB", maxFileCount: 10 }, // Au lieu de 16MB et 5
  // ...
})
```

### Ajouter des champs au formulaire

1. Ajouter le champ dans `rex-validation.ts` :
```typescript
export const RexFormSchema = z.object({
  // ... champs existants
  newField: z.string().optional(),
});
```

2. Ajouter le champ dans le schéma Prisma :
```prisma
model Rex {
  // ... champs existants
  newField  String?
}
```

3. Ajouter le champ dans le formulaire `rex-form.tsx` :
```tsx
<FormField
  control={form.control}
  name="newField"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Nouveau champ</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
    </FormItem>
  )}
/>
```

## 🔒 Sécurité

### Gestion des permissions

Le système inclut plusieurs niveaux de visibilité :
- `PRIVE` : Visible uniquement par l'auteur
- `SDIS` : Visible par tout le SDIS
- `REGIONAL` : Visible par la région
- `NATIONAL` : Visible par tous les SDIS

Les permissions sont vérifiées dans :
- `rex-actions.ts` → Server Actions
- `rex-api-id-route.ts` → API Routes
- `rex-edit-page.tsx` → Pages

### Validation côté serveur

Toutes les données sont validées avec Zod avant insertion en base :
- Dans les Server Actions
- Dans les API Routes
- Schémas stricts avec messages d'erreur en français

## 🐛 Débogage

### Problème d'upload

1. Vérifiez vos clés UploadThing dans `.env`
2. Vérifiez que le middleware fonctionne (authentification)
3. Consultez les logs dans la console UploadThing

### Erreur de validation

1. Vérifiez que les données correspondent au schéma Zod
2. Consultez les messages d'erreur dans `FormMessage`
3. Utilisez `form.formState.errors` pour déboguer

### Erreur Supabase

1. Vérifiez que la migration est appliquée


## 📊 Structure de données

### Format REX complet

```typescript
{
  // Informations de base
  title: "Intervention feu de véhicule A8",
  type: "INTERVENTION",
  date: new Date("2024-11-20"),
  location: "Nice - Autoroute A8 PK 52",
  
  // Contenu
  description: "Description détaillée...",
  context: "Conditions météo, environnement...",
  actions: "Actions menées chronologiquement...",
  results: "Résultats obtenus...",
  analysis: "Analyse de l'intervention...",
  recommendations: "Recommandations...",
  resources: "2 FPT, 1 VSAV, 12 SP",
  
  // Classification
  gravity: "MODEREE",
  visibility: "SDIS",
  status: "VALIDE",
  
  // Relations
  tags: [
    { name: "incendie" },
    { name: "autoroute" },
  ],
  attachments: [
    {
      name: "rapport.pdf",
      url: "https://uploadthing.com/...",
      type: "application/pdf",
      size: 1024000,
    },
  ],
}
```


