import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

/**
 * Colonnes de `profiles` lues avec une identité utilisateur.
 *
 * La migration 024 a retiré `email` des colonnes lisibles par `authenticated`.
 * Une seule colonne interdite dans un `select` fait rejeter la requête ENTIÈRE
 * par PostgREST (« permission denied for table profiles ») : la page ne reçoit
 * alors aucun profil. C'est ce qui a vidé `/settings` et `/admin/users`, dont
 * les sélections n'avaient pas été alignées — et rien ne le signalait, puisque
 * l'erreur n'y était pas contrôlée.
 *
 * Ce test relit le code plutôt que de l'exécuter : il confronte chaque
 * `select` sur `profiles` fait par le client utilisateur aux colonnes que les
 * migrations accordent réellement. Une colonne ajoutée à une requête sans être
 * accordée fait échouer la suite avant d'atteindre un écran.
 */

const ROOT = process.cwd();
const SOURCE_DIRS = ['src/app', 'src/components', 'src/lib', 'src/hooks'];

/** Clients construits avec la clé de service : les privilèges de colonne ne les concernent pas. */
const SERVICE_CLIENTS = new Set(['admin', 'adminClient']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/** Union des colonnes accordées en lecture à `authenticated` par les migrations. */
function grantedColumns(): Set<string> {
  const dir = path.join(ROOT, 'supabase', 'migrations');
  const granted = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const sql = readFileSync(path.join(dir, file), 'utf8');
    for (const match of sql.matchAll(
      /GRANT\s+SELECT\s*\(([^)]+)\)\s+ON\s+profiles\s+TO\s+authenticated/gi
    )) {
      for (const column of match[1].split(',')) granted.add(column.trim());
    }
  }
  return granted;
}

/** Découpe une liste de sélection PostgREST sur les virgules de premier niveau. */
function topLevelItems(selection: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of selection) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      items.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  items.push(current);
  return items.map((item) => item.trim()).filter(Boolean);
}

/** Colonnes de `profiles` qu'un élément de sélection oblige à pouvoir lire. */
function columnsOf(item: string): string[] {
  // `sdis:sdis_id(code, name)` : la jointure passe par la colonne `sdis_id`.
  const embed = item.match(/^(?:\w+:)?(\w+)(?:!\w+)?\(/);
  if (embed) return embed[1].endsWith('_id') ? [embed[1]] : [];
  // `alias:colonne` ou `colonne::type`.
  return [item.replace(/^\w+:(?!:)/, '').replace(/::\w+$/, '')];
}

interface ProfileSelect {
  file: string;
  client: string;
  columns: string[];
}

function userClientSelects(): ProfileSelect[] {
  const found: ProfileSelect[] = [];
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/(\w+)\s*\.from\('profiles'\)/g)) {
        const client = match[1];
        if (SERVICE_CLIENTS.has(client)) continue;
        // La requête s'arrête au premier point-virgule.
        const statement = source.slice(match.index, source.indexOf(';', match.index));
        const select = statement.match(/\.select\(\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/);
        if (!select) continue;
        const selection = select[1] ?? select[2] ?? select[3] ?? '';
        found.push({
          file: path.relative(ROOT, file).replace(/\\/g, '/'),
          client,
          columns: topLevelItems(selection).flatMap(columnsOf),
        });
      }
    }
  }
  return found;
}

describe('lectures de `profiles` par le client utilisateur', () => {
  const granted = grantedColumns();
  const selects = userClientSelects();

  it('les migrations accordent bien une liste de colonnes (garde contre un test vide)', () => {
    expect([...granted].sort()).toEqual(
      ['avatar_url', 'created_at', 'full_name', 'grade', 'id', 'role', 'sdis_id'].sort()
    );
    expect(selects.length).toBeGreaterThan(20);
  });

  it("ne sélectionne aucune colonne que `authenticated` n'a pas le droit de lire", () => {
    const violations = selects.flatMap(({ file, columns }) =>
      columns
        .filter((column) => column === '*' || !granted.has(column))
        .map((column) => `${file} → ${column}`)
    );
    expect(violations).toEqual([]);
  });
});
