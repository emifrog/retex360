import { createClient } from '@/lib/supabase/server';
import { chatCompletion, OPENROUTER_MODELS } from '@/lib/openai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { rexId, type } = body;

    if (!rexId) {
      return NextResponse.json({ error: 'ID du REX requis' }, { status: 400 });
    }

    // Fetch the REX
    const { data: rex, error } = await supabase
      .from('rex')
      .select('*')
      .eq('id', rexId)
      .single();

    if (error || !rex) {
      return NextResponse.json({ error: 'REX non trouvé' }, { status: 404 });
    }

    // Build context for AI
    const rexContext = `
Titre: ${rex.title}
Type: ${rex.type}
Gravité: ${rex.severity}
Date d'intervention: ${rex.intervention_date}

Description:
${rex.description || 'Non renseigné'}

Contexte opérationnel:
${rex.context || 'Non renseigné'}

Moyens engagés:
${rex.means_deployed || 'Non renseigné'}

Difficultés rencontrées:
${rex.difficulties || 'Non renseigné'}

Enseignements:
${rex.lessons_learned || 'Non renseigné'}

Tags: ${rex.tags?.join(', ') || 'Aucun'}
    `.trim();

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
        userPrompt = `Propose 5 à 8 tags pertinents pour ce REX (en plus des tags existants: ${rex.tags?.join(', ') || 'aucun'}):

${rexContext}`;
        break;

      default:
        return NextResponse.json({ error: 'Type d\'analyse invalide' }, { status: 400 });
    }

    const response = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: OPENROUTER_MODELS.CLAUDE_HAIKU, // Fast and cheap for analysis
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
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse IA' },
      { status: 500 }
    );
  }
}
