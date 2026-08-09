import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "jest.config.js",
    // Même nature que jest.config.js : config CommonJS chargée par Jest.
    "jest.config.rls.js",
    // Rapport de couverture généré (déjà gitignoré).
    "coverage/**",
  ]),
]);

export default eslintConfig;
