const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/**
 * Tests RLS : environnement `node` (PGlite est un Postgres WASM, pas du DOM) et
 * suite séparée de `npm test` — elle applique 21 migrations à une base neuve par
 * fichier, ce qui est trop lent pour la boucle de développement.
 *
 * `npm run test:rls`
 */
/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/__tests__/rls/**/*.test.ts'],
  // Démarrage de PGlite + application des migrations : large de côté.
  testTimeout: 120000,
};

module.exports = createJestConfig(config);
