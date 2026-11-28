import { rexFormDefaults, type RexFormData } from './rex-form-data';
import { isEmptyHtml } from './rex-detail-sections';

/**
 * Saisie en cours d'un REX, conservée dans le navigateur.
 *
 * Le formulaire n'avait ni sauvegarde automatique ni alerte de sortie : un
 * onglet fermé, une session expirée ou un départ en intervention, et la saisie
 * était perdue. Elle est désormais recopiée dans le stockage local à mesure, et
 * proposée au retour.
 *
 * Pourquoi dans le navigateur et pas sur le serveur : un enregistrement serveur
 * exige un REX valide (titre, date, type, criticité), que la saisie en cours
 * n'a pas forcément ; et il modifierait un REX déjà soumis ou validé à chaque
 * frappe. La copie locale ne dépend ni de l'un ni de l'autre, et tient aussi
 * sans réseau.
 *
 * Ce que cela implique, sur un poste partagé : la saisie reste sur l'appareil.
 * D'où la clé par utilisateur, la durée de vie limitée, et l'effacement à la
 * déconnexion (`clearAllLocalDrafts`).
 */

const PREFIX = 'retex360:rex-draft:';

/** Au-delà, la saisie n'est plus proposée et elle est effacée. */
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export interface LocalDraft {
  savedAt: number;
  data: RexFormData;
}

/** `rexId` nul : un nouveau REX, pas encore enregistré. */
export function draftKey(userId: string, rexId: string | null): string {
  return `${PREFIX}${userId}:${rexId ?? 'nouveau'}`;
}

/** Le stockage du navigateur, ou `null` s'il est indisponible (navigation privée, rendu serveur). */
export function browserDraftStorage(): DraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Enregistre la saisie. Renvoie `false` si le navigateur refuse (quota, stockage coupé). */
export function saveLocalDraft(
  storage: DraftStorage | null,
  key: string,
  data: RexFormData,
  now: number = Date.now()
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify({ v: 1, savedAt: now, data }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Lit le contenu brut d'une saisie conservée. `null` si elle est illisible ou
 * périmée. Sans effet de bord : utilisable pendant un rendu.
 */
export function parseLocalDraft(raw: string | null, now: number = Date.now()): LocalDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; savedAt?: unknown; data?: unknown };
    const valid =
      parsed.v === 1 &&
      typeof parsed.savedAt === 'number' &&
      now - parsed.savedAt <= DRAFT_TTL_MS &&
      typeof parsed.data === 'object' &&
      parsed.data !== null;
    if (!valid) return null;
    // Passage par les valeurs par défaut : un champ ajouté au formulaire depuis
    // l'enregistrement arrive vide, pas `undefined`.
    return {
      savedAt: parsed.savedAt as number,
      data: rexFormDefaults(parsed.data as Partial<RexFormData>),
    };
  } catch {
    return null;
  }
}

/** La saisie conservée, ou `null`. Une saisie périmée ou illisible est effacée au passage. */
export function readLocalDraft(
  storage: DraftStorage | null,
  key: string,
  now: number = Date.now()
): LocalDraft | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  const draft = parseLocalDraft(raw, now);
  if (!draft) clearLocalDraft(storage, key);
  return draft;
}

export function clearLocalDraft(storage: DraftStorage | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Rien à faire : le stockage est indisponible.
  }
}

/** Efface toutes les saisies conservées sur l'appareil. À appeler à la déconnexion. */
export function clearAllLocalDrafts(storage: DraftStorage | null): void {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Idem.
  }
}

/** Forme comparable d'une saisie : clés triées, éditeurs vides ramenés à ''. */
function canonical(data: RexFormData): string {
  const entries = Object.entries(data)
    .map(([key, value]) => [key, typeof value === 'string' && isEmptyHtml(value) ? '' : value])
    .sort(([a], [b]) => String(a).localeCompare(String(b)));
  return JSON.stringify(entries);
}

/**
 * Vrai si `current` diffère de ce qui est enregistré (`saved`).
 *
 * Tiptap écrit « <p></p> » dès qu'on clique dans un éditeur vide : ce n'est pas
 * une modification, et cela ne doit ni déclencher l'alerte de sortie ni créer
 * une saisie à reprendre.
 */
export function hasUnsavedChanges(saved: RexFormData, current: RexFormData): boolean {
  return canonical(saved) !== canonical(current);
}
