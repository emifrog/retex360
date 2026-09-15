/**
 * Préparation du jeu de démonstration : nettoyage puis enrichissement.
 *
 *   npx tsx --env-file=.env supabase/maintenance/prepare_demo.ts            # SIMULATION (par défaut)
 *   npx tsx --env-file=.env supabase/maintenance/prepare_demo.ts --apply    # écrit réellement
 *   npx tsx --env-file=.env supabase/maintenance/prepare_demo.ts --apply --no-delete
 *   npx tsx --env-file=.env supabase/maintenance/prepare_demo.ts --apply --promote-demo
 *
 * SIMULATION PAR DÉFAUT, et ce n'est pas une précaution de principe : ce script
 * s'exécute avec la clé de service, donc hors RLS, sur la base réelle. Il
 * SUPPRIME des REX. Relisez le plan affiché avant d'ajouter `--apply`.
 *
 * Ce qu'il fait, dans l'ordre :
 *
 *   1. DOUBLONS — regroupe les REX décrivant le même sinistre (comparaison par
 *      ensemble de mots significatifs, pas par chaîne exacte : « Accident TMD
 *      sur A8 — Produit initialement non identifié » et « Accident TMD A8 -
 *      Produit inconnu » sont le même événement). Garde le plus fourni de chaque
 *      groupe, supprime les autres. `--no-delete` s'arrête au rapport.
 *
 *   2. ENRICHISSEMENT — complète les REX dépourvus de chronologie, de
 *      prescriptions, de chiffres clés ou de témoignages. Le contenu est choisi
 *      selon le thème détecté dans le titre. Rien n'est écrasé : seules les
 *      rubriques VIDES sont remplies.
 *
 *   3. NUMÉROTATION — attribue un `numero_rex` aux REX validés qui n'en ont pas.
 *      Le trigger `generate_numero_rex` (migration 011) ne se déclenche qu'à la
 *      TRANSITION vers `validated` ; les REX insérés directement validés par le
 *      rôle service n'en ont donc jamais reçu. La numérotation reprend le format
 *      du trigger et la numérotation existante du SDIS.
 *
 *   4. `--promote-demo` — passe `demo@retex360.fr` en `super_admin`.
 *      À NE FAIRE QU'APRÈS avoir changé son mot de passe et l'avoir retiré du
 *      README : les identifiants y sont publiés, et un super_admin voit tous les
 *      SDIS. Le script refuse de promouvoir sans `--i-understand-demo-is-public`.
 *
 * CE QUE LE SCRIPT NE FAIT PAS. Il n'ajoute aucune pièce jointe : les fichiers
 * vivent dans le stockage privé, avec contrôle de signature, et ils se déposent
 * depuis l'interface. Prévoyez deux ou trois photos à la main — une fiche de
 * retour d'expérience sans visuel se voit en démonstration.
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const APPLY = process.argv.includes('--apply');
const NO_DELETE = process.argv.includes('--no-delete');
const PROMOTE = process.argv.includes('--promote-demo');
const PROMOTE_ACK = process.argv.includes('--i-understand-demo-is-public');
const DEMO_EMAIL = 'demo@retex360.fr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Types minimaux (miroir de src/types) — le script ne dépend pas de l'app.
// ---------------------------------------------------------------------------
interface RexRow {
  id: string;
  title: string;
  status: string;
  visibility: string;
  type_production: string | null;
  sdis_id: string;
  intervention_date: string | null;
  numero_rex: string | null;
  views_count: number | null;
  prescriptions: unknown;
  chronologie: unknown;
  temoignages: unknown;
  key_figures: unknown;
  focus_thematiques: unknown;
  ressources_complementaires: unknown;
}

type Enrichment = {
  chronologie: unknown[];
  prescriptions: unknown[];
  temoignages: unknown[];
  key_figures: Record<string, unknown>;
};

const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
const hasKeys = (v: unknown) => !!v && typeof v === 'object' && Object.keys(v).length > 0;

/** Nombre de blocs réellement affichés par la fiche — sert à départager les doublons. */
function richness(r: RexRow): number {
  return (
    len(r.prescriptions) +
    len(r.chronologie) +
    len(r.temoignages) +
    len(r.focus_thematiques) +
    len(r.ressources_complementaires) +
    (hasKeys(r.key_figures) ? 1 : 0)
  );
}

