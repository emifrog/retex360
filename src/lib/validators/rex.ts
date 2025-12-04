import { z } from 'zod';
import { REX_TYPES, SEVERITIES, VISIBILITIES } from '@/types';

export const rexSchema = z.object({
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
  description: z
    .string()
    .min(50, 'La description doit contenir au moins 50 caractères')
    .optional()
    .or(z.literal('')),
  context: z.string().optional(),
  means_deployed: z.string().optional(),
  difficulties: z.string().optional(),
  lessons_learned: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const rexFilterSchema = z.object({
  search: z.string().optional(),
  type: z.enum(REX_TYPES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  status: z.enum(['draft', 'pending', 'validated', 'archived']).optional(),
  sdis_id: z.string().uuid().optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(10),
});

export type RexInput = z.infer<typeof rexSchema>;
export type RexFilter = z.infer<typeof rexFilterSchema>;
