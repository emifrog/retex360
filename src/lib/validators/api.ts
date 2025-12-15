import { z } from 'zod';

// Profile update schema
export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(255),
  grade: z.string().max(100).nullable().optional(),
  sdis_id: z.string().uuid('SDIS invalide').nullable().optional(),
});

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
});

// Comment schema
export const commentSchema = z.object({
  content: z.string().min(1, 'Le commentaire ne peut pas être vide').max(5000),
  parent_id: z.string().uuid().nullable().optional(),
});

// Role update schema
export const roleUpdateSchema = z.object({
  userId: z.string().uuid('ID utilisateur invalide'),
  role: z.enum(['user', 'validator', 'admin', 'super_admin'], {
    message: 'Rôle invalide',
  }),
});

// AI analysis schema
export const aiAnalysisSchema = z.object({
  rexId: z.string().uuid('ID REX invalide'),
  type: z.enum(['summary', 'suggestions', 'patterns', 'tags'], {
    message: 'Type d\'analyse invalide',
  }),
});

// Search schema
export const searchSchema = z.object({
  query: z.string().min(1, 'Requête de recherche requise').max(500),
  limit: z.number().int().positive().max(50).default(10),
});

// Notification schema
export const notificationActionSchema = z.object({
  notificationId: z.string().uuid().optional(),
  action: z.enum(['read', 'read_all', 'delete']),
});

// REX status update schema
export const rexStatusSchema = z.object({
  status: z.enum(['draft', 'pending', 'validated', 'archived']),
  rejection_reason: z.string().max(1000).optional(),
});

// Favorite schema
export const favoriteSchema = z.object({
  rexId: z.string().uuid('ID REX invalide'),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// UUID param schema
export const uuidParamSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

// Export types
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type PasswordChange = z.infer<typeof passwordChangeSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type RoleUpdate = z.infer<typeof roleUpdateSchema>;
export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type NotificationAction = z.infer<typeof notificationActionSchema>;
export type RexStatus = z.infer<typeof rexStatusSchema>;
