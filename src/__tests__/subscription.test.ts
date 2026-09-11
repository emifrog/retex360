/**
 * @jest-environment node
 *
 * `deriveState()` décide, pour un SDIS, s'il peut encore écrire, s'il bascule en
 * lecture seule, et quand l'accès se coupe. C'est la règle commerciale la plus
 * lourde de conséquences du produit : la couper trop tôt bloque un client à
 * jour, trop tard c'est du service non facturé.
 *
 * Elle est PURE — elle ne lit que la ligne qu'on lui passe et l'horloge. Les
 * tests figent donc l'horloge et parcourent la matrice statut × dates.
 */
import { deriveState, getSubscriptionState, READONLY_GRACE_DAYS } from '@/lib/subscription';
import { createAdminClient } from '@/lib/supabase/server';
import type { Plan, SubscriptionStatus } from '@/types';

// Le vrai module tire `next/headers` ; seul `createAdminClient` nous intéresse.
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const mockedAdminClient = createAdminClient as jest.Mock;

/** Client minimal reproduisant la chaîne `.from().select().eq().maybeSingle()`. */
function adminReturning(data: unknown) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data }) }),
      }),
    }),
  };
}

const NOW = new Date('2026-06-15T12:00:00.000Z');
const DAY = 86_400_000;

/** Date décalée de `days` par rapport à l'instant figé (négatif = passé). */
function at(days: number): string {
  return new Date(NOW.getTime() + days * DAY).toISOString();
}

function row(over: Partial<Parameters<typeof deriveState>[0]> = {}) {
  return {
    plan: 'essentiel' as Plan,
    status: 'active' as SubscriptionStatus,
    suspended_reason: null,
    trial_ends_at: null,
    current_period_start: null,
    current_period_end: null,
    max_users: null,
    max_rex_per_month: null,
    ...over,
  };
}

beforeAll(() => {
  jest.useFakeTimers({ now: NOW });
});

afterAll(() => {
  jest.useRealTimers();
});

describe('deriveState — abonnement en cours', () => {
  it('laisse écrire un abonnement actif dont la période court encore', () => {
    const s = deriveState(row({ status: 'active', current_period_end: at(120) }));
    expect(s).toMatchObject({ mode: 'active', canWrite: true, effective: 'active' });
    expect(s.daysLeft).toBeNull();
    expect(s.graceEndsAt).toBeNull();
  });

  it('laisse écrire un abonnement actif sans date de fin (période ouverte)', () => {
    // Pas de date => rien à comparer => aucune expiration n'est dérivée.
    const s = deriveState(row({ status: 'active', current_period_end: null }));
    expect(s).toMatchObject({ mode: 'active', canWrite: true });
  });

  it('laisse écrire un essai en cours et annonce les jours restants', () => {
    const s = deriveState(row({ status: 'trial', trial_ends_at: at(7) }));
    expect(s).toMatchObject({ mode: 'trial', canWrite: true, effective: 'trial' });
    expect(s.daysLeft).toBe(7);
  });

  it('laisse écrire un essai sans date de fin, sans compte à rebours', () => {
    const s = deriveState(row({ status: 'trial', trial_ends_at: null }));
    expect(s).toMatchObject({ mode: 'trial', canWrite: true, daysLeft: null });
  });

  it('remonte le plan et les quotas du plan sans les interpréter', () => {
    const s = deriveState(
      row({ plan: 'premium', status: 'active', max_users: 50, max_rex_per_month: 200 })
    );
    expect(s).toMatchObject({ plan: 'premium', maxUsers: 50, maxRexPerMonth: 200 });
  });
});

describe('deriveState — suspension', () => {
  it('coupe l’écriture immédiatement, sans période de grâce', () => {
    const s = deriveState(
      row({ status: 'suspended', suspended_reason: 'Impayé', current_period_end: at(100) })
    );
    expect(s).toMatchObject({
      mode: 'readonly',
      canWrite: false,
      effective: 'suspended',
      suspendedReason: 'Impayé',
    });
    // Une suspension n'ouvre pas de compte à rebours : elle dure jusqu'à levée.
    expect(s.daysLeft).toBeNull();
    expect(s.graceEndsAt).toBeNull();
  });

  it('prime sur une période encore valide', () => {
    const s = deriveState(row({ status: 'suspended', current_period_end: at(365) }));
    expect(s.canWrite).toBe(false);
  });
});

describe('deriveState — expiration dérivée à la lecture', () => {
  it('traite comme expiré un abonnement encore marqué actif mais dont la période est passée', () => {
    // Pas de tâche planifiée : l'expiration est déduite des dates à chaque lecture.
    const s = deriveState(row({ status: 'active', current_period_end: at(-1) }));
    expect(s.status).toBe('active');
    expect(s.effective).toBe('expired');
    expect(s.canWrite).toBe(false);
  });

  it('traite comme expiré un essai encore marqué en essai mais échu', () => {
    const s = deriveState(row({ status: 'trial', trial_ends_at: at(-1) }));
    expect(s.status).toBe('trial');
    expect(s.effective).toBe('expired');
  });

  it("n'expire pas un essai à cause d'une période d'abonnement passée", () => {
    // Seule la date correspondant au statut sert de référence.
    const s = deriveState(
      row({ status: 'trial', trial_ends_at: at(10), current_period_end: at(-10) })
    );
    expect(s).toMatchObject({ mode: 'trial', canWrite: true });
  });
});

