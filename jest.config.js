const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Les tests RLS ont leur propre config (`jest.config.rls.js`, env node,
  // Postgres réel via PGlite) : ils sont lents et n'ont rien à faire dans la
  // boucle rapide de `npm test`.
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/src/__tests__/rls/',
  ],

  // Couverture mesurée sur `src/lib` uniquement : c'est là qu'est la logique
  // testable unitairement. Les composants sont couverts par l'usage, pas par
  // des tests unitaires — les inclure diluerait le seuil jusqu'à le rendre
  // insignifiant.
  collectCoverageFrom: ['src/lib/**/*.ts'],

  // Seuils = CLIQUET, pas objectif de qualité : ils sont calés sur le niveau
  // atteint aujourd'hui pour qu'une baisse échoue en CI. À remonter au fur et
  // à mesure que la couverture progresse.
  //
  // Exception : les modules purs qui gardent une décision d'autorisation ou
  // d'échappement sont tenus à 100 %. Ils sont petits, sans dépendance, et une
  // branche non testée y est exactement le genre de trou qui a produit les
  // régressions des lots 1 à 6.
  coverageThreshold: {
    // NB : Jest retire du groupe « global » les fichiers ayant un seuil propre
    // (les quatre à 100 % ci-dessous). Ces chiffres portent donc sur le RESTE
    // de `src/lib`, pas sur l'ensemble affiché par le rapport.
    global: { statements: 17, branches: 14, functions: 10, lines: 17 },
    'src/lib/supabase/filters.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    'src/lib/supabase/relations.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    'src/lib/sanitize.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
    'src/lib/sanitize-config.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
};

module.exports = createJestConfig(config);
