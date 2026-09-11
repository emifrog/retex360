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

describe('Embeddings — OpenAI tant que le schéma est en 1536 dimensions', () => {
  it('appelle OpenAI, pas Mistral', async () => {
    // `mistral-embed` renvoie 1024 dimensions : incompatible avec la colonne
    // `rex.embedding` sans migration ni régénération.
    const llm = loadWith({ MISTRAL_API_KEY: 'k', OPENAI_API_KEY: 'o' });
    embeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.1] }], usage: {} });

    await llm.generateEmbedding('texte');

    expect(created[0]).toMatchObject({ apiKey: 'o' });
    expect(created[0].baseURL).toBeUndefined();
    expect(embeddingsCreate.mock.calls[0][0].model).toBe('text-embedding-3-small');
  });

  it('annonce la dimension attendue par le schéma', () => {
    // Sentinelle : si ce chiffre change, la migration SQL doit suivre.
    const llm = loadWith({});
    expect(llm.EMBEDDING_DIMENSIONS).toBe(1536);
  });

  it('échoue immédiatement sans clé, au lieu d’un aller-retour voué à l’échec', async () => {
    // Le code appelait auparavant un endpoint d'embeddings OpenRouter que son
    // propre commentaire reconnaissait comme non supporté.
    const llm = loadWith({ OPENAI_API_KEY: undefined });
    await expect(llm.generateEmbedding('texte')).rejects.toThrow(/OPENAI_API_KEY/);
    expect(embeddingsCreate).not.toHaveBeenCalled();
  });

  it('borne aussi le corpus du REX avant envoi', async () => {
    const llm = loadWith({ OPENAI_API_KEY: 'o' });
    embeddingsCreate.mockResolvedValue({ data: [{ embedding: [0.1] }], usage: {} });

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

  it('signale les embeddings indépendamment de la génération de texte', () => {
    // Les deux fournisseurs sont dissociés : l'un peut manquer sans l'autre.
    const llm = loadWith({ MISTRAL_API_KEY: 'k', OPENAI_API_KEY: undefined });
    expect(llm.isLlmConfigured()).toBe(true);
    expect(llm.isEmbeddingConfigured()).toBe(false);
  });
});
