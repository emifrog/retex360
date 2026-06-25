import { z } from 'zod';
import { PLANS, SUBSCRIPTION_STATUSES } from '@/types';

/**
 * Schémas Zod du panel super_admin (onboarding SDIS, abonnements, audit).
 * Toutes ces routes sont réservées au rôle super_admin et passent par le rôle
 * service (RLS verrouillée sur `subscriptions` / `admin_audit_log`).
 */

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Domaine invalide')
  .max(255)
  .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Domaine invalide (ex. sdis06.fr)');

const optionalLimit = z.union([z.number().int().positive().max(1_000_000), z.null()]).optional();

// Onboarding d'un SDIS client : cible un SDIS existant (sdisId) OU en crée un
// nouveau (code + name). Configure abonnement + domaines + compte admin initial.
export const sdisOnboardSchema = z
  .object({
    // Cible existante
    sdisId: z.string().uuid('SDIS invalide').optional(),
    // Création d'un nouveau SDIS
    code: z.string().trim().min(1).max(10).optional(),
    name: z.string().trim().min(2, 'Nom requis').max(255).optional(),
    region: z.string().trim().max(100).optional(),
    departement: z.string().trim().max(10).optional(),
    logoUrl: z.string().trim().url('URL de logo invalide').max(2048).optional().or(z.literal('')),

    // Domaines email autorisés (restriction secondaire des invitations)
    domains: z.array(domainSchema).max(20).optional().default([]),

    // Abonnement
    plan: z.enum(PLANS).default('essentiel'),
    status: z.enum(SUBSCRIPTION_STATUSES).default('trial'),
    trialEndsAt: z.coerce.date().nullable().optional(),
    currentPeriodStart: z.coerce.date().nullable().optional(),
    currentPeriodEnd: z.coerce.date().nullable().optional(),
    maxUsers: optionalLimit,
    maxRexPerMonth: optionalLimit,

    // Compte admin initial (invitation tokenisée)
    adminEmail: z.string().email('Email administrateur invalide'),
    adminFullName: z.string().trim().max(255).optional(),
  })
  .refine((d) => Boolean(d.sdisId) || (Boolean(d.code) && Boolean(d.name)), {
    message: 'Sélectionnez un SDIS existant ou renseignez code + nom',
    path: ['sdisId'],
  });

// Mise à jour d'un abonnement (changement de plan, suspension/réactivation, dates, limites).
export const subscriptionUpdateSchema = z
  .object({
    plan: z.enum(PLANS).optional(),
    status: z.enum(SUBSCRIPTION_STATUSES).optional(),
    suspendedReason: z.string().trim().max(1000).nullable().optional(),
    trialEndsAt: z.coerce.date().nullable().optional(),
    currentPeriodStart: z.coerce.date().nullable().optional(),
    currentPeriodEnd: z.coerce.date().nullable().optional(),
    maxUsers: optionalLimit,
    maxRexPerMonth: optionalLimit,
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Aucune modification fournie' });

// Réinitialisation du mot de passe d'un admin SDIS (lien de récupération).
export const resetAdminSchema = z.object({
  email: z.string().email('Email invalide'),
});

export type SdisOnboardInput = z.infer<typeof sdisOnboardSchema>;
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
