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

    // Get REX counts per author with profile info
    const { data: rexByAuthor, error } = await supabase
      .from('rex')
      .select('author_id, author:profiles!author_id(full_name, grade, avatar_url, sdis:sdis_id(code))');

    if (error) {
      logger.error('Contributors query error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Aggregate counts per author
    const authorCounts = new Map<string, { count: number; full_name: string; grade: string | null; avatar_url: string | null; sdis_code: string | null }>();

    for (const rex of rexByAuthor || []) {
      const authorId = rex.author_id;
      const author = rex.author as unknown as { full_name: string; grade: string | null; avatar_url: string | null; sdis: { code: string } | null } | null;

      if (!author) continue;

      const existing = authorCounts.get(authorId);
      if (existing) {
        existing.count++;
      } else {
        authorCounts.set(authorId, {
          count: 1,
          full_name: author.full_name,
          grade: author.grade,
          avatar_url: author.avatar_url,
          sdis_code: author.sdis?.code || null,
        });
      }
    }

    // Sort by count and take top 5
    const contributors = Array.from(authorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((c, i) => ({
        rank: i + 1,
        name: c.grade ? `${c.grade} ${c.full_name}` : c.full_name,
        sdis: c.sdis_code ? `SDIS ${c.sdis_code}` : 'Non renseigné',
        count: c.count,
        avatar_url: c.avatar_url,
      }));

    return NextResponse.json({ contributors });
  } catch (error) {
    logger.error('Contributors error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
