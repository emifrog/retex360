/**
 * @jest-environment node
 *
 * Vérifie le câblage des deux fournisseurs — quel service est appelé, avec
 * quelle base d'URL, et ce qui se passe quand une clé manque. Aucun appel
 * réseau : le SDK est remplacé par un double.
 */

const created: Array<Record<string, unknown>> = [];
const chatCreate = jest.fn();
const embeddingsCreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: class FakeOpenAI {
      chat = { completions: { create: chatCreate } };
      embeddings = { create: embeddingsCreate };
      constructor(options: Record<string, unknown>) {
        created.push(options);
      }
    },
  };
});

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

type LlmModule = typeof import('@/lib/llm');

/** Recharge le module avec un environnement donné (les clients sont mémoïsés). */
function loadWith(env: Record<string, string | undefined>): LlmModule {
  let mod: LlmModule | undefined;
  jest.isolateModules(() => {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@/lib/llm') as LlmModule;
  });
  return mod!;
}

beforeEach(() => {
  created.length = 0;
  chatCreate.mockReset();
  embeddingsCreate.mockReset();
});

afterEach(() => {
  delete process.env.MISTRAL_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.MISTRAL_MODEL;
});

describe('Génération de texte — Mistral en direct', () => {
  it('appelle api.mistral.ai, sans passerelle intermédiaire', async () => {
    // Le point de la bascule : les contenus de REX ne transitent par aucun
    // relais hors UE.
    const llm = loadWith({ MISTRAL_API_KEY: 'k' });
    chatCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: {} });

    await llm.chatCompletion([{ role: 'user', content: 'bonjour' }]);

    expect(created[0]).toMatchObject({ baseURL: 'https://api.mistral.ai/v1', apiKey: 'k' });
  });

  it('utilise Mistral Small 4 par défaut', async () => {
    const llm = loadWith({ MISTRAL_API_KEY: 'k' });
    chatCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: {} });

    await llm.chatCompletion([{ role: 'user', content: 'x' }]);

    expect(chatCreate.mock.calls[0][0].model).toBe('mistral-small-2603');
  });

  it('accepte un modèle imposé par l’environnement', async () => {
    // Permet de passer sur Medium sans redéployer si la qualité ne suit pas.
    const llm = loadWith({ MISTRAL_API_KEY: 'k', MISTRAL_MODEL: 'mistral-medium-2604' });
    chatCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: {} });

    await llm.chatCompletion([{ role: 'user', content: 'x' }]);

    expect(chatCreate.mock.calls[0][0].model).toBe('mistral-medium-2604');
  });

  it('laisse l’appelant choisir le modèle', async () => {
    const llm = loadWith({ MISTRAL_API_KEY: 'k' });
    chatCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: {} });

    await llm.chatCompletion([{ role: 'user', content: 'x' }], {
      model: llm.MISTRAL_MODELS.LARGE,
    });

    expect(chatCreate.mock.calls[0][0].model).toBe('mistral-large-2512');
  });

  it('borne le temps d’attente sous la coupure de Vercel', async () => {
    // `vercel.json` coupe à 30 s ; le défaut du SDK est de 10 minutes.
    const llm = loadWith({ MISTRAL_API_KEY: 'k' });
    chatCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: {} });

    await llm.chatCompletion([{ role: 'user', content: 'x' }]);

    expect(created[0].timeout).toBeLessThan(30_000);
    expect(created[0].maxRetries).toBe(1);
  });

  it('échoue clairement quand la clé manque', async () => {
    const llm = loadWith({ MISTRAL_API_KEY: undefined });
    await expect(llm.chatCompletion([{ role: 'user', content: 'x' }])).rejects.toThrow(
      /MISTRAL_API_KEY/
    );
  });
});

/** Vecteur de la dimension que le schéma attend (migration 022). */
const vector1024 = () => Array.from({ length: 1024 }, () => 0.1);

