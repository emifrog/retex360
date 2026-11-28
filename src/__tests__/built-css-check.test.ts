/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import path from 'path';

/* eslint-disable @typescript-eslint/no-require-imports */
const { expectedMarkers, missingMarkers } = require('../../scripts/check-built-css.cjs') as {
  expectedMarkers: (globalsCss: string) => string[];
  missingMarkers: (markers: string[], builtCss: string) => string[];
};
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Le 28 novembre 2026, la production a servi une feuille de styles compilée à
 * partir d'une ANCIENNE version de `globals.css` : les classes utilitaires
 * nouvelles y étaient, mais ni les jetons ajoutés (`--link`), ni les règles du
 * texte riche, ni la nouvelle couleur de l'indicateur de focus. La compilation
 * avait réussi, la CI était verte, et rien ne le signalait.
 *
 * `scripts/check-built-css.cjs` tourne après chaque `next build` et le fait
 * échouer si la feuille produite ne contient pas ce que `globals.css` déclare.
 */
describe('Contrôle de la feuille de styles compilée', () => {
  const globals = `
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --radius-sm: calc(var(--radius) - 4px);
}

:root {
  --radius: 0.625rem;
  --background: #f8fafc;
  --card: #ffffff;
  --ring: #b91c1c;
  --link: #b91c1c;
  --card-alpha: rgba(255, 255, 255, 0.8);
}

.dark {
  --background: #0a0a0f;
  --ring: #f87171;
  --link: #f87171;
}

@layer components {
  .rich-text {
    font-size: 0.875rem;
  }
  .rich-text ul,
  .rich-text ol {
    padding-left: 1.5em;
  }
}

@layer utilities {
  .dark .text-primary {
    color: var(--link);
  }
}
`;

  // Ce que produit une compilation saine : espaces retirés, « #ffffff » abrégé.
  const builtOk =
    ':root{--radius:.625rem;--background:#f8fafc;--card:#fff;--ring:#b91c1c;--link:#b91c1c;--card-alpha:#fffc}' +
    '.dark{--background:#0a0a0f;--ring:#f87171;--link:#f87171}' +
    '@layer components{.rich-text{font-size:.875rem}.rich-text ul,.rich-text ol{padding-left:1.5em}}' +
    '@layer utilities{.dark .text-primary{color:var(--link)}.text-red-800{color:var(--color-red-800)}}';

  describe('expectedMarkers', () => {
    const markers = expectedMarkers(globals);

    it('attend chaque jeton de couleur avec sa valeur, pour les deux thèmes', () => {
      expect(markers).toEqual(
        expect.arrayContaining([
          '--background:#f8fafc',
          '--background:#0a0a0f',
          '--ring:#b91c1c',
          '--ring:#f87171',
          '--link:#f87171',
          '--card:#ffffff',
        ])
      );
    });

    it('attend le nom seul des jetons dont la valeur est réécrite à la compilation', () => {
      // `rgba(...)` et `0.625rem` sortent sous une autre écriture.
      expect(markers).toEqual(expect.arrayContaining(['--card-alpha', '--radius']));
      expect(markers.some((m) => m.startsWith('--card-alpha:'))).toBe(false);
    });

    it('attend les classes écrites à la main', () => {
      expect(markers).toEqual(expect.arrayContaining(['.rich-text', '.text-primary']));
    });

    it("n'attend pas les variables de `@theme`, que Tailwind retire quand elles ne servent pas", () => {
      expect(markers.some((m) => m.startsWith('--color-background'))).toBe(false);
      expect(markers.some((m) => m.startsWith('--radius-sm'))).toBe(false);
    });
  });

  describe('missingMarkers', () => {
    const markers = expectedMarkers(globals);

    it('ne signale rien sur une compilation saine, malgré les valeurs abrégées', () => {
      expect(missingMarkers(markers, builtOk)).toEqual([]);
    });

    it("signale la feuille compilée depuis l'ancienne version du fichier", () => {
      // L'incident : classes utilitaires nouvelles présentes, contenu du
      // fichier ancien — ni `--link`, ni `.rich-text`, ni la couleur de focus
      // du thème sombre.
      const stale =
        ':root{--radius:.625rem;--background:#f8fafc;--card:#fff;--ring:#b91c1c;--card-alpha:#fffc}' +
        '.dark{--background:#0a0a0f;--ring:#b91c1c}' +
        '@layer utilities{.text-red-800{color:var(--color-red-800)}.x{color:var(--link)}}';
      expect(missingMarkers(markers, stale).sort()).toEqual(
        ['--link:#b91c1c', '--link:#f87171', '--ring:#f87171', '.rich-text', '.text-primary'].sort()
      );
    });

    it('ne se laisse pas tromper par un nom qui en contient un autre', () => {
      // `--sidebar-ring` n'est pas `--ring`, `.rich-text-large` n'est pas `.rich-text`.
      const built = ':root{--sidebar-ring:#f87171}.rich-text-large{color:red}';
      const missing = missingMarkers(['--ring:#f87171', '--ring', '.rich-text'], built);
      expect(missing).toEqual(['--ring:#f87171', '--ring', '.rich-text']);
    });
  });

  it('lit bien le vrai `globals.css` (garde-fou des expressions régulières)', () => {
    const real = readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
    const markers = expectedMarkers(real);
    expect(markers.length).toBeGreaterThan(40);
    expect(markers).toEqual(
      expect.arrayContaining(['--link:#f87171', '--ring:#f87171', '.rich-text', '.text-primary'])
    );
  });
});
