import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { buildEmbeddingInput, type RexForAi } from '@/lib/ai-context';

/**
 * Accès aux modèles de langage.
 *
 * Deux fournisseurs, pour deux raisons distinctes :
 *
 *  - **Génération de texte → Mistral, en direct** (`api.mistral.ai`). Fournisseur
 *    européen appelé sans intermédiaire : les contenus de REX — qui décrivent
 *    des interventions réelles — ne transitent par aucune passerelle hors UE.
 *    C'est la même exigence que celle qui a fait retenir Scaleway pour le
 *    stockage et GlitchTip comme alternative à Sentry.
 *
 *  - **Embeddings → OpenAI**, pour l'instant. `mistral-embed` produit des
 *    vecteurs de 1024 dimensions, or la colonne `rex.embedding` et la fonction
 *    `search_rex_by_embedding` sont figées à 1536 (migrations 001 et 002).
 *    Basculer demande une migration de schéma ET la régénération de tous les
 *    embeddings existants — les anciens vecteurs ne deviennent pas imprécis,
 *    ils deviennent incomparables. Tant que ce n'est pas fait, la recherche
 *    sémantique reste sur OpenAI.
 *
 * L'API Mistral est compatible OpenAI au niveau du fil : le SDK `openai` sert
 * donc les deux, avec une `baseURL` différente.
 */

/** Marge sous le `maxDuration: 30` déclaré dans `vercel.json`. */
const LLM_TIMEOUT_MS = 25_000;

const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';

/**
 * Modèles Mistral, par identifiant d'API.
 *
 * Les identifiants portent leur version (`AAMM`) : ils ne bougent pas sous nos
 * pieds, mais il faut les mettre à jour volontairement.
 */
export const MISTRAL_MODELS = {
  /** Mistral Small 4 — $0,15 / $0,60 par million de tokens. */
  SMALL: 'mistral-small-2603',
  /** Mistral Medium 3.5 — $1,50 / $7,50 par million de tokens. */
  MEDIUM: 'mistral-medium-2604',
  /** Mistral Large 3. */
  LARGE: 'mistral-large-2512',
} as const;

/**
 * Modèle par défaut : Small 4.
 *
 * Les deux usages du produit — synthèse d'un REX et dégagement de tendances —
 * sont des tâches de rédaction structurée sur un corpus fourni, pas du
 * raisonnement ouvert. Ajustable sans redéploiement via `MISTRAL_MODEL` si la
 * qualité des analyses ne convient pas ; Medium coûte dix fois plus cher en
 * entrée et douze fois plus en sortie.
 */
const DEFAULT_MODEL = process.env.MISTRAL_MODEL || MISTRAL_MODELS.SMALL;

// Lazy init : ne jamais faire échouer le build quand la clé n'est pas présente.
let _mistral: OpenAI | null = null;

function getMistral(): OpenAI {
  if (!_mistral) {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY is not configured');
    }
    _mistral = new OpenAI({
      apiKey: process.env.MISTRAL_API_KEY,
      baseURL: MISTRAL_BASE_URL,
      // Le SDK attend 10 minutes par défaut, or `vercel.json` coupe les routes
      // API à 30 s : sans borne explicite, la fonction est tuée avant d'avoir pu
      // logger l'échec ou renvoyer une erreur lisible. 25 s laissent de quoi
      // répondre proprement.
      timeout: LLM_TIMEOUT_MS,
      // Une seule reprise : chaque tentative est facturée, et le limiteur `ai`
      // est déjà fail-closed.
      maxRetries: 1,
    });
  }
  return _mistral;
}

export function isLlmConfigured(): boolean {
  return Boolean(process.env.MISTRAL_API_KEY);
}

/** Appel de génération de texte. */
export async function chatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) {
  const model = options?.model || DEFAULT_MODEL;
  const startedAt = Date.now();

  const response = await getMistral().chat.completions.create({
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 1024,
  });

  // Sans cette trace, la dépense LLM est invisible : impossible de la rattacher
  // à un usage, d'alerter sur une dérive, ou de la refacturer à un SDIS.
  logger.info('LLM call', {
    provider: 'mistral',
    model,
    promptTokens: response.usage?.prompt_tokens ?? null,
    completionTokens: response.usage?.completion_tokens ?? null,
    totalTokens: response.usage?.total_tokens ?? null,
    durationMs: Date.now() - startedAt,
  });

  return response.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// Embeddings — OpenAI tant que le schéma est en 1536 dimensions (voir en-tête).
// ---------------------------------------------------------------------------

/** Dimension attendue par `rex.embedding` et `search_rex_by_embedding`. */
export const EMBEDDING_DIMENSIONS = 1536;

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      // Anciennement : repli vers `openrouter.ai/api/v1/embeddings`, que le
      // commentaire d'origine reconnaissait lui-même comme non supporté. Chaque
      // recherche sémantique payait donc un aller-retour voué à l'échec avant
      // de retomber sur la recherche plein texte. Échouer tout de suite est
      // plus honnête, et l'appelant a déjà ce repli.
      throw new Error(
        'OPENAI_API_KEY is not configured — la recherche sémantique est indisponible ' +
          '(les embeddings restent sur OpenAI tant que le schéma est en 1536 dimensions).'
      );
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: LLM_TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return _openai;
}

export function isEmbeddingConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const startedAt = Date.now();
  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  logger.info('Embedding call', {
    provider: 'openai',
    promptTokens: response.usage?.prompt_tokens ?? null,
    durationMs: Date.now() - startedAt,
  });

  return response.data[0].embedding;
}

export async function generateRexEmbedding(rex: RexForAi): Promise<number[]> {
  // Borné à la fenêtre du modèle d'embedding : au-delà, l'API ne tronque pas,
  // elle refuse la requête.
  return generateEmbedding(buildEmbeddingInput(rex));
}
