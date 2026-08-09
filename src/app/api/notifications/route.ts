import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { isUuid } from '@/lib/supabase/filters';
import { paginationSchema } from '@/lib/validators/api';
import { logger } from '@/lib/logger';

// GET - Fetch user notifications
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    // `?limit=999999` ou `?limit=abc` (NaN) partaient tels quels vers Postgres.
    // Le repli est '20' (et non la valeur par défaut du schéma, 10) pour ne pas
    // changer la taille du centre de notifications ; le plafond à 100 s'applique.
    const pagination = paginationSchema.safeParse({
      limit: searchParams.get('limit') ?? '20',
    });
    if (!pagination.success) {
      return NextResponse.json({ error: 'Paramètre `limit` invalide' }, { status: 400 });
    }
    const { limit } = pagination.data;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      logger.error('Notifications fetch error:', error);
      return NextResponse.json(
        { error: 'Erreur lors du chargement des notifications' },
        { status: 500 }
      );
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return NextResponse.json({
      data: notifications,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    logger.error('Notifications error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Mark notifications as read
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimiters.api.limit(ip);
  if (!rl.success) return rateLimitResponse(rl.reset);

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { markAllRead } = body;
    // Les ids atterrissent dans une liste PostgREST `in.(...)`, qui est parsée :
    // on ne garde que des UUID (cf. lib/supabase/filters).
    const notificationIds: string[] = Array.isArray(body.notificationIds)
      ? body.notificationIds.filter(isUuid)
      : [];

    if (markAllRead) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        logger.error('Mark all read error:', error);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
      }
    } else if (notificationIds.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .in('id', notificationIds);

      if (error) {
        logger.error('Mark read error:', error);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Mark read error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