// ---------------------------------------------------------------------------
// 1. Détection de doublons
// ---------------------------------------------------------------------------
const STOP_WORDS = new Set([
  'avec',
  'dans',
  'pour',
  'sous',
  'entre',
  'leur',
  'plus',
  'sans',
  'zone',
  'secteur',
]);

/** Mots significatifs d'un titre : sans accents, sans ponctuation, sans mots vides. */
function tokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

const DUPLICATE_THRESHOLD = 0.45;
/** En dessous du seuil mais assez proche pour mériter un œil humain. */
const NEAR_MISS_THRESHOLD = 0.3;

function groupDuplicates(rows: RexRow[]): {
  groups: RexRow[][];
  nearMisses: { a: RexRow; b: RexRow; score: number }[];
} {
  const groups: RexRow[][] = [];
  const placed = new Set<string>();
  const nearMisses: { a: RexRow; b: RexRow; score: number }[] = [];

  for (const row of rows) {
    if (placed.has(row.id)) continue;
    const group = [row];
    placed.add(row.id);
    for (const other of rows) {
      if (placed.has(other.id)) continue;
      const score = jaccard(tokens(row.title), tokens(other.title));
      if (score >= DUPLICATE_THRESHOLD) {
        group.push(other);
        placed.add(other.id);
      } else if (score >= NEAR_MISS_THRESHOLD) {
        // Deux fiches peuvent décrire le même sinistre avec des mots très
        // différents — « Produit initialement non identifié » et « Produit
        // inconnu » ne partagent presque rien. Plutôt que d'abaisser le seuil
        // et de risquer de supprimer deux REX réellement distincts, on les
        // signale : la décision revient à quelqu'un qui connaît les faits.
        nearMisses.push({ a: row, b: other, score });
      }
    }
    if (group.length > 1) groups.push(group);
  }
  return { groups, nearMisses };
}

// ---------------------------------------------------------------------------
// 2. Contenu d'enrichissement, par thème
// ---------------------------------------------------------------------------
const ev = (heure: string, type: string, titre: string, description?: string) => ({
  id: randomUUID(),
  heure,
  type,
  titre,
  ...(description ? { description } : {}),
});

const presc = (
  categorie: string,
  description: string,
  responsable: string,
  echeance: string,
  statut: string
) => ({ id: randomUUID(), categorie, description, responsable, echeance, statut });

const temoin = (auteur_fonction: string, citation: string, contexte?: string) => ({
  id: randomUUID(),
  auteur_fonction,
  citation,
  ...(contexte ? { contexte } : {}),
});

