import { z } from 'zod';
import { strongPasswordSchema } from './auth';

// Profile update schema — `sdis_id` n'est volontairement PAS modifiable ici :
// l'affectation au SDIS vient de l'invitation / d'un admin, jamais de l'utilisateur
// (sinon évasion cross-tenant). Verrou DB en complément (migration 019).
export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(255),
  grade: z.string().max(100).nullable().optional(),
});

// Password change schema — applique la même politique forte que l'inscription.
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: strongPasswordSchema,
});

// Comment schema
export const commentSchema = z.object({
  content: z.string().min(1, 'Le commentaire ne peut pas être vide').max(5000),
  parent_id: z.string().uuid().nullable().optional(),
  // Mentioned user ids — validated as UUIDs and capped to bound notification fan-out.
  mentions: z.array(z.string().uuid()).max(20).optional().default([]),
});

// Inscription sur invitation : le SDIS et le rôle viennent de l'invitation,
// l'utilisateur ne fournit que le token + son nom/grade + son mot de passe.
export const invitationRegisterSchema = z
  .object({
    token: z.string().min(20, "Lien d'invitation invalide"),
    fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(255),
    grade: z.string().max(100).optional(),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

// Ajout d'un domaine email autorisé (restriction secondaire des invitations).
export const domainCreateSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Domaine invalide')
    .max(255)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Domaine invalide (ex. sdis06.fr)'),
  sdisId: z.string().uuid('SDIS invalide').optional(),
});

// Création d'une invitation (admin SDIS / super_admin).
export const invitationCreateSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.enum(['user', 'validator', 'admin', 'super_admin']).default('user'),
  // super_admin peut cibler un SDIS ; pour un admin, on force son propre SDIS.
  sdisId: z.string().uuid('SDIS invalide').optional(),
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
    message: "Type d'analyse invalide",
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
