/**
 * Styles partagés des graphiques Recharts.
 *
 * Les trois graphiques écrivaient `hsl(var(--border))`, `hsl(var(--card))`,
 * `hsl(var(--muted-foreground))`. Or les jetons du thème sont des valeurs
 * hexadécimales ou `rgba(...)` complètes (`globals.css`), pas des triplets HSL :
 * `hsl(#94a3b8)` est invalide, et le navigateur retombait sur le noir par défaut
 * du SVG. C'est pour cela que les graduations des axes étaient quasi invisibles
 * sur fond sombre et que les infobulles s'affichaient sans fond.
 *
 * Les textes SVG prennent `currentColor` et héritent de la couleur du conteneur
 * (`text-muted-foreground`), ce qui suit le thème clair comme le sombre. Les
 * lignes de grille sont un gris à faible opacité, lisible sur les deux fonds.
 * Les infobulles sont du HTML : elles peuvent utiliser `var(--…)` directement.
 */
export const CHART_AXIS = {
  tick: { fontSize: 12, fill: 'currentColor' },
  line: 'rgba(148, 163, 184, 0.25)',
  grid: 'rgba(148, 163, 184, 0.18)',
} as const;

export const CHART_TOOLTIP = {
  content: {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--foreground)',
  },
  label: { color: 'var(--foreground)' },
} as const;
