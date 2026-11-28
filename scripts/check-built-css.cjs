/**
 * Contrôle de la feuille de styles compilée. Tourne après chaque `next build`
 * (script `postbuild`) et le fait échouer si la feuille produite ne contient pas
 * ce que `src/app/globals.css` déclare.
 *
 * Pourquoi : le 28 novembre 2026, la production a servi une feuille compilée à
 * partir d'une ANCIENNE version de `globals.css`. Les classes utilitaires
 * nouvelles y étaient, mais ni les jetons ajoutés (`--link`), ni les règles du
 * texte riche, ni la nouvelle couleur de l'indicateur de focus. La compilation
 * avait réussi et la CI était verte. Le cache disque de Turbopack, restauré d'un
 * déploiement à l'autre, est depuis désactivé pour les compilations
 * (`next.config.ts`) ; ce contrôle est le filet qui transforme un tel défaut,
 * s'il revenait par une autre voie, en échec visible.
 *
 * CommonJS et sans dépendance : il s'exécute avec `node` seul, là où la
 * compilation vient de tourner. Ses deux fonctions sont testées par
 * `src/__tests__/built-css-check.test.ts`.
 */
const fs = require('fs');
const path = require('path');

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Corps du premier bloc `<sélecteur> { … }` écrit en début de ligne, ou ''. */
function blockBody(css, selector) {
  const start = css.search(new RegExp(`^${selector.replace('.', '\\.')}\\s*\\{`, 'm'));
  if (start < 0) return '';
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? '' : css.slice(open + 1, close);
}

/**
 * Ce que la feuille compilée doit contenir, d'après `globals.css` :
 *
 *  - chaque jeton de `:root` et de `.dark`. Avec sa valeur quand c'est une
 *    couleur hexadécimale (`--ring:#f87171`) : c'est ce qui révèle une valeur
 *    restée ancienne. Par son nom seul sinon (`--radius`), la compilation
 *    réécrivant `rgba(...)` et les nombres ;
 *  - chaque classe écrite à la main (`.rich-text`).
 *
 * Les variables de `@theme` n'en font pas partie : Tailwind retire celles qui
 * ne servent pas.
 */
function expectedMarkers(globalsCss) {
  const css = globalsCss.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const markers = new Set();

  for (const selector of [':root', '.dark']) {
    for (const match of blockBody(css, selector).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      const value = match[2].trim();
      markers.add(HEX.test(value) ? `${match[1]}:${value.toLowerCase()}` : match[1]);
    }
  }

  for (const line of css.split('\n')) {
    const text = line.trim();
    // Ligne de sélecteur : elle ouvre une règle ou se poursuit par une virgule.
    if (!/[{,]$/.test(text) || text.startsWith('@') || text.startsWith('--')) continue;
    for (const match of text.matchAll(/\.([a-z][a-z0-9_-]*)/gi)) markers.add(`.${match[1]}`);
  }

  return [...markers];
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `#aabbcc` → `#abc` quand c'est possible : la compilation abrège les couleurs. */
function shortHex(hex) {
  const h = hex.slice(1);
  if (h.length !== 6 && h.length !== 8) return hex;
  for (let i = 0; i < h.length; i += 2) if (h[i] !== h[i + 1]) return hex;
  return `#${[...h].filter((_, i) => i % 2 === 0).join('')}`;
}

function markerPattern(marker) {
  if (marker.startsWith('.')) {
    return new RegExp(`${escapeRegExp(marker)}(?![\\w-])`);
  }
  const [name, value] = marker.split(':');
  if (!value) return new RegExp(`(?<![\\w-])${escapeRegExp(name)}\\s*:`);
  const values = [...new Set([value, shortHex(value)])].map(escapeRegExp).join('|');
  return new RegExp(`(?<![\\w-])${escapeRegExp(name)}\\s*:\\s*(?:${values})(?![0-9a-f])`, 'i');
}

/** Les repères attendus que la feuille compilée ne contient pas. */
function missingMarkers(markers, builtCss) {
  return markers.filter((marker) => !markerPattern(marker).test(builtCss));
}

function cssFilesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return cssFilesUnder(full);
    return entry.name.endsWith('.css') ? [full] : [];
  });
}

function main() {
  const root = process.cwd();
  const globals = fs.readFileSync(path.join(root, 'src', 'app', 'globals.css'), 'utf8');
  const files = cssFilesUnder(path.join(root, '.next', 'static'));

  if (files.length === 0) {
    console.error(
      'Contrôle de la feuille de styles : aucun fichier .css sous .next/static. ' +
        'La compilation a-t-elle changé de dossier de sortie ?'
    );
    process.exit(1);
  }

  const built = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const markers = expectedMarkers(globals);
  const missing = missingMarkers(markers, built);

  if (missing.length > 0) {
    console.error(
      [
        'Contrôle de la feuille de styles : ÉCHEC.',
        `La feuille compilée ne contient pas ${missing.length} élément(s) déclaré(s) dans src/app/globals.css :`,
        ...missing.map((marker) => `  - ${marker}`),
        "Elle a été produite à partir d'une autre version du fichier (cache de compilation périmé ?).",
        'Relancer la compilation sans cache avant de déployer.',
      ].join('\n')
    );
    process.exit(1);
  }

  console.log(
    `Contrôle de la feuille de styles : ${markers.length} repères de globals.css retrouvés dans ${files.length} fichier(s).`
  );
}

if (require.main === module) main();

module.exports = { expectedMarkers, missingMarkers };
