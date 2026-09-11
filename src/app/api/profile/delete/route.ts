import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { requireUser } from '@/lib/api-auth';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const auth = await requireUser(supabase);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const limited = await limitByUser(rateLimiters.auth, user.id);
    if (limited) return limited;

    // Validate confirmation from body
    const body = await request.json();
    if (body.confirmation !== 'SUPPRIMER MON COMPTE') {
      return NextResponse.json({ error: 'Confirmation invalide' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Delete user profile data (cascade will handle rex, comments, favorites, notifications)
    const { error: profileError } = await adminClient.from('profiles').delete().eq('id', user.id);

    if (profileError) {
      logger.error('Profile deletion error:', profileError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression des données' },
        { status: 500 }
      );
    }

    // Delete user auth account
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (authDeleteError) {
      logger.error('Auth deletion error:', authDeleteError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du compte' },
        { status: 500 }
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
