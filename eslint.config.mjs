import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";

// Accessibilité (RGAA 4.1 / WCAG 2.1 AA).
//
// `eslint-config-next` enregistre déjà le plugin jsx-a11y mais n'en active
// qu'une poignée de règles (attributs ARIA, alt-text). On reprend donc les
// règles du preset `recommended` SANS réimporter sa config — un second
// enregistrement du même plugin fait échouer ESLint — pour couvrir en plus les
// interactions clavier, les libellés de champs et les rôles, c'est-à-dire ce
// qu'un audit RGAA regarde en premier.
//
// En `error` et non `warn` : l'accessibilité est ici une obligation légale
// (décret n°2019-768) et un critère d'attribution en marché public. Un
// avertissement finit par se fondre dans le bruit ; une erreur bloque la CI.
//
// Ce linter ne couvre QUE le statique. Contrastes, parcours clavier réels et
// restitution par lecteur d'écran restent à vérifier à la main.
const a11yRules = Object.fromEntries(
  Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, "error"])
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      ...a11yRules,
      // Dépréciée par le plugin lui-même (`meta.deprecated`), remplacée par
      // `label-has-associated-control` qui reste active ci-dessus. Elle exige
      // à la fois l'imbrication ET le `htmlFor`, là où WCAG se satisfait de
      // l'un des deux : la garder ferait signaler des libellés corrects.
      "jsx-a11y/label-has-for": "off",
    },
  },
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
