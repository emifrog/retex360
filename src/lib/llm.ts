import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { buildEmbeddingInput, type RexForAi } from '@/lib/ai-context';

/**
 * Accès aux modèles de langage — Mistral, en direct (`api.mistral.ai`).
 *
 * Fournisseur européen appelé sans intermédiaire : les contenus de REX, qui
 * décrivent des interventions réelles, ne transitent par aucune passerelle hors
 * UE. Même exigence que celle qui a fait retenir Scaleway pour le stockage et
 * GlitchTip comme alternative à Sentry — et, auprès d'un acheteur public, un
 * critère de recevabilité plutôt qu'une préférence.
 *
 * Génération de texte et embeddings passent désormais par le même fournisseur.
 * Le second a nécessité la migration 022 : `mistral-embed` produit des vecteurs
 * de 1024 dimensions, là où le schéma était figé à 1536 par `text-embedding-3-small`.
 *
 * L'API Mistral est compatible OpenAI au niveau du fil : le SDK `openai` la sert
 * telle quelle, avec une `baseURL` différente.
 */

/**
 * Marge sous le `maxDuration: 30` déclaré dans `vercel.json` — qui ne couvre
 * que `src/app/api/**`.
 */
const LLM_TIMEOUT_MS = 25_000;

/**
 * Budget d'un embedding calculé PENDANT LE RENDU D'UNE PAGE.
 *
 * Les pages ne sont pas dans `vercel.json` : elles gardent la durée par défaut
 * de la plateforme (de l'ordre de 10 s), et non les 30 s des routes API.
 * Attendre 25 s dans un Server Component fait donc tuer la fonction de rendu
 * par l'hébergeur AVANT que le `try/catch` appelant ne puisse s'exécuter — et
 * une fonction tuée en plein rendu produit une erreur de Server Component
 * opaque, sans repli possible.
 *
 * 5 s est par ailleurs déjà long pour une recherche interactive : au-delà, la
 * bonne réponse est de rendre la recherche plein texte, pas de faire patienter.
 */
export const INTERACTIVE_EMBEDDING_TIMEOUT_MS = 5_000;

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
// Embeddings — mistral-embed (migration 022)
// ---------------------------------------------------------------------------

export const EMBEDDING_MODEL = 'mistral-embed';

/**
 * Dimension produite par `mistral-embed`, et donc attendue par la colonne
 * `rex.embedding` et la fonction `search_rex_by_embedding` (migration 022).
 *
 * Ces trois valeurs doivent rester alignées. Un écart ne dégrade pas les
 * résultats : Postgres rejette l'écriture et la recherche tombe en erreur.
 */
export const EMBEDDING_DIMENSIONS = 1024;

export function isEmbeddingConfigured(): boolean {
  return isLlmConfigured();
}

export async function generateEmbedding(
  text: string,
  options?: { timeoutMs?: number }
): Promise<number[]> {
  const startedAt = Date.now();
  const response = await getMistral().embeddings.create(
    {
      model: EMBEDDING_MODEL,
      input: text,
      // OBLIGATOIRE, et c'est la seule ligne qui empêche une corruption
      // silencieuse. Sans elle, le SDK OpenAI demande `encoding_format: 'base64'`
      // de lui-même, puis décode la réponse comme une chaîne base64. Or Mistral
      // ignore ce paramètre et renvoie toujours un tableau de nombres : le SDK
      // interprète alors chaque flottant comme un OCTET, et reconstruit
      // 1024 / 4 = 256 valeurs — toutes nulles, puisque des flottants entre -1 et
      // 1 tronqués en octets donnent zéro.
      //
      // Le résultat est un vecteur de la mauvaise taille ET vide de sens. Aucune
      // erreur n'est levée : si la colonne avait eu 256 dimensions, ces zéros
      // auraient été stockés et la recherche sémantique aurait rendu n'importe
      // quoi sans que rien ne le signale.
      encoding_format: 'float',
    },
    // Timeout par requête : l'appelant sait combien de temps il a, le client
    // partagé ne peut pas le deviner.
    options?.timeoutMs ? { timeout: options.timeoutMs } : undefined
  );

  const embedding = response.data[0].embedding;

  // Garde de cohérence : si le fournisseur change la dimension de sortie, mieux
  // vaut l'apprendre ici, avec un message qui nomme la migration à refaire, que
  // par une erreur d'insertion Postgres à l'autre bout de la chaîne.
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding de ${embedding.length} dimensions, ${EMBEDDING_DIMENSIONS} attendues. ` +
        'Le schéma (migration 022) et EMBEDDING_DIMENSIONS doivent être repris ensemble.'
    );
  }

  logger.info('Embedding call', {
    provider: 'mistral',
    model: EMBEDDING_MODEL,
    promptTokens: response.usage?.prompt_tokens ?? null,
    durationMs: Date.now() - startedAt,
  });

  return embedding;
}

export async function generateRexEmbedding(rex: RexForAi): Promise<number[]> {
  // Borné à la fenêtre du modèle d'embedding : au-delà, l'API ne tronque pas,
  // elle refuse la requête.
  return generateEmbedding(buildEmbeddingInput(rex));
}
