import { createClient } from '@/lib/supabase/server';
import { chatCompletion, OPENROUTER_MODELS } from '@/lib/openai';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = await rateLimiters.ai.limit(ip);

  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset);
  }

  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Fetch recent REX for analysis (last 50)
    const { data: recentRex, error } = await supabase
      .from('rex')
      .select('title, type, severity, intervention_date, tags, difficulties, lessons_learned')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Insights query error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    if (!recentRex || recentRex.length === 0) {
      return NextResponse.json({ insights: [] });
    }

    // Build context from recent REX
    const rexSummary = recentRex.map((r, i) =>
      `${i + 1}. [${r.type}] ${r.title} (Gravité: ${r.severity}, Date: ${r.intervention_date})${r.tags?.length ? ` Tags: ${r.tags.join(', ')}` : ''}${r.difficulties ? `\n   Difficultés: ${r.difficulties.slice(0, 150)}` : ''}${r.lessons_learned ? `\n   Enseignements: ${r.lessons_learned.slice(0, 150)}` : ''}`
    ).join('\n');

    const systemPrompt = `Tu es un analyste expert en retours d'expérience pour les services d'incendie et de secours français (SDIS).
Tu analyses les tendances et patterns dans les REX pour identifier des insights actionnables.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaires.`;

    const userPrompt = `Analyse ces ${recentRex.length} REX récents et identifie exactement 3 insights (patterns, suggestions, alertes).

Données des REX :
${rexSummary}

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
        model: OPENROUTER_MODELS.CLAUDE_HAIKU,
        temperature: 0.5,
        maxTokens: 500,
      }
    );

    let insights = [];
    try {
      insights = JSON.parse(response || '[]');
    } catch {
      logger.error('Failed to parse AI insights response:', response);
      insights = [];
    }

    return NextResponse.json({ insights });
  } catch (error) {
    logger.error('Dashboard insights error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
