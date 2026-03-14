import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { passwordChangeSchema } from '@/lib/validators/api';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function PUT(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.auth.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validation Zod
    const validated = passwordChangeSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: validated.data.currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Mot de passe actuel incorrect' },
        { status: 400 }
      );
    }

    // Update password using Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password: validated.data.newPassword,
    });

    if (error) {
      logger.error('Password update error:', error);
      
      if (error.message.includes('same')) {
        return NextResponse.json(
          { error: 'Le nouveau mot de passe doit être différent de l\'ancien' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erreur lors du changement de mot de passe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Password update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