const THEMES: { match: RegExp; label: string; build: () => Enrichment }[] = [
  {
    match: /for[eê]t|est[eé]rel|feux de for/i,
    label: 'feu de forêt',
    build: () => ({
      chronologie: [
        ev('14:05', 'alerte', 'Départ de feu signalé', 'Alerte donnée par la vigie du massif.'),
        ev('14:19', 'arrivee', 'Premier groupe d’intervention sur zone'),
        ev('14:40', 'action', 'Établissement de la ligne d’appui', 'Appui sur la piste DFCI.'),
        ev('15:25', 'message_radio', 'Demande de renfort aérien'),
        ev('17:10', 'action', 'Feu maîtrisé sur le flanc est'),
        ev('21:30', 'fin', 'Extinction, passage en surveillance'),
      ],
      prescriptions: [
        presc(
          'operations',
          'Systématiser le point de situation à 30 minutes lorsque deux départs simultanés sont déclarés sur le même massif.',
          'Bureau opérations',
          '2026-11-30',
          'en_cours'
        ),
        presc(
          'technique',
          'Vérifier l’accessibilité des citernes DFCI du secteur avant chaque saison.',
          'Groupement technique',
          '2027-04-15',
          'a_faire'
        ),
        presc(
          'formation',
          'Intégrer le retour au module feux de forêt de la formation de chef de groupe.',
          'Service formation',
          '2026-12-15',
          'fait'
        ),
      ],
      temoignages: [
        temoin(
          'Chef de groupe',
          'Le vent a tourné en moins de dix minutes. Sans la ligne d’appui établie en amont, nous perdions le flanc est.',
          'Entretien à froid, une semaine après l’intervention'
        ),
      ],
      key_figures: {
        nb_sp_engages: 64,
        duree_intervention: '7 h 25',
        nb_vehicules: 18,
        surface_sinistree: '34 hectares',
        nb_personnes_evacuees: 40,
        sdis_impliques: ['06', '83'],
        bilan_humain: { impliques: 2 },
      },
    }),
  },
  {
    match: /tmd|mati[eè]res? dangereuses?|chimique|ammoniac/i,
    label: 'risque chimique / TMD',
    build: () => ({
      chronologie: [
        ev('08:42', 'alerte', 'Appel du 18', 'Fuite signalée sur un poids lourd.'),
        ev('08:56', 'arrivee', 'Reconnaissance à distance', 'Périmètre de sécurité à 100 mètres.'),
        ev('09:20', 'action', 'Identification du produit', 'Lecture du code danger et du panneau orange.'),
        ev('09:45', 'message_radio', 'Engagement de la CMIC'),
        ev('11:30', 'action', 'Colmatage et transvasement'),
        ev('14:05', 'fin', 'Levée du périmètre'),
      ],
      prescriptions: [
        presc(
          'operations',
          'Ne lever le périmètre qu’après double mesure concordante, à dix minutes d’intervalle.',
          'Bureau opérations',
          '2026-10-31',
          'fait'
        ),
        presc(
          'technique',
          'Doter les VLR de chef de groupe de détecteurs multigaz portatifs.',
          'Groupement technique',
          '2026-12-31',
          'en_cours'
        ),
        presc(
          'prevention',
          'Recenser les établissements du secteur stockant le produit concerné et mettre à jour les plans ETARE.',
          'Service prévision',
          '2027-01-31',
          'a_faire'
        ),
        presc(
          'formation',
          'Exercice conjoint annuel avec l’exploitant du site.',
          'Service formation',
          '2027-03-31',
          'a_faire'
        ),
      ],
      temoignages: [
        temoin(
          'Chef d’agrès CMIC',
          'Le panneau orange était illisible côté conducteur. Nous avons perdu vingt minutes à identifier le produit.',
          'Débriefing à chaud'
        ),
        temoin(
          'Officier de garde',
          'La coordination avec la gendarmerie sur la fermeture de l’axe a très bien fonctionné.',
          'Retour écrit'
        ),
      ],
      key_figures: {
        nb_sp_engages: 38,
        duree_intervention: '5 h 23',
        nb_vehicules: 12,
        nb_personnes_evacuees: 120,
        sdis_impliques: ['06'],
        bilan_humain: { impliques: 3, victimes_urgence_relative: 1 },
      },
    }),
  },
  {
    match: /parking|souterrain|effondrement/i,
    label: 'espace clos / effondrement',
    build: () => ({
      chronologie: [
        ev('19:12', 'alerte', 'Alerte pour effondrement partiel'),
        ev('19:24', 'arrivee', 'Premiers engins sur les lieux'),
        ev('19:40', 'action', 'Reconnaissance sous ARI aux niveaux -1 et -2'),
        ev('20:05', 'message_radio', 'Demande du groupe sauvetage-déblaiement'),
        ev('22:15', 'action', 'Étaiement de la zone instable'),
        ev('01:40', 'fin', 'Structure sécurisée, site remis à l’exploitant'),
      ],
      prescriptions: [
        presc(
          'operations',
          'Mesurer le tirage avant toute ventilation mécanique en espace clos à pente.',
          'Bureau opérations',
          '2026-11-15',
          'fait'
        ),
        presc(
          'prevention',
          'Mettre à jour le plan ETARE avec les niveaux inférieurs et les accès pompiers.',
          'Service prévision',
          '2027-02-28',
          'en_cours'
        ),
        presc(
          'technique',
          'Compléter la dotation en matériel d’étaiement du groupement centre.',
          'Groupement technique',
          '2027-01-15',
          'a_faire'
        ),
      ],
      temoignages: [
        temoin(
          'Chef de colonne',
          'Le désenfumage naturel n’a rien donné aux deux niveaux inférieurs. Il a fallu ventiler mécaniquement depuis la rampe.',
          'Débriefing à chaud'
        ),
      ],
      key_figures: {
        nb_sp_engages: 52,
        duree_intervention: '6 h 28',
        nb_vehicules: 15,
        nb_personnes_evacuees: 85,
        sdis_impliques: ['06'],
        bilan_humain: { impliques: 4, victimes_urgence_relative: 2 },
      },
    }),
  },
  {
    match: /crue|inondation|ouv[eè]ze|vaison/i,
    label: 'inondation',
    build: () => ({
      chronologie: [
        ev('16:30', 'alerte', 'Vigilance rouge, premières interventions'),
        ev('17:05', 'arrivee', 'Armement du poste de commandement'),
        ev('18:20', 'action', 'Sauvetages par embarcation sur le secteur bas'),
        ev('20:45', 'message_radio', 'Renfort du groupe d’intervention aquatique'),
        ev('23:50', 'action', 'Décrue amorcée, bascule sur les épuisements'),
        ev('06:15', 'fin', 'Fin des sauvetages, relève engagée'),
      ],
      prescriptions: [
        presc(
          'operations',
          'Pré-positionner les embarcations dès le passage en vigilance orange, sans attendre le premier appel.',
          'Bureau opérations',
          '2026-12-31',
          'en_cours'
        ),
        presc(
          'prevention',
          'Cartographier les points de mise à l’eau praticables en crue sur le bassin.',
          'Service prévision',
          '2027-03-31',
          'a_faire'
        ),
      ],
      temoignages: [
        temoin(
          'Chef d’unité SAV',
          'La montée a été plus rapide que toutes nos hypothèses. Une heure entre l’alerte et le premier sauvetage.',
          'Entretien à froid'
        ),
      ],
      key_figures: {
        nb_sp_engages: 71,
        duree_intervention: '13 h 45',
        nb_vehicules: 22,
        nb_personnes_evacuees: 160,
        sdis_impliques: ['84', '06'],
        bilan_humain: { impliques: 12, victimes_urgence_relative: 3 },
      },
    }),
  },
  {
    match: /commercial|erp|valentine|magasin/i,
    label: 'établissement recevant du public',
    build: () => ({
      chronologie: [
        ev('11:48', 'alerte', 'Déclenchement de l’alarme incendie'),
        ev('11:59', 'arrivee', 'Prise de contact avec le service sécurité'),
        ev('12:10', 'action', 'Évacuation générale confirmée'),
        ev('12:35', 'action', 'Attaque du foyer en réserve'),
        ev('13:20', 'message_radio', 'Feu circonscrit'),
        ev('15:00', 'fin', 'Rétablissement des installations de sécurité'),
      ],
      prescriptions: [
        presc(
          'prevention',
          'Revoir avec l’exploitant le délai de levée de doute avant transmission de l’alarme.',
          'Service prévision',
          '2026-11-30',
          'fait'
        ),
        presc(
          'operations',
          'Systématiser la prise de contact avec le PC sécurité avant engagement en ERP de type M.',
          'Bureau opérations',
          '2027-01-31',
          'en_cours'
        ),
        presc(
          'formation',
          'Manœuvre annuelle sur site avec le personnel de sécurité de l’établissement.',
          'Service formation',
          '2027-05-31',
          'a_faire'
        ),
      ],
      temoignages: [
        temoin(
          'Officier prévention',
          'L’évacuation s’est faite en sept minutes. Le point à améliorer est la levée de doute, pas la mise en sécurité du public.',
          'Rapport de visite'
        ),
      ],
      key_figures: {
        nb_sp_engages: 45,
        duree_intervention: '3 h 12',
        nb_vehicules: 14,
        nb_personnes_evacuees: 1400,
        nb_lances: 3,
        sdis_impliques: ['13'],
        bilan_humain: { impliques: 0 },
      },
    }),
  },
  {
    match: /coordination|inter-?sdis|renfort/i,
    label: 'coordination inter-SDIS',
    build: () => ({
      chronologie: [
        ev('09:00', 'alerte', 'Demande de renfort d’un SDIS voisin'),
        ev('10:30', 'arrivee', 'Arrivée de la colonne de renfort au point de transit'),
        ev('11:00', 'action', 'Intégration au dispositif, attribution des secteurs'),
        ev('15:45', 'message_radio', 'Point de situation commun'),
        ev('19:00', 'fin', 'Désengagement progressif de la colonne'),
      ],
      prescriptions: [
        presc(
          'operations',
          'Formaliser une fiche de prise en compte des colonnes de renfort : secteur, canal radio, point de transit.',
          'Bureau opérations',
          '2026-12-15',
          'en_cours'
        ),
        presc(
          'technique',
          'Vérifier l’interopérabilité des canaux radio avec les SDIS limitrophes avant chaque saison.',
          'Groupement transmissions',
          '2027-04-30',
          'a_faire'
        ),
      ],
      temoignages: [
        temoin(
          'Chef de colonne du SDIS renforçant',
          'Le point de transit était clair et l’attribution des secteurs immédiate. C’est ce qui nous a fait gagner une heure.',
          'Retour écrit du SDIS 83'
        ),
      ],
      key_figures: {
        nb_sp_engages: 96,
        duree_intervention: '10 h 00',
        nb_vehicules: 27,
        sdis_impliques: ['06', '83', '13'],
        bilan_humain: { impliques: 0 },
      },
    }),
  },
];

