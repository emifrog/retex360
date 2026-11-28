/**
 * @jest-environment node
 *
 * Environnement `node` : le module décide de ce qu'il écrit selon qu'il tourne
 * sur le serveur (`window` absent) ou dans le navigateur. Sous jsdom, `window`
 * est l'objet global lui-même et ne se retire pas.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { createCorrelationId } from '@/lib/logger';

describe('logger', () => {
  it("n'importe pas le module `crypto` de Node", () => {
    // `logger` est importé par des composants clients. Un import de `crypto`
    // y fait embarquer par le bundler un substitut complet pour navigateur :
    // 416 Ko (125 Ko compressés) sur toutes les pages connectées, pour un
    // identifiant de corrélation de huit caractères.
    const source = readFileSync(path.join(process.cwd(), 'src/lib/logger.ts'), 'utf8');
    expect(source).not.toMatch(/from ['"](?:node:)?crypto['"]/);
  });

  it('produit un identifiant de corrélation de huit caractères', () => {
    expect(createCorrelationId()).toMatch(/^[0-9a-z]{8}$/);
  });

  it('produit des identifiants distincts', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createCorrelationId()));
    expect(ids.size).toBe(50);
  });
});

/**
 * `logger.info` et `logger.warn` n'écrivaient rien hors développement. Les
 * traces de coût des appels au modèle, de durée des PDF et de refus de droits
 * n'existaient donc pas en production — là où l'on en a besoin.
 *
 * Sous Jest, `NODE_ENV` vaut `test` : le module se comporte comme en production.
 */
describe('logger — écriture hors développement', () => {
  type LoggerModule = typeof import('@/lib/logger');
  const g = globalThis as { window?: unknown };

  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let savedWindow: unknown;
  let sentry: { addBreadcrumb: jest.Mock; captureMessage: jest.Mock };

  /** Charge un module neuf, côté serveur (`window` absent) ou navigateur. */
  function load(side: 'serveur' | 'navigateur', nodeEnv?: string): LoggerModule {
    if (side === 'serveur') delete g.window;
    else g.window = {};
    const env = process.env as Record<string, string | undefined>;
    const previous = env.NODE_ENV;
    if (nodeEnv) env.NODE_ENV = nodeEnv;
    let mod: LoggerModule | undefined;
    jest.isolateModules(() => {
      jest.doMock('@sentry/nextjs', () => sentry);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('@/lib/logger') as LoggerModule;
    });
    env.NODE_ENV = previous;
    return mod!;
  }

  const lineOf = (spy: jest.SpyInstance) => JSON.parse(String(spy.mock.calls[0][0]));

  beforeEach(() => {
    savedWindow = g.window;
    sentry = { addBreadcrumb: jest.fn(), captureMessage: jest.fn() };
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    if (savedWindow === undefined) delete g.window;
    else g.window = savedWindow;
    jest.restoreAllMocks();
    jest.dontMock('@sentry/nextjs');
  });

  it('écrit une information sur le serveur, en une ligne exploitable', () => {
    load('serveur').logger.info('PDF generated', { rexId: 'r1', duration: '840ms' });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0]).toHaveLength(1);
    const line = lineOf(logSpy);
    expect(line).toMatchObject({
      level: 'info',
      message: 'PDF generated',
      data: { rexId: 'r1', duration: '840ms' },
    });
    expect(Date.parse(line.timestamp)).not.toBeNaN();
  });

  it('écrit un avertissement sur le serveur, et garde le fil d’Ariane Sentry', () => {
    load('serveur').logger.warn('REX delete blocked by RLS', { rexId: 'r1' });

    expect(lineOf(warnSpy)).toMatchObject({
      level: 'warn',
      message: 'REX delete blocked by RLS',
      data: { rexId: 'r1' },
    });
    expect(sentry.addBreadcrumb).toHaveBeenCalledTimes(1);
  });

  it("porte l'identifiant de corrélation", () => {
    const log = load('serveur').logger.withCorrelation('abc12345');
    log.info('PDF generated', { rexId: 'r1' });
    expect(lineOf(logSpy).correlationId).toBe('abc12345');
  });

  it("rend lisible une erreur passée en donnée, au lieu d'un objet vide", () => {
    // `JSON.stringify(new Error('x'))` vaut `{}` : la cause disparaissait.
    load('serveur').logger.warn('Photo écartée du PDF', { reason: new Error('format inconnu') });
    expect(lineOf(warnSpy).data.reason).toMatchObject({ message: 'format inconnu' });
  });

  it('ne lève pas sur une donnée qui se référence elle-même', () => {
    const loop: Record<string, unknown> = { rexId: 'r1' };
    loop.self = loop;
    expect(() => load('serveur').logger.info('Boucle', loop)).not.toThrow();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0][0])).toContain('Boucle');
  });

  it("n'écrit pas les informations dans la console du navigateur", () => {
    load('navigateur').logger.info('LLM call', { tokens: 1200 });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('écrit toujours les erreurs, et les envoie à Sentry', () => {
    load('serveur').logger.error('Erreur serveur', new Error('panne'));
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  it('garde en développement le format lisible, sans rien envoyer à Sentry', () => {
    load('serveur', 'development').logger.info('PDF generated', { rexId: 'r1' });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(String(logSpy.mock.calls[0][0])).toMatch(/^\[INFO\] /);
    expect(sentry.addBreadcrumb).not.toHaveBeenCalled();
  });
});
