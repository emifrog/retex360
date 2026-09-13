import { z } from 'zod';
import { REX_TYPES, SEVERITIES, VISIBILITIES, PRODUCTION_TYPES } from '@/types';

// ============================================================================
// Focus Thématique Schema
// ============================================================================

export const focusThematiqueSchema = z.object({
  id: z.string(),
  theme: z.string().min(1, 'Le thème est requis'),
  problematique: z.string().min(10, 'La problématique doit contenir au moins 10 caractères'),
  actions_menees: z.string().min(10, 'Les actions menées doivent contenir au moins 10 caractères'),
  axes_amelioration: z
    .string()
    .min(10, "Les axes d'amélioration doivent contenir au moins 10 caractères"),
});

export type FocusThematiqueInput = z.infer<typeof focusThematiqueSchema>;

// ============================================================================
// Base REX Schema (champs communs)
// ============================================================================

const rexBaseSchema = z.object({
  title: z
    .string()
    .min(10, 'Le titre doit contenir au moins 10 caractères')
    .max(500, 'Le titre ne peut pas dépasser 500 caractères'),
  intervention_date: z.string().date('Date invalide'),
  // Plan type PEX (annexe D), rubrique « date et heure » : facultative, car
  // beaucoup de signalements ne connaissent pas l'heure exacte.
  intervention_heure: z
    .string()
    // Classes explicites plutôt que `\d` : une heure ne s'écrit qu'en chiffres
    // arabes, et `\d` accepterait les chiffres d'autres systèmes d'écriture.
    // Les secondes sont tolérées — Postgres rend un TIME sous la forme HH:MM:SS.
    .regex(/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Heure invalide (format HH:MM)')
    .optional()
    .nullable()
    .or(z.literal('')),
  // Rubrique « lieu de l'intervention », commune aux annexes D et E.
  localisation: z
    .string()
    .max(500, 'Le lieu ne peut pas dépasser 500 caractères')
    .optional()
    .nullable(),
  commune: z
    .string()
    .max(200, 'La commune ne peut pas dépasser 200 caractères')
    .optional()
    .nullable(),
  type: z.enum(REX_TYPES, {
    message: "Type d'intervention invalide",
  }),
  severity: z.enum(SEVERITIES, {
    message: 'Niveau de criticité invalide',
  }),
  visibility: z.enum(VISIBILITIES).default('sdis'),
  type_production: z.enum(PRODUCTION_TYPES).default('retex'),
  tags: z.array(z.string()).default([]),
});

// ============================================================================
// Signalement Schema (niveau minimal)
// ============================================================================

export const rexSignalementSchema = rexBaseSchema.extend({
  type_production: z.literal('signalement'),
  description: z.string().min(20, 'La description doit contenir au moins 20 caractères'),
  // Champs optionnels pour signalement
  context: z.string().optional().nullable(),
  means_deployed: z.string().optional().nullable(),
  difficulties: z.string().optional().nullable(),
  lessons_learned: z.string().optional().nullable(),
  message_ambiance: z.string().optional().nullable(),
  sitac: z.string().optional().nullable(),
  elements_favorables: z.string().optional().nullable(),
  elements_defavorables: z.string().optional().nullable(),
  documentation_operationnelle: z.string().optional().nullable(),
  focus_thematiques: z.array(focusThematiqueSchema).optional().nullable(),
  objectifs: z.string().optional().nullable(),
  donnees_sources: z.string().optional().nullable(),
  methode_argumentation: z.string().optional().nullable(),
});

// ============================================================================
// PEX Schema (niveau intermédiaire)
// ============================================================================

export const rexPexSchema = rexBaseSchema.extend({
  type_production: z.literal('pex'),
  description: z.string().min(50, 'La description doit contenir au moins 50 caractères'),
  context: z.string().min(20, 'Le contexte opérationnel doit contenir au moins 20 caractères'),
  means_deployed: z.string().min(20, 'Les moyens engagés doivent contenir au moins 20 caractères'),
  lessons_learned: z.string().min(20, 'Les enseignements doivent contenir au moins 20 caractères'),
  // Champs optionnels pour PEX
  difficulties: z.string().optional().nullable(),
  elements_favorables: z.string().optional().nullable(),
  elements_defavorables: z.string().optional().nullable(),
  message_ambiance: z.string().optional().nullable(),
  sitac: z.string().optional().nullable(),
  documentation_operationnelle: z.string().optional().nullable(),
  focus_thematiques: z.array(focusThematiqueSchema).optional().nullable(),
  // Rubriques du plan type RETEX : hors périmètre du PEX, donc facultatives.
  objectifs: z.string().optional().nullable(),
  donnees_sources: z.string().optional().nullable(),
  methode_argumentation: z.string().optional().nullable(),
});

// ============================================================================
// RETEX Schema (niveau complet)
// ============================================================================

export const rexRetexSchema = rexBaseSchema.extend({
  type_production: z.literal('retex'),
  description: z.string().min(50, 'La description doit contenir au moins 50 caractères'),
  context: z.string().min(20, 'Le contexte opérationnel doit contenir au moins 20 caractères'),
  means_deployed: z.string().min(20, 'Les moyens engagés doivent contenir au moins 20 caractères'),
  lessons_learned: z.string().min(20, 'Les enseignements doivent contenir au moins 20 caractères'),
  focus_thematiques: z
    .array(focusThematiqueSchema)
    .min(1, 'Au moins un focus thématique est requis pour un RETEX'),
  // Plan type RETEX (annexe E), rubriques 2, 4 et 6 — ce qui distingue un RETEX
  // d'un PEX étoffé. Seuils bas : on vérifie que la rubrique est renseignée,
  // pas qu'elle est bien écrite.
  objectifs: z.string().min(20, 'Les objectifs du RETEX doivent contenir au moins 20 caractères'),
  donnees_sources: z
    .string()
    .min(20, 'Les données et sources doivent contenir au moins 20 caractères'),
  methode_argumentation: z
    .string()
    .min(20, "L'argumentation de la méthode doit contenir au moins 20 caractères"),
  // Champs recommandés pour RETEX
  difficulties: z.string().optional().nullable(),
  elements_favorables: z.string().optional().nullable(),
  elements_defavorables: z.string().optional().nullable(),
  message_ambiance: z.string().optional().nullable(),
  sitac: z.string().optional().nullable(),
  documentation_operationnelle: z.string().optional().nullable(),
});

// ============================================================================
// Schema unifié avec validation conditionnelle
// ============================================================================

export const rexSchema = z.discriminatedUnion('type_production', [
  rexSignalementSchema,
  rexPexSchema,
  rexRetexSchema,
]);

// Schema flexible pour les brouillons (validation moins stricte)
export const rexDraftSchema = rexBaseSchema.extend({
  description: z.string().optional().or(z.literal('')),
  context: z.string().optional().nullable(),
  means_deployed: z.string().optional().nullable(),
  difficulties: z.string().optional().nullable(),
  lessons_learned: z.string().optional().nullable(),
  message_ambiance: z.string().optional().nullable(),
  sitac: z.string().optional().nullable(),
  elements_favorables: z.string().optional().nullable(),
  elements_defavorables: z.string().optional().nullable(),
  documentation_operationnelle: z.string().optional().nullable(),
  focus_thematiques: z.array(focusThematiqueSchema).optional().nullable(),
  objectifs: z.string().optional().nullable(),
  donnees_sources: z.string().optional().nullable(),
  methode_argumentation: z.string().optional().nullable(),
});

// ============================================================================
// Filter Schema
// ============================================================================

export const rexFilterSchema = z.object({
  search: z.string().optional(),
  type: z.enum(REX_TYPES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  status: z.enum(['draft', 'pending', 'validated', 'archived']).optional(),
  type_production: z.enum(PRODUCTION_TYPES).optional(),
  sdis_id: z.string().uuid().optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(10),
});

// ============================================================================
// Types exports
// ============================================================================

export type RexInput = z.infer<typeof rexSchema>;
export type RexDraftInput = z.infer<typeof rexDraftSchema>;
export type RexSignalementInput = z.infer<typeof rexSignalementSchema>;
export type RexPexInput = z.infer<typeof rexPexSchema>;
export type RexRetexInput = z.infer<typeof rexRetexSchema>;
export type RexFilter = z.infer<typeof rexFilterSchema>;

// ============================================================================
// Validation helper
// ============================================================================

export function validateRexByType(data: unknown, isDraft: boolean = false) {
  if (isDraft) {
    return rexDraftSchema.safeParse(data);
  }
  return rexSchema.safeParse(data);
}

// Helper pour obtenir les champs requis selon le type
export function getRequiredFieldsForType(type: (typeof PRODUCTION_TYPES)[number]) {
  switch (type) {
    case 'signalement':
      return ['title', 'intervention_date', 'type', 'severity', 'description'];
    case 'pex':
      return [
        'title',
        'intervention_date',
        'type',
        'severity',
        'description',
        'context',
        'means_deployed',
        'lessons_learned',
      ];
    case 'retex':
      return [
        'title',
        'intervention_date',
        'type',
        'severity',
        'description',
        'context',
        'means_deployed',
        'lessons_learned',
        'focus_thematiques',
        // Plan type RETEX (annexe E), rubriques 2, 4 et 6 (migration 023).
        'objectifs',
        'donnees_sources',
        'methode_argumentation',
      ];
    default:
      return ['title', 'intervention_date', 'type', 'severity', 'description'];
  }
}