const FALLBACK: Enrichment = {
  chronologie: [
    ev('10:00', 'alerte', 'Réception de l’alerte'),
    ev('10:14', 'arrivee', 'Arrivée du premier engin'),
    ev('10:50', 'action', 'Dispositif établi'),
    ev('13:30', 'fin', 'Fin d’intervention'),
  ],
  prescriptions: [
    presc(
      'operations',
      'Formaliser le point de situation à 30 minutes dans la conduite de l’opération.',
      'Bureau opérations',
      '2027-01-31',
      'a_faire'
    ),
    presc(
      'formation',
      'Intégrer ce retour au prochain cycle de formation de maintien des acquis.',
      'Service formation',
      '2027-03-31',
      'a_faire'
    ),
  ],
  temoignages: [
    temoin(
      'Chef d’agrès',
      'La montée en puissance a été fluide, les difficultés sont venues de l’accès au site.',
      'Débriefing à chaud'
    ),
  ],
  key_figures: {
    nb_sp_engages: 24,
    duree_intervention: '3 h 30',
    nb_vehicules: 8,
    sdis_impliques: ['06'],
    bilan_humain: { impliques: 0 },
  },
};

function enrichmentFor(title: string): { label: string; data: Enrichment } {
  const theme = THEMES.find((t) => t.match.test(title));
  return theme ? { label: theme.label, data: theme.build() } : { label: 'générique', data: FALLBACK };
}

