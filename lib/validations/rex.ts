import { z } from "zod";

// Énumérations pour les types de données REX
export const RexTypeEnum = z.enum([
  "INTERVENTION",
  "EXERCICE",
  "FORMATION",
  "TECHNIQUE",
  "ORGANISATIONNEL",
  "AUTRE",
]);

export const RexGravityEnum = z.enum([
  "SANS_GRAVITE",
  "FAIBLE",
  "MODEREE",
  "GRAVE",
  "TRES_GRAVE",
]);

export const RexStatusEnum = z.enum([
  "BROUILLON",
  "EN_ATTENTE",
  "VALIDE",
  "REJETE",
  "ARCHIVE",
]);

export const RexVisibilityEnum = z.enum([
  "PRIVE",        // Visible uniquement par l'auteur
  "SDIS",         // Visible par tout le SDIS
  "REGIONAL",     // Visible par la région
  "NATIONAL",     // Visible par tous les SDIS
]);

// Schéma pour les fichiers joints
export const RexAttachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom du fichier est requis"),
  url: z.string().url("URL invalide"),
  type: z.string(),
  size: z.number(),
  uploadedAt: z.date().optional(),
});

// Schéma pour les tags
export const RexTagSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom du tag est requis"),
});

// Schéma principal pour la création/édition d'un REX
export const RexFormSchema = z.object({
  // Informations de base
  title: z
    .string()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(200, "Le titre ne peut pas dépasser 200 caractères"),

  type: RexTypeEnum,

  date: z.date({
    error: "La date de l'événement est requise",
  }),

  location: z
    .string()
    .min(3, "Le lieu doit contenir au moins 3 caractères")
    .max(200, "Le lieu ne peut pas dépasser 200 caractères"),

  // Description détaillée
  description: z
    .string()
    .min(50, "La description doit contenir au moins 50 caractères")
    .max(5000, "La description ne peut pas dépasser 5000 caractères"),

  // Contexte de l'intervention
  context: z
    .string()
    .min(20, "Le contexte doit contenir au moins 20 caractères")
    .max(3000, "Le contexte ne peut pas dépasser 3000 caractères")
    .optional(),

  // Actions menées
  actions: z
    .string()
    .min(20, "Les actions doivent contenir au moins 20 caractères")
    .max(3000, "Les actions ne peuvent pas dépasser 3000 caractères")
    .optional(),

  // Résultats et conséquences
  results: z
    .string()
    .min(20, "Les résultats doivent contenir au moins 20 caractères")
    .max(3000, "Les résultats ne peuvent pas dépasser 3000 caractères")
    .optional(),

  // Analyse et leçons apprises
  analysis: z
    .string()
    .min(30, "L'analyse doit contenir au moins 30 caractères")
    .max(4000, "L'analyse ne peut pas dépasser 4000 caractères"),

  // Recommandations
  recommendations: z
    .string()
    .min(20, "Les recommandations doivent contenir au moins 20 caractères")
    .max(3000, "Les recommandations ne peuvent pas dépasser 3000 caractères")
    .optional(),

  // Gravité et classification
  gravity: RexGravityEnum,

  // Visibilité et partage
  visibility: RexVisibilityEnum,

  // Tags et catégorisation
  tags: z
    .array(RexTagSchema)
    .max(10, "Maximum 10 tags par REX")
    .optional(),

  // Fichiers joints
  attachments: z
    .array(RexAttachmentSchema)
    .max(15, "Maximum 15 fichiers par REX")
    .optional(),

  // Participants (optionnel)
  participants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        role: z.string().optional(),
      })
    )
    .max(50, "Maximum 50 participants")
    .optional(),

  // Moyens engagés (optionnel)
  resources: z
    .string()
    .max(1000, "Les moyens ne peuvent pas dépasser 1000 caractères")
    .optional(),

  // Statut (pour l'édition)
  status: RexStatusEnum.optional(),

  // Métadonnées (pour édition)
  id: z.string().optional(),
  sdisId: z.string().optional(),
});

// Type TypeScript dérivé du schéma
export type RexFormData = z.infer<typeof RexFormSchema>;

// Schéma pour la création (certains champs optionnels deviennent requis)
export const RexCreateSchema = RexFormSchema.extend({
  status: z.literal("BROUILLON").or(z.literal("EN_ATTENTE")),
});

// Schéma pour l'update (tous les champs sont optionnels sauf l'id)
export const RexUpdateSchema = RexFormSchema.partial().extend({
  id: z.string().min(1, "L'ID du REX est requis"),
});

// Type pour les filtres de recherche
export const RexFiltersSchema = z.object({
  search: z.string().optional(),
  type: RexTypeEnum.optional(),
  gravity: RexGravityEnum.optional(),
  status: RexStatusEnum.optional(),
  visibility: RexVisibilityEnum.optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  tags: z.array(z.string()).optional(),
  authorId: z.string().optional(),
  sdisId: z.string().optional(),
});

export type RexFilters = z.infer<typeof RexFiltersSchema>;
