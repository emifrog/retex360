import { z } from 'zod';

/**
 * Politique de mot de passe forte, appliquée à la CRÉATION et au CHANGEMENT de
 * mot de passe (pas au login, pour ne pas verrouiller les comptes existants).
 * 12 caractères minimum + minuscule/majuscule/chiffre — aligné sur les attentes
 * d'un audit DSI/ANSSI. Évolution recommandée : vérification anti-compromission
 * (HaveIBeenPwned, k-anonymity) côté serveur dans les routes register/password.
 */
export const strongPasswordSchema = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre');

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  // Volontairement à 6 (et non 12) : le login vérifie un identifiant existant.
  // La politique forte ne s'applique qu'à la création/au changement de mot de
  // passe, pour ne pas verrouiller les comptes créés sous l'ancienne règle.
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

export const registerSchema = z
  .object({
    email: z.string().email('Email invalide'),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
    fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    sdisId: z.string().min(1, 'Veuillez sélectionner un SDIS').uuid('SDIS invalide'),
    grade: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