describe('deriveState — période de grâce en lecture seule', () => {
  it('accorde la grâce après une période échue et décompte les jours', () => {
    const s = deriveState(row({ status: 'active', current_period_end: at(-10) }));
    expect(s).toMatchObject({ mode: 'readonly', canWrite: false, effective: 'expired' });
    expect(s.daysLeft).toBe(READONLY_GRACE_DAYS - 10);
    expect(s.graceEndsAt).toBe(at(READONLY_GRACE_DAYS - 10));
  });

  it('accorde la même grâce après un essai échu', () => {
    const s = deriveState(row({ status: 'trial', trial_ends_at: at(-5) }));
    expect(s).toMatchObject({ mode: 'readonly', canWrite: false });
    expect(s.daysLeft).toBe(READONLY_GRACE_DAYS - 5);
  });

  it('bloque une fois la grâce écoulée', () => {
    const s = deriveState(
      row({ status: 'active', current_period_end: at(-READONLY_GRACE_DAYS - 1) })
    );
    expect(s).toMatchObject({ mode: 'blocked', canWrite: false });
    expect(s.daysLeft).toBeNull();
    expect(s.graceEndsAt).toBe(at(-1));
  });

  it('bloque exactement au terme de la grâce, pas un instant avant', () => {
    // Bornes : la veille du terme on lit encore, au terme on ne lit plus.
    const veille = deriveState(
      row({ status: 'active', current_period_end: at(-READONLY_GRACE_DAYS + 1) })
    );
    expect(veille.mode).toBe('readonly');

    const terme = deriveState(
      row({ status: 'active', current_period_end: at(-READONLY_GRACE_DAYS) })
    );
    expect(terme.mode).toBe('blocked');
  });
});

describe('deriveState — expiration posée à la main par le super-admin', () => {
  it('bloque immédiatement quand aucune date n’ancre la grâce', () => {
    const s = deriveState(row({ status: 'expired' }));
    expect(s).toMatchObject({ mode: 'blocked', canWrite: false, graceEndsAt: null });
  });

  it('accorde la grâce quand une période de référence existe', () => {
    const s = deriveState(row({ status: 'expired', current_period_end: at(-3) }));
    expect(s).toMatchObject({ mode: 'readonly', canWrite: false });
    expect(s.daysLeft).toBe(READONLY_GRACE_DAYS - 3);
  });

  it("bloque un essai passé à « expired » à la main, même avec une date d'essai récente", () => {
    // Comportement ACTUEL, documenté ici parce qu'il est asymétrique : l'ancrage
    // de la grâce ne suit `trial_ends_at` que si le statut est resté 'trial'.
    // Basculer manuellement le statut à 'expired' fait donc perdre la grâce que
    // la même échéance aurait accordée en expirant d'elle-même.
    const auto = deriveState(row({ status: 'trial', trial_ends_at: at(-3) }));
    expect(auto.mode).toBe('readonly');

    const manuel = deriveState(row({ status: 'expired', trial_ends_at: at(-3) }));
    expect(manuel.mode).toBe('blocked');
  });
});

describe('getSubscriptionState — SDIS non géré et panne de lecture', () => {
  beforeEach(() => {
    mockedAdminClient.mockReset();
  });

  it('laisse écrire un SDIS sans abonnement rattaché', async () => {
    // Une référence non onboardée n'est pas un client en défaut de paiement :
    // court-circuit avant toute lecture.
    const s = await getSubscriptionState(null);
    expect(s).toMatchObject({ hasSubscription: false, mode: 'active', canWrite: true });
    expect(mockedAdminClient).not.toHaveBeenCalled();
  });

  it('laisse écrire quand aucun identifiant de SDIS n’est fourni', async () => {
    expect(await getSubscriptionState(undefined)).toMatchObject({ canWrite: true });
  });

  it('laisse écrire un SDIS dont aucune ligne d’abonnement n’existe', async () => {
    mockedAdminClient.mockReturnValue(adminReturning(null));
    const s = await getSubscriptionState('sdis-06');
    expect(s).toMatchObject({ hasSubscription: false, canWrite: true });
  });

  it('interprète la ligne lue', async () => {
    mockedAdminClient.mockReturnValue(
      adminReturning(row({ status: 'suspended', suspended_reason: 'Impayé' }))
    );
    const s = await getSubscriptionState('sdis-06');
    expect(s).toMatchObject({
      hasSubscription: true,
      mode: 'readonly',
      canWrite: false,
      suspendedReason: 'Impayé',
    });
  });

  it('laisse écrire si la lecture d’abonnement échoue (fail-open assumé)', async () => {
    // Choix délibéré : une panne d'infrastructure ne doit pas mettre en lecture
    // seule des clients à jour. Le risque inverse — du service non facturé
    // pendant l'incident — est jugé préférable. Ce test est là pour qu'un
    // basculement en fail-closed soit une décision, pas un effet de bord.
    mockedAdminClient.mockImplementation(() => {
      throw new Error('Supabase injoignable');
    });
    const s = await getSubscriptionState('sdis-06');
    expect(s).toMatchObject({ hasSubscription: false, mode: 'active', canWrite: true });
  });
});
