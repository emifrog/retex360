/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import path from 'path';
import { BADGE_TONES, type BadgeTone } from '@/lib/constants';

/**
 * Contrastes calculés sur les couleurs réelles : la palette de Tailwind telle
 * qu'elle est installée, et les jetons du thème dans `globals.css`.
 *
 * L'audit de novembre 2026 mesurait, en thème clair, des badges de 1,8:1
 * (« Significatif ») à 3,3:1 (« Critique ») pour 4,5:1 exigé, et un indicateur
 * de focus à 1,5:1 en thème sombre pour 3:1 exigé (RGAA 3.2 et 10.7, WCAG 1.4.3
 * et 1.4.11). Une nuance changée sans y penser fait échouer cette suite.
 */

type Rgb = [number, number, number]; // sRGB linéaire, 0..1

// --- Couleurs ------------------------------------------------------------------

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = (c: number) => Math.min(1, Math.max(0, c));

function hexToLinear(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255)) as Rgb;
}

/** OKLCH → sRGB linéaire (matrices de Björn Ottosson). */
function oklchToLinear(L: number, C: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` à l'opacité `alpha` posé sur `bg` — le navigateur compose en sRGB gamma. */
function over(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return fg.map((c, i) => toLinear(alpha * toGamma(c) + (1 - alpha) * toGamma(bg[i]))) as Rgb;
}

// --- Sources -------------------------------------------------------------------

const ROOT = process.cwd();

/** Palette de Tailwind : `--color-red-500: oklch(63.7% 0.237 25.331);` */
const palette = new Map<string, Rgb>();
{
  const css = readFileSync(path.join(ROOT, 'node_modules', 'tailwindcss', 'theme.css'), 'utf8');
  const re = /--color-([a-z]+-\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g;
  for (const m of css.matchAll(re)) {
    palette.set(m[1], oklchToLinear(Number(m[2]) / 100, Number(m[3]), Number(m[4])));
  }
}

/** Jetons du thème, par bloc (`:root` pour le clair, `.dark` pour le sombre). */
function themeTokens(selector: ':root' | '.dark'): Record<string, Rgb> {
  const css = readFileSync(path.join(ROOT, 'src', 'app', 'globals.css'), 'utf8');
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf('\n}', start));
  const tokens: Record<string, Rgb> = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    tokens[m[1]] = hexToLinear(m[2]);
  }
  return tokens;
}

const themes = { clair: themeTokens(':root'), sombre: themeTokens('.dark') };

const shade = (name: string): Rgb => {
  const color = palette.get(name);
  if (!color) throw new Error(`Nuance absente de la palette Tailwind : ${name}`);
  return color;
};

/** `text-red-800 dark:text-red-400` → nuance du thème demandé. */
function textShade(classes: string, theme: 'clair' | 'sombre'): Rgb {
  const light = /(?:^|\s)text-([a-z]+-\d+)/.exec(classes)?.[1];
  const dark = /dark:text-([a-z]+-\d+)/.exec(classes)?.[1];
  return shade(theme === 'sombre' ? (dark ?? light!) : light!);
}

/** `bg-red-500/10` → [nuance, opacité]. */
function tint(classes: string): [Rgb, number] {
  const m = /bg-([a-z]+-\d+)\/(\d+)/.exec(classes)!;
  return [shade(m[1]), Number(m[2]) / 100];
}

// --- Tests ---------------------------------------------------------------------

describe('Contrastes', () => {
  it('lit bien la palette et les jetons (garde-fou)', () => {
    // Une expression régulière devenue muette rendrait tout le reste vrai par vacuité.
    expect(palette.size).toBeGreaterThan(200);
    for (const tokens of Object.values(themes)) {
      for (const name of ['background', 'card', 'ring', 'link', 'destructive', 'foreground']) {
        expect(tokens[name]).toBeDefined();
      }
    }
    // Repère connu : noir sur blanc, 21:1.
    expect(contrast(hexToLinear('#000000'), hexToLinear('#ffffff'))).toBeCloseTo(21, 1);
    // Et une nuance de la palette, à 2 % près de sa valeur hexadécimale publiée (#ef4444).
    expect(luminance(shade('red-500'))).toBeCloseTo(luminance(hexToLinear('#ef4444')), 1);
  });

  describe.each(['clair', 'sombre'] as const)('thème %s', (theme) => {
    const tokens = themes[theme];
    // Un badge se pose sur une carte ou directement sur le fond de page.
    const surfaces = [
      ['carte', tokens.card],
      ['fond de page', tokens.background],
    ] as const;

    it.each(Object.keys(BADGE_TONES) as BadgeTone[])(
      'badge %s : texte lisible sur son fond teinté (4,5:1)',
      (tone) => {
        const { text, bg } = BADGE_TONES[tone];
        const [tintColor, alpha] = tint(bg);
        for (const [, surface] of surfaces) {
          const background = over(tintColor, alpha, surface);
          expect(contrast(textShade(text, theme), background)).toBeGreaterThanOrEqual(4.5);
        }
      }
    );

    it('indicateur de focus visible sur la carte et sur le fond (3:1)', () => {
      for (const [, surface] of surfaces) {
        expect(contrast(tokens.ring, surface)).toBeGreaterThanOrEqual(3);
      }
    });

    it('liens du texte riche lisibles (4,5:1)', () => {
      for (const [, surface] of surfaces) {
        expect(contrast(tokens.link, surface)).toBeGreaterThanOrEqual(4.5);
      }
    });

    it("messages d'erreur du formulaire lisibles (4,5:1)", () => {
      for (const [, surface] of surfaces) {
        expect(contrast(tokens.destructive, surface)).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  it("l'anneau de focus est dessiné à pleine opacité", () => {
    // `ring-ring/50` divisait le contraste par deux : 1,5:1 en thème sombre.
    const dir = path.join(ROOT, 'src', 'components', 'ui');
    const offenders = ['button', 'input', 'textarea', 'select', 'checkbox', 'tabs', 'badge']
      .map((name) => `${name}.tsx`)
      .filter((file) =>
        /focus-visible:ring-ring\/\d+/.test(readFileSync(path.join(dir, file), 'utf8'))
      );
    expect(offenders).toEqual([]);
  });
});
