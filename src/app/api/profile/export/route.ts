import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Fetch all user data
    const [profileResult, rexResult, commentsResult, favoritesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, grade, role, avatar_url, created_at, updated_at, sdis:sdis_id(code, name)')
        .eq('id', user.id)
        .single(),
      supabase
        .from('rex')
        .select('id, title, type, severity, status, description, context, factual_elements, lessons_learned, production_type, intervention_date, visibility, created_at, updated_at')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('comments')
        .select('id, content, created_at, rex:rex_id(title)')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('favorites')
        .select('id, created_at, rex:rex_id(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    const exportData = {
      export_date: new Date().toISOString(),
      export_format: 'RGPD - Droit à la portabilité (Article 20)',
      profile: profileResult.data,
      rex_created: rexResult.data || [],
      comments: commentsResult.data || [],
      favorites: favoritesResult.data || [],
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="retex360-donnees-personnelles-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error('Data export error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
