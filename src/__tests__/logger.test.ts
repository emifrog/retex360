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
