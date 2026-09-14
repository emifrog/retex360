import { readFileSync } from 'fs';
import path from 'path';
import { REX_PDF_COLUMNS } from '@/lib/pdf/rex-columns';

/**
 * Le template PDF et la requête de la route d'export sont deux fichiers
 * distincts, et ils avaient divergé : `temoignages`, `description_site`,
 * `ressources_complementaires` et `numero_rex` étaient rendus par le template
 * mais absents du SELECT. Rien ne cassait — les rubriques sortaient vides, et la
 * conversion de type forcée de la route empêchait TypeScript de le voir.
 *
 * `REX_PDF_COLUMNS` est désormais la source unique : le template la déclare, la
 * route construit sa requête avec. Ces tests vérifient que la liste reste le
 * reflet fidèle de ce que le template lit vraiment, dans les deux sens.
 */
describe('Export PDF — colonnes demandées et colonnes rendues', () => {
  const TEMPLATE_PATH = path.join(process.cwd(), 'src', 'lib', 'pdf', 'rex-template.tsx');
  const ROUTE_PATH = path.join(
    process.cwd(),
    'src',
    'app',
    'api',
    'rex',
    '[id]',
    'pdf',
    'route.ts'
  );

  const templateSource = readFileSync(TEMPLATE_PATH, 'utf8');

  // Jointures PostgREST, pas des colonnes de `rex` : la route les ajoute
  // elle-même à la requête.
  const EMBEDS = ['author', 'sdis'];

  /**
   * Champs lus par le rendu, extraits du corps du composant uniquement — la
   * déclaration de `REX_PDF_COLUMNS` est en tête de fichier et ne doit pas se
   * valider elle-même.
   */
  function fieldsReadByTemplate(): string[] {
    const body = templateSource.slice(templateSource.indexOf('export function RexPdfTemplate'));
    const matches = body.match(/\brex\.([a-z_]+)/g) || [];
    const fields = matches.map((m) => m.replace('rex.', ''));
    return [...new Set(fields)].filter((f) => !EMBEDS.includes(f));
  }

  it('le template lit bien quelque chose (garde-fou de la regex)', () => {
    // Sans ça, une regex devenue muette rendrait les deux tests suivants vrais
    // par vacuité.
    expect(fieldsReadByTemplate().length).toBeGreaterThan(20);
  });

  it('toute colonne lue par le template est déclarée dans REX_PDF_COLUMNS', () => {
    const declared = new Set<string>(REX_PDF_COLUMNS);
    const missing = fieldsReadByTemplate().filter((f) => !declared.has(f));
    expect(missing).toEqual([]);
  });

  it('toute colonne déclarée est réellement lue par le template', () => {
    // L'inverse compte aussi : une colonne chargée pour rien alourdit la
    // requête et laisse croire qu'une rubrique existe.
    const read = new Set(fieldsReadByTemplate());
    const unused = REX_PDF_COLUMNS.filter((c) => !read.has(c));
    expect(unused).toEqual([]);
  });

  it("les quatre rubriques absentes de l'audit sont couvertes", () => {
    // Régression nommée : ce sont les quatre colonnes que la route ne chargeait
    // pas. Le test ci-dessus les couvre déjà ; celui-ci les ancre par leur nom.
    expect(REX_PDF_COLUMNS).toEqual(
      expect.arrayContaining([
        'temoignages',
        'description_site',
        'ressources_complementaires',
        'numero_rex',
      ])
    );
  });

  it('la route construit sa requête depuis REX_PDF_COLUMNS', () => {
    // Empêche le retour à une liste de colonnes recopiée à la main dans la
    // route, qui est précisément ce qui avait dérivé.
    const routeSource = readFileSync(ROUTE_PATH, 'utf8');
    expect(routeSource).toMatch(/\.\.\.REX_PDF_COLUMNS/);
  });
});
