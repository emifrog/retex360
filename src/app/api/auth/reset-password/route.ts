import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { rateLimiters, limitByIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { strongPasswordSchema } from '@/lib/validators/auth';
import { isPasswordCompromised } from '@/lib/password-breach';
import { RECOVERY_COOKIE } from '@/lib/auth/recovery';

const resetPasswordSchema = z.object({
  password: strongPasswordSchema,
});

export async function POST(request: NextRequest) {
  const limited = await limitByIp(rateLimiters.auth, request);
  if (limited) return limited;

  try {
    const body = await request.json();

    // Validation Zod
    const validated = resetPasswordSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const { password } = validated.data;

    // Rejeter les mots de passe figurant dans une fuite connue (fail-open).
    if (await isPasswordCompromised(password)) {
      return NextResponse.json(
        {
          error:
            'Ce mot de passe figure dans une fuite de données connue. Veuillez en choisir un autre.',
        },
        { status: 400 }
      );
    }

    // La session doit provenir d'un lien de récupération, pas seulement exister.
    // Sans ce contrôle, toute session ouverte permettait de changer le mot de
    // passe sans connaître l'ancien — alors que le changement ordinaire
    // (`/api/profile/password`) le vérifie, lui.
    if (!request.cookies.has(RECOVERY_COOKIE)) {
      return NextResponse.json(
        {
          error:
            'Ce parcours nécessite un lien de récupération valide. Veuillez en demander un nouveau.',
        },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated (via recovery link)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Session invalide ou expirée. Veuillez demander un nouveau lien.' },
        { status: 401 }
      );
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      logger.error('Reset password error:', error);

      if (error.message.includes('same')) {
        return NextResponse.json(
          { error: "Le nouveau mot de passe doit être différent de l'ancien" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Erreur lors de la réinitialisation du mot de passe' },
        { status: 500 }
      );
    }

    // Marque consommée : le lien ne sert qu'une fois. Un onglet resté ouvert ne
    // redonne pas accès au parcours.
    const response = NextResponse.json({ success: true });
    response.cookies.delete(RECOVERY_COOKIE);
    return response;
  } catch (error) {
    logger.error('Reset password error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
