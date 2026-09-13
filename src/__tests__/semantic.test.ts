/**
 * @jest-environment node
 *
 * Le module décide de deux choses qui ne se voient pas à l'exécution : quand on
 * bascule sur le plein texte plutôt que d'afficher une page vide, et si une
 * indexation ratée peut faire échouer la validation d'un REX. Les deux se
 * dégradent en silence.
 */
const generateEmbedding = jest.fn();
const generateRexEmbedding = jest.fn();
const isEmbeddingConfigured = jest.fn();
const createAdminClient = jest.fn();

jest.mock('@/lib/llm', () => ({
  generateEmbedding: (...args: unknown[]) => generateEmbedding(...args),
  generateRexEmbedding: (...args: unknown[]) => generateRexEmbedding(...args),
  isEmbeddingConfigured: () => isEmbeddingConfigured(),
  // Littéral, et non une constante du fichier : `jest.mock` est remonté
  // au-dessus des déclarations, qui ne sont donc pas encore initialisées ici.
  INTERACTIVE_EMBEDDING_TIMEOUT_MS: 5_000,
}));

/** Doit refléter le littéral ci-dessus. La VRAIE valeur est vérifiée par `llm.test.ts`. */
const MOCK_TIMEOUT_MS = 5_000;
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => createAdminClient(),
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { semanticMatches, indexRexForSearch, SEMANTIC_MATCH_LIMIT } from '@/lib/semantic';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Client minimal exposant seulement `rpc`. */
function clientWithRpc(result: { data?: unknown; error?: { message: string } }) {
  return { rpc: jest.fn().mockResolvedValue(result) } as unknown as SupabaseClient;
}

beforeEach(() => {
  jest.clearAllMocks();
  isEmbeddingConfigured.mockReturnValue(true);
});

describe('semanticMatches — classement et repli', () => {
  it('rend les identifiants dans l’ordre rendu par la base', async () => {
    // Cet ordre EST le résultat : il porte la pertinence, que rien d'autre ne
    // reconstitue ensuite.
    const supabase = clientWithRpc({ data: [{ id: 'b' }, { id: 'a' }, { id: 'c' }] });
    generateEmbedding.mockResolvedValue([0.1]);

    expect(await semanticMatches(supabase, 'feu de hangar')).toEqual(['b', 'a', 'c']);
  });

  it('impose un budget d’attente au lieu de laisser courir le défaut', async () => {
    // `vercel.json` n'accorde 30 s qu'aux routes API ; une PAGE garde la durée
    // par défaut de la plateforme, de l'ordre de 10 s. Laisser courir le
    // timeout par défaut du client ferait tuer le rendu par l'hébergeur AVANT
    // que le try/catch ci-dessus ne s'exécute — donc sans repli possible, et
    // avec une erreur de Server Component opaque à la clé.
    const supabase = clientWithRpc({ data: [] });
    generateEmbedding.mockResolvedValue([0.1]);

    await semanticMatches(supabase, 'feu');

    expect(generateEmbedding.mock.calls[0][1]).toEqual({ timeoutMs: MOCK_TIMEOUT_MS });
  });

  it('demande plus de résultats qu’une page n’en affiche', async () => {
    // Les filtres (type, SDIS, dates, tags) s'appliquent APRÈS : un plafond
    // trop bas les ferait porter sur un échantillon déjà tronqué.
    const supabase = clientWithRpc({ data: [] });
    generateEmbedding.mockResolvedValue([0.1]);

    await semanticMatches(supabase, 'feu');

    const call = (supabase.rpc as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('search_rex_by_embedding');
    expect(call[1].match_count).toBe(SEMANTIC_MATCH_LIMIT);
    expect(SEMANTIC_MATCH_LIMIT).toBeGreaterThan(10);
  });

  it('distingue « rien trouvé » de « voie indisponible »', async () => {
    // Les deux mènent au repli, mais seul le second est une anomalie — et
    // l'appelant doit pouvoir le dire à l'utilisateur.
    const supabase = clientWithRpc({ data: [] });
    generateEmbedding.mockResolvedValue([0.1]);
    expect(await semanticMatches(supabase, 'x')).toEqual([]);

    isEmbeddingConfigured.mockReturnValue(false);
    expect(await semanticMatches(supabase, 'x')).toBeNull();
  });

  it('ne calcule aucun embedding quand la clé manque', async () => {
    isEmbeddingConfigured.mockReturnValue(false);
    await semanticMatches(clientWithRpc({ data: [] }), 'x');
    expect(generateEmbedding).not.toHaveBeenCalled();
  });

  it('signale l’indisponibilité quand la fonction SQL est en erreur', async () => {
    const supabase = clientWithRpc({ error: { message: 'function does not exist' } });
    generateEmbedding.mockResolvedValue([0.1]);
    expect(await semanticMatches(supabase, 'x')).toBeNull();
  });

  it('signale l’indisponibilité quand le fournisseur est injoignable', async () => {
    const supabase = clientWithRpc({ data: [] });
    generateEmbedding.mockRejectedValue(new Error('timeout'));
    expect(await semanticMatches(supabase, 'x')).toBeNull();
  });
});

describe('indexRexForSearch — ne doit jamais faire échouer la validation', () => {
  function adminClient(rex: unknown, updateError?: { message: string }) {
    const update = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: updateError ?? null }),
    });
    return {
      client: {
        from: () => ({
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: rex, error: null }) }) }),
          update,
        }),
      },
      update,
    };
  }

  it('calcule et enregistre l’embedding du REX', async () => {
    const { client, update } = adminClient({ id: 'r1', title: 'Feu' });
    createAdminClient.mockReturnValue(client);
    generateRexEmbedding.mockResolvedValue([0.1, 0.2]);

    await indexRexForSearch('r1');

    expect(generateRexEmbedding).toHaveBeenCalledWith({ id: 'r1', title: 'Feu' });
    expect(update).toHaveBeenCalledWith({ embedding: [0.1, 0.2] });
  });

  it('ne lève pas quand le calcul échoue', async () => {
    // La validation a déjà eu lieu : l'indexation est une donnée dérivée, elle
    // sera rattrapée par le script de régénération.
    const { client } = adminClient({ id: 'r1' });
    createAdminClient.mockReturnValue(client);
    generateRexEmbedding.mockRejectedValue(new Error('quota dépassé'));

    await expect(indexRexForSearch('r1')).resolves.toBeUndefined();
  });

  it('ne lève pas quand l’écriture échoue', async () => {
    const { client } = adminClient({ id: 'r1' }, { message: 'dimension mismatch' });
    createAdminClient.mockReturnValue(client);
    generateRexEmbedding.mockResolvedValue([0.1]);

    await expect(indexRexForSearch('r1')).resolves.toBeUndefined();
  });

  it('ne lève pas quand le REX est introuvable', async () => {
    const { client } = adminClient(null);
    createAdminClient.mockReturnValue(client);

    await expect(indexRexForSearch('inconnu')).resolves.toBeUndefined();
    expect(generateRexEmbedding).not.toHaveBeenCalled();
  });

  it('ne touche à rien quand la clé manque', async () => {
    isEmbeddingConfigured.mockReturnValue(false);

    await indexRexForSearch('r1');

    expect(createAdminClient).not.toHaveBeenCalled();
    expect(generateRexEmbedding).not.toHaveBeenCalled();
  });
});
