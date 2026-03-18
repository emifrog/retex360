import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Step 1: Lightweight query — only fetch author_id (no JOINs)
    const { data: rexAuthors, error } = await supabase
      .from('rex')
      .select('author_id');

    if (error) {
      logger.error('Contributors query error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Step 2: Aggregate counts in JS (minimal data, just UUIDs)
    const counts = new Map<string, number>();
    for (const r of rexAuthors || []) {
      counts.set(r.author_id, (counts.get(r.author_id) || 0) + 1);
    }

    // Step 3: Get top 5 author IDs
    const top5Ids = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    if (top5Ids.length === 0) {
      return NextResponse.json({ contributors: [] });
    }

    // Step 4: Fetch profiles only for top 5 (with SDIS join)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, grade, avatar_url, sdis:sdis_id(code)')
      .in('id', top5Ids);

    // Step 5: Build response
    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    );

    const contributors = top5Ids.map((id, i) => {
      const profile = profileMap.get(id) as unknown as {
        id: string;
        full_name: string;
        grade: string | null;
        avatar_url: string | null;
        sdis: { code: string } | null;
      } | undefined;
      const count = counts.get(id) || 0;

      return {
        rank: i + 1,
        name: profile
          ? (profile.grade ? `${profile.grade} ${profile.full_name}` : profile.full_name)
          : 'Inconnu',
        sdis: profile?.sdis?.code ? `SDIS ${profile.sdis.code}` : 'Non renseigné',
        count,
        avatar_url: profile?.avatar_url || null,
      };
    });

    return NextResponse.json({ contributors });
  } catch (error) {
    logger.error('Contributors error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
