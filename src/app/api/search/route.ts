import { createClient } from '@/lib/supabase/server';
import { orIlike } from '@/lib/supabase/filters';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { searchSchema } from '@/lib/validators/api';
import { semanticMatches } from '@/lib/semantic';
import { logger } from '@/lib/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

const REX_SELECT = '*, author:profiles!author_id(full_name, avatar_url), sdis:sdis_id(code, name)';

/**
 * Recherche plein texte — le repli quand la voie vectorielle ne donne rien.
 *
 * Trois situations y mènent, et une seule était traitée :
 *  - le calcul de l'embedding échoue (clé absente, fournisseur injoignable) ;
 *  - la fonction de recherche vectorielle renvoie une erreur ;
 *  - elle réussit mais ne renvoie AUCUN résultat, parce que la colonne
 *    `embedding` est vide.
 *
 * Ce dernier cas est précisément l'état de la base pendant une régénération des
 * embeddings : la recherche répondait « aucun résultat » sur un corpus pourtant
 * présent et interrogeable en plein texte.
 */
async function textSearch(supabase: SupabaseClient, query: string, limit: number) {
  const { data } = await supabase
    .from('rex')
    .select(REX_SELECT)
    .or(orIlike(['title', 'description', 'lessons_learned'], query))
    .eq('status', 'validated')
    .limit(limit);
  return data ?? [];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    }

    const limited = await limitByUser(rateLimiters.search, user.id);
    if (limited) return limited;

    const body = await request.json();

    // Validation Zod
    const validated = searchSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ message: validated.error.issues[0].message }, { status: 400 });
    }

    const { query, limit } = validated.data;

    // Même module que la page `/search` : une seule définition du seuil de
    // similarité, du plafond de résultats et du traitement des indisponibilités.
    const rexIds = await semanticMatches(supabase, query);

    // Zéro résultat vaut repli, au même titre qu'une indisponibilité : pendant
    // une régénération des embeddings, la colonne est vide et la voie sémantique
    // ne peut rien trouver, alors que le plein texte le peut.
    if (!rexIds || rexIds.length === 0) {
      return NextResponse.json({
        results: await textSearch(supabase, query, limit),
        searchType: 'text',
      });
    }

    const { data: fullResults } = await supabase
      .from('rex')
      .select(REX_SELECT)
      .in('id', rexIds.slice(0, limit));

    // La RPC rend les identifiants par similarité décroissante ; `in()` les rend
    // dans un ordre quelconque. On réaligne sur l'ordre de pertinence.
    const sortedResults = fullResults?.sort((a, b) => rexIds.indexOf(a.id) - rexIds.indexOf(b.id));

    // `scores` a disparu de la réponse : la recherche partagée ne rend que le
    // classement, et l'ordre des résultats le porte déjà. Aucun appelant ne
    // lisait ce champ.
    return NextResponse.json({
      results: sortedResults ?? [],
      searchType: 'semantic',
    });
  } catch (error) {
    logger.error('Search error:', error);
    return NextResponse.json({ message: 'Erreur de recherche' }, { status: 500 });
  }
}
