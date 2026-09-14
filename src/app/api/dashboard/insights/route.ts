import { unstable_cache } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { chatCompletion } from '@/lib/llm';
import { NextResponse } from 'next/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { requireUser } from '@/lib/api-auth';
import { truncate, wrapUntrusted, UNTRUSTED_CONTENT_NOTICE } from '@/lib/ai-context';
import { logger } from '@/lib/logger';
import { coerceInsights } from '@/lib/insights-shape';

const INSIGHTS_TTL_SECONDS = 1800;
const INSIGHTS_SAMPLE_SIZE = 50;

// Les insights sont des tendances CLOISONNÉES PAR SDIS : le calcul LLM est mis en
// cache (revalidation 30 min) pour borner le coût et éviter un appel LLM à chaque
// affichage du dashboard. La requête HTTP est donc bon marché → on la passe sous le
// limiteur `api` (60/min) plutôt que `ai` (10/min, fail-closed), ce qui supprime les
// 429 en navigation normale.
//
// Le corpus est exactement ce que TOUT membre du SDIS peut déjà lire individuellement
// (RLS `rex`, migration 013) : les REX validés de son SDIS, plus les REX validés
// inter-SDIS / publics des autres. Cet ensemble ne dépend que du SDIS → la clé de
// cache est le `sdis_id`, et aucun contenu ne franchit la frontière de tenant.
//
// Le client admin reste nécessaire (l'appel est hors contexte de requête une fois
// mis en cache) : le filtrage est donc EXPLICITE ci-dessous, il ne repose pas sur la RLS.
function getCachedInsights(sdisId: string) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data: recentRex } = await admin
        .from('rex')
        .select('title, type, severity, intervention_date, tags, difficulties, lessons_learned')
        .eq('status', 'validated')
        // `sdisId` est un UUID lu en base, pas une entrée utilisateur.
        .or(`sdis_id.eq.${sdisId},visibility.in.(inter_sdis,public)`)
        .order('created_at', { ascending: false })
        .limit(INSIGHTS_SAMPLE_SIZE);

      if (!recentRex || recentRex.length === 0) return [];

      // Le titre n'était borné par rien (`VARCHAR(500)`) et aucun champ n'était
      // débarrassé des chevrons : un REX contenant la balise fermante dans son
      // titre sortait du bloc délimité. `wrapUntrusted` neutralise l'ensemble.
      const rexSummary = recentRex
        .map(
          (r, i) =>
            `${i + 1}. [${r.type}] ${truncate(r.title, 200)} (Gravité: ${r.severity}, Date: ${r.intervention_date})${r.tags?.length ? ` Tags: ${truncate(r.tags.join(', '), 200)}` : ''}${r.difficulties ? `\n   Difficultés: ${truncate(r.difficulties, 150)}` : ''}${r.lessons_learned ? `\n   Enseignements: ${truncate(r.lessons_learned, 150)}` : ''}`
        )
        .join('\n');

      const systemPrompt = `Tu es un analyste expert en retours d'expérience pour les services d'incendie et de secours français (SDIS).
Tu analyses les tendances et patterns dans les REX pour identifier des insights actionnables.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires.

${UNTRUSTED_CONTENT_NOTICE}`;

      const userPrompt = `Analyse ces ${recentRex.length} REX récents et identifie exactement 3 insights (patterns, suggestions, alertes).

${wrapUntrusted(rexSummary)}

Réponds avec ce format JSON exact :
[
  {
    "type": "pattern" | "suggestion" | "alert",
    "text": "description concise de l'insight (max 120 caractères)",
    "priority": "high" | "medium" | "low"
  }
]

Règles :
- Exactement 3 insights
- Au moins 1 de type différent
- Basé sur les données réelles, pas de généralités
- En français professionnel`;

      const response = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.5,
          maxTokens: 500,
        }
      );

      let parsed: unknown;
      try {
        parsed = JSON.parse(response || '[]');
      } catch {
        logger.error('Failed to parse AI insights response:', response);
        return [];
      }

      const insights = coerceInsights(parsed);
      if (insights.length === 0 && response) {
        // Tracé : une réponse non exploitable est silencieuse côté utilisateur
        // (le bloc affiche simplement son état vide) et le resterait une demi-
        // heure, le temps du cache.
        logger.warn('AI insights response had an unusable shape, discarded', {
          sdisId,
          sample: String(response).slice(0, 300),
        });
      }
      return insights;
    },
    ['dashboard-insights', sdisId],
    {
      revalidate: INSIGHTS_TTL_SECONDS,
      tags: ['dashboard-insights', `dashboard-insights:${sdisId}`],
    }
  )();
}

export async function GET() {
  try {
    const supabase = await createClient();
    const auth = await requireUser(supabase);
    if ('response' in auth) return auth.response;

    const limited = await limitByUser(rateLimiters.api, auth.user.id);
    if (limited) return limited;

    const { data: profile } = await supabase
      .from('profiles')
      .select('sdis_id')
      .eq('id', auth.user.id)
      .single();

    // Pas de SDIS rattaché => pas de corpus cloisonné à analyser.
    if (!profile?.sdis_id) {
      return NextResponse.json(
        { insights: [] },
        { headers: { 'Cache-Control': 'private, max-age=600' } }
      );
    }

    const insights = await getCachedInsights(profile.sdis_id);
    return NextResponse.json(
      { insights },
      { headers: { 'Cache-Control': 'private, max-age=600' } }
    );
  } catch (error) {
    logger.error('Dashboard insights error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
