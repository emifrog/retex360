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
  axes_amelioration: z.string().min(10, 'Les axes d\'amélioration doivent contenir au moins 10 caractères'),
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
  description: z
    .string()
    .min(20, 'La description doit contenir au moins 20 caractères'),
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
});

// ============================================================================
// PEX Schema (niveau intermédiaire)
// ============================================================================

export const rexPexSchema = rexBaseSchema.extend({
  type_production: z.literal('pex'),
  description: z
    .string()
    .min(50, 'La description doit contenir au moins 50 caractères'),
  context: z
    .string()
    .min(20, 'Le contexte opérationnel doit contenir au moins 20 caractères'),
  means_deployed: z
    .string()
    .min(20, 'Les moyens engagés doivent contenir au moins 20 caractères'),
  lessons_learned: z
    .string()
    .min(20, 'Les enseignements doivent contenir au moins 20 caractères'),
  // Champs optionnels pour PEX
  difficulties: z.string().optional().nullable(),
  elements_favorables: z.string().optional().nullable(),
  elements_defavorables: z.string().optional().nullable(),
  message_ambiance: z.string().optional().nullable(),
  sitac: z.string().optional().nullable(),
  documentation_operationnelle: z.string().optional().nullable(),
  focus_thematiques: z.array(focusThematiqueSchema).optional().nullable(),
});

// ============================================================================
// RETEX Schema (niveau complet)
// ============================================================================

export const rexRetexSchema = rexBaseSchema.extend({
  type_production: z.literal('retex'),
  description: z
    .string()
    .min(50, 'La description doit contenir au moins 50 caractères'),
  context: z
    .string()
    .min(20, 'Le contexte opérationnel doit contenir au moins 20 caractères'),
  means_deployed: z
    .string()
    .min(20, 'Les moyens engagés doivent contenir au moins 20 caractères'),
  lessons_learned: z
    .string()
    .min(20, 'Les enseignements doivent contenir au moins 20 caractères'),
  focus_thematiques: z
    .array(focusThematiqueSchema)
    .min(1, 'Au moins un focus thématique est requis pour un RETEX'),
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
export function getRequiredFieldsForType(type: typeof PRODUCTION_TYPES[number]) {
  switch (type) {
    case 'signalement':
      return ['title', 'intervention_date', 'type', 'severity', 'description'];
    case 'pex':
      return ['title', 'intervention_date', 'type', 'severity', 'description', 'context', 'means_deployed', 'lessons_learned'];
    case 'retex':
      return ['title', 'intervention_date', 'type', 'severity', 'description', 'context', 'means_deployed', 'lessons_learned', 'focus_thematiques'];
    default:
      return ['title', 'intervention_date', 'type', 'severity', 'description'];
  }
}
