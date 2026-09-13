import { createAdminClient } from '@/lib/supabase/server';
import { generateEmbedding, generateRexEmbedding, isEmbeddingConfigured } from '@/lib/llm';
import { logger } from '@/lib/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Recherche sémantique : indexation d'un côté, interrogation de l'autre.
 *
 * L'indexation est déclenchée à la VALIDATION, et pas à la création ni à chaque
 * enregistrement, pour trois raisons : `search_rex_by_embedding` ne retient que
 * les REX `validated`, un brouillon change beaucoup et chaque calcul est
 * facturé, et le contenu n'est stable qu'une fois relu.
 *
 * Avant ce module, rien n'appelait jamais la génération d'embedding : la
 * colonne restait vide sur l'intégralité du corpus et la recherche sémantique,
 * bien qu'entièrement câblée, ne pouvait rien remonter.
 */

/**
 * Nombre de REX rapportés par la recherche vectorielle.
 *
 * Volontairement plus large qu'une page : les filtres de la page de recherche
 * (type, SDIS, gravité, dates, tags) s'appliquent ENSUITE, et un plafond trop
 * bas les rendrait inopérants — on filtrerait un échantillon déjà tronqué.
 */
export const SEMANTIC_MATCH_LIMIT = 50;

/** Seuil de similarité cosinus en deçà duquel un REX n'est pas jugé pertinent. */
const SIMILARITY_THRESHOLD = 0.5;

/**
 * Identifiants de REX proches du texte donné, du plus pertinent au moins
 * pertinent.
 *
 * Renvoie `null` quand la voie sémantique est indisponible (clé absente,
 * fournisseur injoignable, fonction en erreur) — à distinguer d'un tableau
 * vide, qui signifie « interrogée, mais rien ne correspond ». Les deux mènent
 * au repli plein texte, mais seul le premier est une anomalie.
 *
 * Le client passé est celui de l'appelant : la RLS de `rex` s'applique donc, et
 * le cloisonnement par SDIS de la migration 013 vaut aussi pour cette voie.
 */
export async function semanticMatches(
  supabase: SupabaseClient,
  query: string
): Promise<string[] | null> {
  if (!isEmbeddingConfigured()) return null;

  try {
    const embedding = await generateEmbedding(query);
    const { data, error } = await supabase.rpc('search_rex_by_embedding', {
      query_embedding: embedding,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: SEMANTIC_MATCH_LIMIT,
    });

    if (error) {
      logger.error('Recherche sémantique en erreur', { error: error.message });
      return null;
    }

    return (data ?? []).map((row: { id: string }) => row.id);
  } catch (error) {
    logger.error('Recherche sémantique indisponible', { error });
    return null;
  }
}

/**
 * Calcule et enregistre l'embedding d'un REX. Ne lève jamais.
 *
 * Conçu pour être lancé APRÈS la réponse HTTP : l'appel au fournisseur prend
 * de l'ordre de la seconde, et rien ne justifie de faire attendre le validateur
 * pour une donnée dérivée. Un échec laisse la colonne à NULL — le REX reste
 * trouvable en plein texte, et `npm run embeddings:regenerate` rattrapera.
 */
export async function indexRexForSearch(rexId: string): Promise<void> {
  if (!isEmbeddingConfigured()) return;

  try {
    // Client service : l'appel a lieu hors contexte de requête, donc sans
    // session. L'autorisation a déjà été vérifiée par la route appelante, qui
    // vient de valider ce REX précis ; on n'écrit qu'une donnée dérivée sur
    // cette seule ligne.
    const admin: SupabaseClient = createAdminClient();

    const { data: rex, error } = await admin
      .from('rex')
      .select('id, title, description, context, lessons_learned, tags')
      .eq('id', rexId)
      .maybeSingle();

    if (error || !rex) {
      logger.warn('Indexation sémantique : REX introuvable', { rexId, error: error?.message });
      return;
    }

    const embedding = await generateRexEmbedding(rex);

    const { error: updateError } = await admin.from('rex').update({ embedding }).eq('id', rexId);

    if (updateError) {
      logger.error('Indexation sémantique : écriture impossible', {
        rexId,
        error: updateError.message,
      });
      return;
    }

    logger.info('REX indexé pour la recherche sémantique', { rexId });
  } catch (error) {
    // Une indexation ratée ne doit jamais remonter jusqu'à l'appelant : la
    // validation, elle, a bien eu lieu.
    logger.error('Indexation sémantique en échec', { rexId, error });
  }
}
