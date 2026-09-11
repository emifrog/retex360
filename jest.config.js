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
    global: { statements: 21, branches: 18, functions: 15, lines: 21 },
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
    'src/lib/file-signature.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
    // `deriveState` décide qui peut écrire et quand l'accès se coupe : même
    // exigence que les modules d'autorisation ci-dessus.
    'src/lib/subscription.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
    // Règle de promotion DGSCGC. Les statements manquantes sont les déclarations
    // des schémas exportés, exercées via `validateRexByType` plutôt que
    // référencées directement — d'où 100 % sur les branches, fonctions et
    // lignes, et un seuil de statements calé sur l'existant.
    'src/lib/validators/rex.ts': { statements: 81, branches: 100, functions: 100, lines: 100 },
  },
};

module.exports = createJestConfig(config);