// ---------------------------------------------------------------------------
// 3. Numérotation
// ---------------------------------------------------------------------------
function nextNumero(sdisCode: string, year: number, taken: Set<string>): string {
  const prefix = `RETEX-${sdisCode}-${year}-`;
  let n = 1;
  while (taken.has(prefix + String(n).padStart(3, '0'))) n++;
  const numero = prefix + String(n).padStart(3, '0');
  taken.add(numero);
  return numero;
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(
    APPLY
      ? '⚠  MODE ÉCRITURE — les modifications seront appliquées à la base.\n'
      : 'ℹ  SIMULATION — rien ne sera écrit. Ajoutez --apply pour exécuter.\n'
  );

  const { data: sdisRows, error: sdisError } = await db.from('sdis').select('id, code');
  if (sdisError) throw sdisError;
  const sdisCode = Object.fromEntries((sdisRows ?? []).map((s) => [s.id, s.code]));

  const { data: rexRows, error: rexError } = await db
    .from('rex')
    .select(
      'id, title, status, visibility, type_production, sdis_id, intervention_date, numero_rex, views_count, prescriptions, chronologie, temoignages, key_figures, focus_thematiques, ressources_complementaires'
    )
    .order('created_at');
  if (rexError) throw rexError;

  let rex = (rexRows ?? []) as RexRow[];
  console.log(`${rex.length} REX en base.\n`);

  // ---- 1. Doublons --------------------------------------------------------
  console.log('─── 1. Doublons ───────────────────────────────────────────────');
  const { groups, nearMisses } = groupDuplicates(rex);
  const toDelete: RexRow[] = [];

  if (groups.length === 0) {
    console.log('Aucun doublon détecté.\n');
  } else {
    for (const group of groups) {
      const sorted = [...group].sort(
        (a, b) => richness(b) - richness(a) || (b.views_count ?? 0) - (a.views_count ?? 0)
      );
      const [keep, ...drop] = sorted;
      console.log(`\nMême sinistre, ${group.length} fiches :`);
      console.log(`  GARDÉ     ${keep.id}  ${richness(keep)} bloc(s)  « ${keep.title} »`);
      for (const d of drop) {
        console.log(`  SUPPRIMÉ  ${d.id}  ${richness(d)} bloc(s)  « ${d.title} »`);
        toDelete.push(d);
      }
    }
    console.log('');
  }

  if (nearMisses.length > 0) {
    console.log('À vérifier vous-même — trop proches pour être ignorés, trop loin pour décider :');
    for (const { a, b, score } of nearMisses) {
      console.log(`  ${(score * 100).toFixed(0)} % de mots communs`);
      console.log(`     ${a.id}  ${richness(a)} bloc(s)  « ${a.title} »`);
      console.log(`     ${b.id}  ${richness(b)} bloc(s)  « ${b.title} »`);
    }
    console.log('  → même sinistre ? Supprimez la fiche vide depuis l’interface.\n');
  }

  if (toDelete.length > 0 && !NO_DELETE) {
    if (APPLY) {
      const ids = toDelete.map((r) => r.id);
      const { error } = await db.from('rex').delete().in('id', ids);
      if (error) throw error;
      console.log(`✓ ${ids.length} REX supprimé(s). Commentaires, favoris et pièces jointes suivent en cascade.\n`);
      rex = rex.filter((r) => !ids.includes(r.id));
    } else {
      console.log(`→ ${toDelete.length} REX seraient supprimés.\n`);
      rex = rex.filter((r) => !toDelete.some((d) => d.id === r.id));
    }
  } else if (toDelete.length > 0) {
    console.log('→ --no-delete : aucune suppression, les doublons sont conservés.\n');
  }

  // ---- 2. Enrichissement --------------------------------------------------
  console.log('─── 2. Enrichissement ─────────────────────────────────────────');
  let enriched = 0;

  let skippedSignalements = 0;

  for (const r of rex) {
    // Un signalement est COURT par définition : c'est le premier niveau du
    // modèle Signalement → PEX → RETEX, celui qu'un agent remplit en quelques
    // lignes le soir d'une intervention. Lui greffer une chronologie et des
    // prescriptions en ferait un RETEX déguisé et brouillerait, en pleine
    // démonstration, la distinction que le produit cherche justement à montrer.
    if (r.type_production === 'signalement') {
      skippedSignalements++;
      continue;
    }

    const patch: Record<string, unknown> = {};
    const { label, data } = enrichmentFor(r.title);

    if (len(r.chronologie) === 0) patch.chronologie = data.chronologie;
    if (len(r.prescriptions) === 0) patch.prescriptions = data.prescriptions;
    if (len(r.temoignages) === 0) patch.temoignages = data.temoignages;
    if (!hasKeys(r.key_figures)) patch.key_figures = data.key_figures;

    if (Object.keys(patch).length === 0) continue;

    console.log(
      `  ${Object.keys(patch).join(', ').padEnd(52)} [${label}]  « ${r.title.slice(0, 44)} »`
    );

    if (APPLY) {
      const { error } = await db.from('rex').update(patch).eq('id', r.id);
      if (error) throw error;
    }
    enriched++;
  }

  if (skippedSignalements > 0) {
    console.log(
      `  (${skippedSignalements} signalement(s) laissé(s) tel(s) quel(s) : ils doivent rester courts.)`
    );
  }
  console.log(
    enriched === 0
      ? 'Tous les REX ont déjà du contenu.\n'
      : `${APPLY ? '✓' : '→'} ${enriched} REX ${APPLY ? 'enrichi(s)' : 'seraient enrichis'}.\n`
  );

  // ---- 3. Numérotation ----------------------------------------------------
  console.log('─── 3. Numérotation ───────────────────────────────────────────');
  const taken = new Set(rex.map((r) => r.numero_rex).filter((n): n is string => !!n));
  let numbered = 0;

  for (const r of rex) {
    if (r.numero_rex || r.status !== 'validated') continue;
    const code = sdisCode[r.sdis_id] ?? '00';
    const year = new Date(r.intervention_date ?? Date.now()).getFullYear();
    const numero = nextNumero(code, year, taken);

    console.log(`  ${numero}   « ${r.title.slice(0, 52)} »`);

    if (APPLY) {
      const { error } = await db.from('rex').update({ numero_rex: numero }).eq('id', r.id);
      if (error) throw error;
    }
    numbered++;
  }

  console.log(
    numbered === 0
      ? 'Tous les REX validés portent déjà un numéro.\n'
      : `${APPLY ? '✓' : '→'} ${numbered} numéro(s) ${APPLY ? 'attribué(s)' : 'seraient attribués'}.\n`
  );

  // ---- 4. Promotion du compte de démonstration ----------------------------
  if (PROMOTE) {
    console.log('─── 4. Compte de démonstration ────────────────────────────────');
    if (!PROMOTE_ACK) {
      console.log(
        `✗ Promotion refusée.\n\n` +
          `  Les identifiants de ${DEMO_EMAIL} sont publiés dans le README. En faire un\n` +
          `  super_admin donne des droits sur TOUS les SDIS à un mot de passe public.\n\n` +
          `  Changez d'abord le mot de passe et retirez-le du README, puis relancez avec\n` +
          `  --i-understand-demo-is-public.\n`
      );
    } else {
      console.log(`Passage de ${DEMO_EMAIL} en super_admin.`);
      if (APPLY) {
        const { error } = await db
          .from('profiles')
          .update({ role: 'super_admin' })
          .eq('email', DEMO_EMAIL);
        if (error) throw error;
        console.log('✓ Rôle modifié.');
      }
      console.log(
        '\n  RAPPEL : le rôle ne suffit pas. Les policies RESTRICTIVE de la migration 014\n' +
          '  bloquent la création de REX pour cette adresse, quel que soit son rôle.\n' +
          '  Appliquez la migration 025 pour lever ce verrou.\n'
      );
    }
  }

  console.log('─── Terminé ───────────────────────────────────────────────────');
  if (!APPLY) {
    console.log('Relancez avec --apply pour appliquer ce plan.');
  } else {
    console.log('Pensez à déposer deux ou trois pièces jointes depuis l’interface :');
    console.log('le script n’en crée aucune, et une fiche sans visuel se voit en démonstration.');
  }
}

main().catch((error) => {
  console.error('\n✗ Échec :', error);
  process.exit(1);
});
