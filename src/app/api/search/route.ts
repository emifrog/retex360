import { createClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/openai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    const { query, limit = 10 } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ message: 'Query requise' }, { status: 400 });
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Search using vector similarity
    const { data: results, error } = await supabase.rpc('search_rex_by_embedding', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: limit,
    });

    if (error) {
      console.error('Search error:', error);
      // Fallback to text search if vector search fails
      const { data: textResults } = await supabase
        .from('rex')
        .select('*, author:profiles!author_id(full_name, avatar_url), sdis:sdis_id(code, name)')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,lessons_learned.ilike.%${query}%`)
        .eq('status', 'validated')
        .limit(limit);

      return NextResponse.json({
        results: textResults || [],
        searchType: 'text',
      });
    }

    // Fetch full REX data for results
    if (results && results.length > 0) {
      const rexIds = results.map((r: { id: string }) => r.id);
      const { data: fullResults } = await supabase
        .from('rex')
        .select('*, author:profiles!author_id(full_name, avatar_url), sdis:sdis_id(code, name)')
        .in('id', rexIds);

      // Sort by similarity score
      const sortedResults = fullResults?.sort((a, b) => {
        const aIndex = rexIds.indexOf(a.id);
        const bIndex = rexIds.indexOf(b.id);
        return aIndex - bIndex;
      });

      return NextResponse.json({
        results: sortedResults || [],
        searchType: 'semantic',
        scores: results.map((r: { id: string; similarity: number }) => ({
          id: r.id,
          similarity: r.similarity,
        })),
      });
    }

    return NextResponse.json({
      results: [],
      searchType: 'semantic',
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ message: 'Erreur de recherche' }, { status: 500 });
  }
}
