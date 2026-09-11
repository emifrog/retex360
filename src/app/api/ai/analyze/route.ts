import { createClient } from '@/lib/supabase/server';
import { chatCompletion } from '@/lib/llm';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, limitByUser } from '@/lib/rate-limit';
import { aiAnalysisSchema } from '@/lib/validators/api';
import { buildAnalysisContext, UNTRUSTED_CONTENT_NOTICE } from '@/lib/ai-context';
import { logger } from '@/lib/logger';
import { requireUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const auth = await requireUser(supabase);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    const limited = await limitByUser(rateLimiters.ai, user.id);
    if (limited) return limited;

    const body = await request.json();

    // Validation Zod
    const validated = aiAnalysisSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 });
    }

    const { rexId, type } = validated.data;

    // Fetch the REX
    const { data: rex, error } = await supabase.from('rex').select('*').eq('id', rexId).single();

    if (error || !rex) {
      return NextResponse.json({ error: 'REX non trouvé' }, { status: 404 });
    }

    // Corpus borné par champ et délimité : le REX est rédigé par un utilisateur
    // et l'analyse est souvent lue par un autre (validateur). Sans délimitation,
    // des instructions glissées dans un champ seraient lues comme une consigne
    // et l'analyse rendue au relecteur serait fabriquée par l'auteur du REX.
    const rexContext = buildAnalysisContext(rex);

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'summary':
        systemPrompt = `Tu es un expert en retours d'expérience pour les services d'incendie et de secours français. 
Tu analyses les REX (Retours d'Expérience) et produis des synthèses claires et concises.
Réponds en français, de manière professionnelle et structurée.`;
        userPrompt = `Analyse ce REX et produis une synthèse en 3-4 phrases maximum, mettant en avant les points clés et les enseignements principaux:

${rexContext}`;
        break;

      case 'suggestions':
        systemPrompt = `Tu es un expert en retours d'expérience pour les services d'incendie et de secours français.
Tu analyses les REX et proposes des améliorations et recommandations concrètes.
Réponds en français avec des suggestions actionnables.`;
        userPrompt = `Analyse ce REX et propose 3 à 5 recommandations concrètes pour améliorer les interventions futures similaires:

${rexContext}`;
        break;

      case 'patterns':
        systemPrompt = `Tu es un expert en analyse de données opérationnelles pour les services d'incendie et de secours.
Tu identifies les patterns et tendances dans les retours d'expérience.
Réponds en français de manière analytique.`;
        userPrompt = `Analyse ce REX et identifie les patterns ou tendances qui pourraient être utiles pour d'autres interventions:

${rexContext}`;
        break;

      case 'tags':
        systemPrompt = `Tu es un expert en classification de retours d'expérience pour les services d'incendie et de secours.
Tu proposes des tags pertinents pour catégoriser les REX.
Réponds uniquement avec une liste de tags séparés par des virgules, sans explication.`;
        // Les tags existants figurent déjà DANS le bloc délimité. Les répéter
        // ici les ferait ressortir du bloc, c'est-à-dire exactement la fuite
        // que la délimitation sert à empêcher.
        userPrompt = `Propose 5 à 8 tags pertinents pour ce REX, en plus de ceux déjà présents dans ses données:

${rexContext}`;
        break;

      default:
        return NextResponse.json({ error: "Type d'analyse invalide" }, { status: 400 });
    }

    // Appliqué après le switch : aucun cas ne peut partir sans l'avertissement.
    systemPrompt = `${systemPrompt}\n\n${UNTRUSTED_CONTENT_NOTICE}`;

    const response = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        maxTokens: 500,
      }
    );

    return NextResponse.json({
      type,
      analysis: response,
      rexId,
    });
  } catch (error) {
    logger.error('AI analysis error:', error);
    return NextResponse.json({ error: "Erreur lors de l'analyse IA" }, { status: 500 });
  }
}