describe('Embeddings — mistral-embed', () => {
  it('passe par Mistral, comme la génération de texte', async () => {
    const llm = loadWith({ MISTRAL_API_KEY: 'k' });
    embeddingsCreate.mockResolvedValue({ data: [{ embedding: vector1024() }], usage: {} });

    await llm.generateEmbedding('texte');

    expect(created[0]).toMatchObject({ baseURL: 'https://api.mistral.ai/v1', apiKey: 'k' });
    expect(embeddingsCreate.mock.calls[0][0].model).toBe('mistral-embed');
  });

  it("impose encoding_format: 'float' — sans quoi le SDK corrompt le vecteur", async () => {
    // Le SDK OpenAI demande `base64` de lui-même et décode la réponse comme
    // telle. Mistral ignore ce paramètre et renvoie un tableau de nombres : le
    // SDK interprète alors chaque flottant comme un octet et reconstruit
    // 1024 / 4 = 256 valeurs, toutes nulles. Constaté sur l'API réelle — la
    // taille ET le contenu sont faux, sans qu'aucune erreur ne soit levée.
    const llm = loadWith({ MISTRAL_API_KEY: 'k' });
    embeddingsCreate.mockResolvedValue({ data: [{ embedding: vector1024() }], usage: {} });

    await llm.generateEmbedding('texte');

    expect(embeddingsCreate.mock.calls[0][0].encoding_format).toBe('float');
  });

  it('garde le budget interactif sous la durée d’un rendu de page', () => {
    // Les pages ne figurent pas dans `vercel.json` : elles gardent la durée par
    // défaut de la plateforme, de l'ordre de 10 s, là où les routes API ont 30 s.
    // Un budget au-delà ferait tuer le rendu par l'hébergeur avant tout repli.
    expect(loadWith({}).INTERACTIVE_EMBEDDING_TIMEOUT_MS).toBeLessThan(10_000);
  });

  it('transmet le budget demandé au client', async () => {
    const llm = loadWith({ MISTRAL_API_KEY: 'k' });
    embeddingsCreate.mockResolvedValue({ data: [{ embedding: vector1024() }], usage: {} });

    await llm.generateEmbedding('texte', { timeoutMs: 1234 });

    expect(embeddingsCreate.mock.calls[0][1]).toEqual({ timeout: 1234 });
  });

  it('annonce la dimension inscrite dans le schéma', () => {
    // Sentinelle : ce chiffre, la colonne `rex.embedding` et la signature de
    // `search_rex_by_embedding` doivent bouger ensemble (migration 022).
    expect(loadWith({}).EMBEDDING_DIMENSIONS).toBe(1024);
  });

  it('refuse un vecteur dont la dimension ne correspond pas au schéma', async () => {
    // Si le fournisseur changeait sa sortie, l'insertion Postgres échouerait
    // loin d'ici : mieux vaut échouer à la source, avec le bon message.
    const llm = loadWith({ MISTRAL_API_KEY: 'k' });
    embeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }], usage: {} });

    await expect(llm.generateEmbedding('texte')).rejects.toThrow(/1024 attendues/);
  });

  it('échoue clairement quand la clé manque', async () => {
    const llm = loadWith({ MISTRAL_API_KEY: undefined });
    await expect(llm.generateEmbedding('texte')).rejects.toThrow(/MISTRAL_API_KEY/);
    expect(embeddingsCreate).not.toHaveBeenCalled();
  });

  it('borne le corpus du REX avant envoi', async () => {
    const llm = loadWith({ MISTRAL_API_KEY: 'k' });
    embeddingsCreate.mockResolvedValue({ data: [{ embedding: vector1024() }], usage: {} });

    await llm.generateRexEmbedding({ title: 'T', description: 'x'.repeat(500_000) });

    const sent = embeddingsCreate.mock.calls[0][0].input as string;
    expect(sent.length).toBeLessThan(20_000);
  });
});

describe('Disponibilité des fonctions IA', () => {
  it('signale la génération de texte comme configurée ou non', () => {
    expect(loadWith({ MISTRAL_API_KEY: 'k' }).isLlmConfigured()).toBe(true);
    expect(loadWith({ MISTRAL_API_KEY: undefined }).isLlmConfigured()).toBe(false);
  });

  it('fait dépendre les embeddings de la même clé', () => {
    // Un seul fournisseur depuis la migration 022 : une seule clé à poser.
    const llm = loadWith({ MISTRAL_API_KEY: 'k' });
    expect(llm.isEmbeddingConfigured()).toBe(true);
    expect(loadWith({ MISTRAL_API_KEY: undefined }).isEmbeddingConfigured()).toBe(false);
  });
});
